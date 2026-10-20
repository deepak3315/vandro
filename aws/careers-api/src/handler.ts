import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
  type HeadObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

import {
  addSixMonths,
  ALLOWED_RESUME_TYPES,
  MAX_RESUME_BYTES,
  safePublicJob,
  validateApplication,
  validateJob,
  validateResumeBytes,
  type JobStatus,
} from "./domain.js";

type ApiEvent = {
  routeKey?: string;
  body?: string | null;
  isBase64Encoded?: boolean;
  headers?: Record<string, string | undefined>;
  pathParameters?: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined> | null;
  requestContext?: {
    authorizer?: { jwt?: { claims?: Record<string, unknown> } };
  };
};

type Dependencies = {
  db: DynamoDBDocumentClient;
  s3: S3Client;
  sqs: SQSClient;
  presignPost: typeof createPresignedPost;
  signedUrl: typeof getSignedUrl;
  now: () => Date;
};

class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

const config = {
  jobsTable: process.env.JOBS_TABLE ?? "",
  applicationsTable: process.env.APPLICATIONS_TABLE ?? "",
  bucket: process.env.RESUME_BUCKET ?? "",
  queueUrl: process.env.NOTIFICATION_QUEUE_URL ?? "",
  adminGroup: process.env.ADMIN_GROUP ?? "CareersAdmins",
};

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
const s3 = new S3Client({});
const sqs = new SQSClient({});
const ses = new SESClient({});

const productionDependencies: Dependencies = {
  db: dynamo,
  s3,
  sqs,
  presignPost: createPresignedPost,
  signedUrl: getSignedUrl,
  now: () => new Date(),
};

const APPLICATION_STATUSES = new Set([
  "NEW",
  "REVIEWING",
  "INTERVIEW",
  "REJECTED",
  "HIRED",
  "WITHDRAWN",
]);

function json(statusCode: number, value: unknown, cache = "no-store") {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cache,
      "x-content-type-options": "nosniff",
    },
    body: JSON.stringify(value),
  };
}

function bodyObject(event: ApiEvent): Record<string, unknown> {
  if (!event.body || event.body.length > 64 * 1024) {
    throw new HttpError(400, "Request body is empty or too large.");
  }
  let source = event.body;
  if (event.isBase64Encoded)
    source = Buffer.from(source, "base64").toString("utf8");
  try {
    const parsed: unknown = JSON.parse(source);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Expected an object.");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

function header(event: ApiEvent, name: string): string | undefined {
  const key = Object.keys(event.headers ?? {}).find(
    (candidate) => candidate.toLowerCase() === name,
  );
  return key ? event.headers?.[key] : undefined;
}

function parseGroups(claim: unknown): string[] {
  if (Array.isArray(claim)) {
    return claim.filter((g): g is string => typeof g === "string");
  }
  if (typeof claim !== "string") return [];
  const value = claim.trim();
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((g): g is string => typeof g === "string");
    }
  } catch {
    // API Gateway sends "[A B]" (unquoted), which is not valid JSON
  }
  return value
    .replace(/^\[|\]$/g, "")
    .split(/[,\s]+/)
    .map((g) => g.replace(/^["']|["']$/g, "").trim())
    .filter(Boolean);
}

function requireAdmin(event: ApiEvent): Record<string, unknown> {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  const groupClaim = claims?.["cognito:groups"];
  const groups = parseGroups(groupClaim);
  const adminGroup = process.env.ADMIN_GROUP ?? config.adminGroup;
  if (!claims || !groups.includes(adminGroup)) {
    throw new HttpError(403, "Administrator access is required.");
  }
  return claims;
}
function validated<T>(parse: () => T): T {
  try {
    return parse();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, (error as Error).message);
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sameHash(a: string, b: string): boolean {
  const first = Buffer.from(a, "hex");
  const second = Buffer.from(b, "hex");
  return first.length === second.length && timingSafeEqual(first, second);
}

function encodeCursor(
  key: Record<string, unknown> | undefined,
): string | undefined {
  return key
    ? Buffer.from(JSON.stringify(key)).toString("base64url")
    : undefined;
}

function decodeCursor(
  value: string | undefined,
): Record<string, unknown> | undefined {
  if (!value) return undefined;
  if (value.length > 2048)
    throw new HttpError(400, "Pagination cursor is invalid.");
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    );
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error();
    return parsed as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "Pagination cursor is invalid.");
  }
}

function publicJob(job: Record<string, unknown>) {
  return safePublicJob(job);
}

async function uploadPolicy(
  deps: Dependencies,
  key: string,
  contentType: string,
): Promise<{ url: string; fields: Record<string, string> }> {
  return deps.presignPost(deps.s3, {
    Bucket: config.bucket,
    Key: key,
    Expires: 300,
    Fields: { "Content-Type": contentType },
    Conditions: [
      ["content-length-range", 1, MAX_RESUME_BYTES],
      ["eq", "$Content-Type", contentType],
    ],
  });
}

async function getJob(deps: Dependencies, jobId: string, admin = false) {
  const result = await deps.db.send(
    new GetCommand({
      TableName: config.jobsTable,
      Key: { jobId },
      ConsistentRead: true,
    }),
  );
  const job = result.Item as Record<string, unknown> | undefined;
  if (!job || (!admin && job.publishStatus !== "PUBLISHED")) {
    throw new HttpError(404, "Job not found.");
  }
  return job;
}

async function publicJobs(event: ApiEvent, deps: Dependencies) {
  const cursor = decodeCursor(event.queryStringParameters?.cursor);
  const result = await deps.db.send(
    new QueryCommand({
      TableName: config.jobsTable,
      IndexName: "published-jobs",
      KeyConditionExpression: "publishStatus = :published",
      ExpressionAttributeValues: { ":published": "PUBLISHED" },
      ScanIndexForward: false,
      Limit: 50,
      ExclusiveStartKey: cursor,
    }),
  );
  return {
    jobs: (result.Items ?? []).map((job: Record<string, unknown>) =>
      publicJob(job),
    ),
    nextCursor: encodeCursor(result.LastEvaluatedKey),
  };
}

async function adminJobs(deps: Dependencies) {
  const statuses: JobStatus[] = ["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"];
  const results = await Promise.all(
    statuses.map((status) =>
      deps.db.send(
        new QueryCommand({
          TableName: config.jobsTable,
          IndexName: "admin-jobs",
          KeyConditionExpression: "publishStatus = :status",
          ExpressionAttributeValues: { ":status": status },
          ScanIndexForward: false,
          Limit: 100,
        }),
      ),
    ),
  );
  return results.flatMap((result) => result.Items ?? []);
}

async function createOrResumeApplication(event: ApiEvent, deps: Dependencies) {
  const input = validated(() => validateApplication(bodyObject(event)));
  const job = await getJob(deps, input.jobId);
  const applicationId = input.idempotencyKey;
  const tokenHash = hashToken(input.uploadToken);
  const pendingKey = `pending/${applicationId}/${randomUUID()}${
    input.fileName.toLowerCase().endsWith(".pdf") ? ".pdf" : ".docx"
  }`;
  const existing = await deps.db.send(
    new GetCommand({
      TableName: config.applicationsTable,
      Key: { applicationId },
      ConsistentRead: true,
    }),
  );

  if (existing.Item) {
    const item = existing.Item as Record<string, unknown>;
    if (
      item.uploadTokenHash !== tokenHash ||
      item.email !== input.email ||
      item.jobId !== input.jobId ||
      item.fileName !== input.fileName ||
      item.fileSize !== input.fileSize ||
      item.contentType !== input.contentType ||
      item.name !== input.name ||
      item.phone !== input.phone
    ) {
      if (item.uploadTokenHash !== tokenHash)
        throw new HttpError(404, "Application not found.");
      throw new HttpError(
        409,
        "Application data does not match the previous submission.",
      );
    }
    if (item.status === "NEW") {
      return json(200, {
        applicationId,
        status: "NEW",
        alreadySubmitted: true,
      });
    }
    if (item.status !== "PENDING_UPLOAD") {
      throw new HttpError(409, "This application cannot be resumed.");
    }
    const policy = await uploadPolicy(
      deps,
      String(item.pendingResumeKey),
      input.contentType,
    );
    return json(200, {
      applicationId,
      upload: policy,
      completeUrl: `/applications/${applicationId}/complete`,
    });
  }

  const now = deps.now();
  const item = {
    applicationId,
    idempotencyKey: applicationId,
    uploadTokenHash: tokenHash,
    jobId: input.jobId,
    jobTitle: String(job.title),
    name: input.name,
    email: input.email,
    phone: input.phone,
    message: input.message,
    fileName: input.fileName,
    fileSize: input.fileSize,
    contentType: input.contentType,
    pendingResumeKey: pendingKey,
    reviewPartition: "ALL",
    status: "PENDING_UPLOAD",
    notificationStatus: "NOT_QUEUED",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: Math.floor((now.getTime() + 2 * 24 * 60 * 60 * 1000) / 1000),
  };

  try {
    await deps.db.send(
      new PutCommand({
        TableName: config.applicationsTable,
        Item: item,
        ConditionExpression: "attribute_not_exists(applicationId)",
      }),
    );
  } catch (error) {
    if ((error as { name?: string }).name !== "ConditionalCheckFailedException")
      throw error;
    const duplicate = await deps.db.send(
      new GetCommand({
        TableName: config.applicationsTable,
        Key: { applicationId },
        ConsistentRead: true,
      }),
    );
    const stored = duplicate.Item as Record<string, unknown> | undefined;
    if (!stored || stored.uploadTokenHash !== tokenHash) {
      throw new HttpError(404, "Application not found.");
    }
    if (
      stored.email !== input.email ||
      stored.jobId !== input.jobId ||
      stored.fileName !== input.fileName ||
      stored.fileSize !== input.fileSize ||
      stored.contentType !== input.contentType ||
      stored.name !== input.name ||
      stored.phone !== input.phone
    ) {
      throw new HttpError(
        409,
        "Application data does not match the previous submission.",
      );
    }
    if (stored.status === "NEW") {
      return json(200, {
        applicationId,
        status: "NEW",
        alreadySubmitted: true,
      });
    }
    if (stored.status !== "PENDING_UPLOAD") {
      return json(409, {
        error: "This application has already been submitted.",
      });
    }
    const policy = await uploadPolicy(
      deps,
      String(stored.pendingResumeKey),
      input.contentType,
    );
    return json(200, {
      applicationId,
      upload: policy,
      completeUrl: `/applications/${applicationId}/complete`,
    });
  }

  const policy = await uploadPolicy(deps, pendingKey, input.contentType);
  return json(201, {
    applicationId,
    upload: policy,
    completeUrl: `/applications/${applicationId}/complete`,
  });
}

async function completeApplication(event: ApiEvent, deps: Dependencies) {
  const applicationId = event.pathParameters?.applicationId;
  const token = header(event, "x-upload-token");
  if (!applicationId || !token)
    throw new HttpError(404, "Application not found.");
  const result = await deps.db.send(
    new GetCommand({
      TableName: config.applicationsTable,
      Key: { applicationId },
      ConsistentRead: true,
    }),
  );
  const item = result.Item as Record<string, unknown> | undefined;
  if (
    !item ||
    !sameHash(String(item.uploadTokenHash ?? ""), hashToken(token))
  ) {
    throw new HttpError(404, "Application not found.");
  }
  if (item.status === "NEW") return json(200, { applicationId, status: "NEW" });
  if (item.status !== "PENDING_UPLOAD") {
    throw new HttpError(
      409,
      "Application cannot be completed in its current state.",
    );
  }

  const pendingKey = String(item.pendingResumeKey);
  const pendingObjects = await deps.s3.send(
    new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: pendingKey,
      MaxKeys: 1,
    }),
  );
  if (!pendingObjects.Contents?.some((object) => object.Key === pendingKey)) {
    throw new HttpError(
      400,
      "Upload your resume before submitting the application.",
    );
  }
  let head: HeadObjectCommandOutput;
  try {
    head = await deps.s3.send(
      new HeadObjectCommand({ Bucket: config.bucket, Key: pendingKey }),
    );
  } catch (error) {
    if (
      ["NotFound", "NoSuchKey"].includes(
        (error as { name?: string }).name ?? "",
      )
    ) {
      throw new HttpError(
        400,
        "Upload your resume before submitting the application.",
      );
    }
    throw error;
  }
  if (
    !head.ContentLength ||
    head.ContentLength > MAX_RESUME_BYTES ||
    head.ContentLength !== item.fileSize ||
    head.ContentType !== item.contentType
  ) {
    await deps.s3.send(
      new DeleteObjectCommand({ Bucket: config.bucket, Key: pendingKey }),
    );
    throw new HttpError(400, "Resume upload does not match the accepted file.");
  }
  const object = await deps.s3.send(
    new GetObjectCommand({ Bucket: config.bucket, Key: pendingKey }),
  );
  if (!object.Body)
    throw new HttpError(400, "Resume upload could not be read.");
  const bytes = Buffer.from(await object.Body.transformToByteArray());
  try {
    validateResumeBytes(bytes, String(item.contentType));
  } catch (error) {
    await deps.s3.send(
      new DeleteObjectCommand({ Bucket: config.bucket, Key: pendingKey }),
    );
    throw new HttpError(400, (error as Error).message);
  }

  const finalKey = `resumes/${applicationId}/${randomUUID()}${
    String(item.fileName).toLowerCase().endsWith(".pdf") ? ".pdf" : ".docx"
  }`;
  await deps.s3.send(
    new CopyObjectCommand({
      Bucket: config.bucket,
      Key: finalKey,
      CopySource: `${config.bucket}/${pendingKey.split("/").map(encodeURIComponent).join("/")}`,
      ContentType: String(item.contentType),
      MetadataDirective: "REPLACE",
      Metadata: { applicationid: applicationId },
    }),
  );
  await deps.s3.send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: pendingKey }),
  );

  const submittedAt = deps.now();
  await deps.db.send(
    new UpdateCommand({
      TableName: config.applicationsTable,
      Key: { applicationId },
      UpdateExpression:
        "SET #status = :new, resumeKey = :resumeKey, submittedAt = :submittedAt, updatedAt = :submittedAt, expiresAt = :expiresAt, notificationStatus = :queued REMOVE pendingResumeKey",
      ConditionExpression: "#status = :pending",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":new": "NEW",
        ":pending": "PENDING_UPLOAD",
        ":resumeKey": finalKey,
        ":submittedAt": submittedAt.toISOString(),
        ":expiresAt": addSixMonths(submittedAt),
        ":queued": "QUEUED",
      },
    }),
  );

  let notificationStatus = "QUEUED";
  try {
    await deps.sqs.send(
      new SendMessageCommand({
        QueueUrl: config.queueUrl,
        MessageBody: JSON.stringify({ applicationId }),
      }),
    );
  } catch (error) {
    notificationStatus = "PENDING";
    console.error("Application notification enqueue failed.", error);
    await deps.db.send(
      new UpdateCommand({
        TableName: config.applicationsTable,
        Key: { applicationId },
        UpdateExpression: "SET notificationStatus = :pending",
        ExpressionAttributeValues: { ":pending": "PENDING" },
      }),
    );
  }
  return json(202, { applicationId, status: "NEW", notificationStatus });
}

async function createJob(event: ApiEvent, deps: Dependencies) {
  requireAdmin(event);
  const input = validated(() => validateJob(bodyObject(event)));
  const now = deps.now().toISOString();
  const jobId = randomUUID();
  const item = {
    ...input,
    jobId,
    status: "DRAFT" as JobStatus,
    publishStatus: "DRAFT",
    createdAt: now,
    updatedAt: now,
  };
  await deps.db.send(
    new PutCommand({ TableName: config.jobsTable, Item: item }),
  );
  return json(201, { job: item });
}

async function updateJob(event: ApiEvent, deps: Dependencies) {
  requireAdmin(event);
  const jobId = event.pathParameters?.jobId;
  if (!jobId) throw new HttpError(400, "Job identifier is required.");
  const current = await getJob(deps, jobId, true);
  if (current.status === "ARCHIVED")
    throw new HttpError(409, "Archived jobs cannot be edited.");
  const input = validated(() => validateJob(bodyObject(event)));
  const updated = { ...current, ...input, updatedAt: deps.now().toISOString() };
  await deps.db.send(
    new PutCommand({ TableName: config.jobsTable, Item: updated }),
  );
  return json(200, { job: updated });
}

async function changeJobStatus(
  event: ApiEvent,
  deps: Dependencies,
  status: JobStatus,
) {
  requireAdmin(event);
  const jobId = event.pathParameters?.jobId;
  if (!jobId) throw new HttpError(400, "Job identifier is required.");
  const current = await getJob(deps, jobId, true);
  if (current.status === "ARCHIVED" && status !== "ARCHIVED") {
    throw new HttpError(409, "Archived jobs cannot be reopened.");
  }
  if (status === "PUBLISHED" && current.status === "DRAFT") {
    current.publishedAt = deps.now().toISOString();
  }
  current.status = status;
  current.publishStatus = status;
  current.updatedAt = deps.now().toISOString();
  await deps.db.send(
    new PutCommand({ TableName: config.jobsTable, Item: current }),
  );
  return json(200, { job: current });
}

async function listApplications(event: ApiEvent, deps: Dependencies) {
  requireAdmin(event);
  let cursor = decodeCursor(event.queryStringParameters?.cursor);
  let nextKey: Record<string, unknown> | undefined;
  const items: Record<string, unknown>[] = [];
  for (let page = 0; page < 5 && items.length < 50; page += 1) {
    const result = await deps.db.send(
      new QueryCommand({
        TableName: config.applicationsTable,
        IndexName: "review-queue",
        KeyConditionExpression: "reviewPartition = :all",
        ExpressionAttributeValues: { ":all": "ALL" },
        ScanIndexForward: false,
        Limit: 50 - items.length,
        ExclusiveStartKey: cursor,
      }),
    );
    items.push(
      ...(result.Items ?? []).filter(
        (item: Record<string, unknown>) => item.status !== "PENDING_UPLOAD",
      ),
    );
    nextKey = result.LastEvaluatedKey;
    cursor = nextKey;
    if (!cursor) break;
  }
  const visibleItems = items
    .slice(0, 50)
    .map((item: Record<string, unknown>) => {
      const {
        resumeKey: _resumeKey,
        uploadTokenHash: _uploadTokenHash,
        pendingResumeKey: _pendingResumeKey,
        ...visible
      } = item;
      return visible;
    });
  return json(200, {
    applications: visibleItems,
    nextCursor: encodeCursor(nextKey),
  });
}

async function applicationDetail(event: ApiEvent, deps: Dependencies) {
  requireAdmin(event);
  const applicationId = event.pathParameters?.applicationId;
  if (!applicationId)
    throw new HttpError(400, "Application identifier is required.");
  const result = await deps.db.send(
    new GetCommand({
      TableName: config.applicationsTable,
      Key: { applicationId },
      ConsistentRead: true,
    }),
  );
  const item = result.Item as Record<string, unknown> | undefined;
  if (!item || item.status === "PENDING_UPLOAD")
    throw new HttpError(404, "Application not found.");
  const resumeUrl = item.resumeKey
    ? await deps.signedUrl(
        deps.s3,
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: String(item.resumeKey),
          ResponseContentDisposition:
            item.contentType === ALLOWED_RESUME_TYPES[".pdf"]
              ? 'attachment; filename="resume.pdf"'
              : 'attachment; filename="resume.docx"',
        }),
        { expiresIn: 300 },
      )
    : undefined;
  const {
    uploadTokenHash: _uploadTokenHash,
    pendingResumeKey: _pendingResumeKey,
    resumeKey: _resumeKey,
    ...application
  } = item;
  return json(200, { application, resumeUrl });
}

async function updateApplication(event: ApiEvent, deps: Dependencies) {
  requireAdmin(event);
  const applicationId = event.pathParameters?.applicationId;
  if (!applicationId)
    throw new HttpError(400, "Application identifier is required.");
  const input = bodyObject(event);
  if (
    typeof input.status !== "string" ||
    !APPLICATION_STATUSES.has(input.status)
  ) {
    throw new HttpError(400, "Application status is invalid.");
  }
  const result = await deps.db.send(
    new UpdateCommand({
      TableName: config.applicationsTable,
      Key: { applicationId },
      UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
      ConditionExpression:
        "attribute_exists(applicationId) AND #status <> :pendingUpload",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":status": input.status,
        ":updatedAt": deps.now().toISOString(),
        ":pendingUpload": "PENDING_UPLOAD",
      },
      ReturnValues: "ALL_NEW",
    }),
  );
  return json(200, {
    application: {
      applicationId,
      status: result.Attributes?.status,
      updatedAt: result.Attributes?.updatedAt,
    },
  });
}

async function retryNotification(event: ApiEvent, deps: Dependencies) {
  requireAdmin(event);
  const applicationId = event.pathParameters?.applicationId;
  if (!applicationId)
    throw new HttpError(400, "Application identifier is required.");
  const result = await deps.db.send(
    new GetCommand({
      TableName: config.applicationsTable,
      Key: { applicationId },
      ConsistentRead: true,
    }),
  );
  const item = result.Item as Record<string, unknown> | undefined;
  if (!item || item.status === "PENDING_UPLOAD")
    throw new HttpError(404, "Application not found.");
  if (item.notificationStatus === "SENT") {
    return json(200, { notificationStatus: "SENT" });
  }
  await deps.db.send(
    new UpdateCommand({
      TableName: config.applicationsTable,
      Key: { applicationId },
      UpdateExpression: "SET notificationStatus = :queued",
      ExpressionAttributeValues: { ":queued": "QUEUED" },
    }),
  );
  try {
    await deps.sqs.send(
      new SendMessageCommand({
        QueueUrl: config.queueUrl,
        MessageBody: JSON.stringify({ applicationId }),
      }),
    );
  } catch (error) {
    await deps.db.send(
      new UpdateCommand({
        TableName: config.applicationsTable,
        Key: { applicationId },
        UpdateExpression: "SET notificationStatus = :pending",
        ExpressionAttributeValues: { ":pending": "PENDING" },
      }),
    );
    throw error;
  }
  return json(202, { notificationStatus: "QUEUED" });
}


async function submitContact(event: ApiEvent) {
  const input = bodyObject(event);
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const interest = typeof input.interest === "string" ? input.interest.trim() : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  if (phone && !/^\+?[0-9\s\-()]{7,20}$/.test(phone))
    throw new HttpError(400, "Enter a valid phone number.");

  if (!name || name.length > 120) throw new HttpError(400, "Enter a valid name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    throw new HttpError(400, "Enter a valid email address.");
  if (!["IT Staffing", "Training Programs", "Career Development", "Cloud Solutions", "Other"].includes(interest))
    throw new HttpError(400, "Select a valid service.");
  if (!message || message.length > 5000)
    throw new HttpError(400, "Message is required and must be under 5000 characters.");

  const sender = process.env.SES_FROM_ADDRESS;
  if (!sender) throw new Error("SES sender is not configured.");

  await ses.send(new SendEmailCommand({
    Source: sender,
    Destination: { ToAddresses: ["info@vandrotech.com"] },
    ReplyToAddresses: [email],
    Message: {
      Subject: { Data: `Website enquiry: ${interest}`, Charset: "UTF-8" },
      Body: { Text: { Data: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || "Not provided"}\nInterested in: ${interest}\n\nMessage:\n${message}`, Charset: "UTF-8" } }
    }
  }));
  return json(200, { ok: true, message: "Enquiry submitted successfully." });
}
export function createHandler(deps: Dependencies) {
  return async (event: ApiEvent) => {
    try {
      switch (event.routeKey) {
        case "GET /jobs":
          return json(200, await publicJobs(event, deps), "public, max-age=60");
        case "GET /jobs/{jobId}":
          return json(200, {
            job: publicJob(
              await getJob(deps, String(event.pathParameters?.jobId)),
            ),
          });
        case "POST /contact":
          return await submitContact(event);
        case "POST /applications":
          return await createOrResumeApplication(event, deps);
        case "POST /applications/{applicationId}/complete":
          return await completeApplication(event, deps);
        case "GET /admin/ping":
          requireAdmin(event);
          return json(200, { ok: true });
        case "GET /admin/jobs":
          requireAdmin(event);
          return json(200, { jobs: await adminJobs(deps) });
        case "POST /admin/jobs":
          return await createJob(event, deps);
        case "PUT /admin/jobs/{jobId}":
          return await updateJob(event, deps);
        case "POST /admin/jobs/{jobId}/publish":
          return await changeJobStatus(event, deps, "PUBLISHED");
        case "POST /admin/jobs/{jobId}/close":
          return await changeJobStatus(event, deps, "CLOSED");
        case "POST /admin/jobs/{jobId}/archive":
          return await changeJobStatus(event, deps, "ARCHIVED");
        case "GET /admin/applications":
          return await listApplications(event, deps);
        case "GET /admin/applications/{applicationId}":
          return await applicationDetail(event, deps);
        case "PUT /admin/applications/{applicationId}":
          return await updateApplication(event, deps);
        case "POST /admin/applications/{applicationId}/notify":
          return await retryNotification(event, deps);
        default:
          return json(404, { error: "Not found." });
      }
    } catch (error) {
      if (error instanceof HttpError)
        return json(error.statusCode, { error: error.message });
      if (
        (error as { name?: string }).name === "ConditionalCheckFailedException"
      ) {
        return json(409, {
          error: "The record changed. Refresh and try again.",
        });
      }
      console.error("Careers API operation failed.", error);
      return json(500, { error: "The request could not be completed." });
    }
  };
}

export const handler = createHandler(productionDependencies);

