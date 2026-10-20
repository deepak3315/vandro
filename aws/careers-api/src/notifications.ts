import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { randomUUID } from "node:crypto";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  SendEmailCommand,
  SendRawEmailCommand,
  SESClient,
} from "@aws-sdk/client-ses";

type NotificationRecord = {
  messageId: string;
  body: string;
};

type QueueEvent = { Records: NotificationRecord[] };

const tableName = process.env.APPLICATIONS_TABLE ?? "";
const sender = process.env.SES_FROM_ADDRESS ?? "";
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
const ses = new SESClient({});
const s3 = new S3Client({});

type Dependencies = {
  db: DynamoDBDocumentClient;
  ses: SESClient;
  sender: string;
  s3?: S3Client;
  bucket?: string;
  now: () => Date;
};

const productionDependencies: Dependencies = {
  db,
  ses,
  sender,
  s3,
  bucket: process.env.RESUME_BUCKET ?? "",
  now: () => new Date(),
};

const MAX_ATTACHMENT_BYTES = 7 * 1024 * 1024;

function oneLine(value: unknown): string {
  return String(value ?? "").replace(/[\r\n]+/g, " ").trim();
}

function encodeHeader(value: string): string {
  return /^[\x20-\x7e]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function base64Lines(bytes: Buffer): string {
  return (bytes.toString("base64").match(/.{1,76}/g) ?? []).join("\r\n");
}

function detectResumeType(bytes: Buffer): { ext: string; type: string } {
  if (bytes.subarray(0, 4).toString("latin1") === "%PDF") {
    return { ext: "pdf", type: "application/pdf" };
  }
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    return {
      ext: "docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }
  return { ext: "bin", type: "application/octet-stream" };
}

function teamBody(
  application: Record<string, unknown>,
  applicationId: string,
  note: string,
): string {
  return [
    `Application for: ${String(application.jobTitle)}`,
    `Candidate: ${String(application.name)}`,
    `Email: ${String(application.email)}`,
    `Phone: ${String(application.phone)}`,
    `Application ID: ${applicationId}`,
    "",
    String(application.message || "No additional message provided."),
    "",
    note,
    "Sign in to the Careers admin dashboard to review the application and access the private resume.",
  ].join("\n");
}

async function fetchResume(
  application: Record<string, unknown>,
  dependencies: Dependencies,
): Promise<Buffer | undefined> {
  const key = typeof application.resumeKey === "string" ? application.resumeKey : "";
  if (!key || !dependencies.s3 || !dependencies.bucket) return undefined;
  const object = await dependencies.s3.send(
    new GetObjectCommand({ Bucket: dependencies.bucket, Key: key }),
  );
  if (!object.Body) return undefined;
  const bytes = Buffer.from(await object.Body.transformToByteArray());
  return bytes.length > 0 && bytes.length <= MAX_ATTACHMENT_BYTES ? bytes : undefined;
}

async function sendTeamEmail(
  application: Record<string, unknown>,
  applicationId: string,
  dependencies: Dependencies,
): Promise<void> {
  const subject = `New Careers application: ${oneLine(application.jobTitle)}`;
  let resume: Buffer | undefined;
  try {
    resume = await fetchResume(application, dependencies);
  } catch (error) {
    console.error("Resume attachment could not be loaded.", error);
  }

  if (!resume) {
    const expected = Boolean(application.resumeKey) && Boolean(dependencies.s3);
    await dependencies.ses.send(
      new SendEmailCommand({
        Source: dependencies.sender,
        Destination: { ToAddresses: ["info@vandrotech.com"] },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            Text: {
              Data: teamBody(
                application,
                applicationId,
                expected ? "The resume could not be attached to this email." : "",
              ),
              Charset: "UTF-8",
            },
          },
        },
      }),
    );
    return;
  }

  const detected = detectResumeType(resume);
  const safeName = oneLine(application.name).replace(/[^A-Za-z0-9_-]+/g, "_") || "candidate";
  const boundary = `vandro_${randomUUID()}`;
  const raw = [
    `From: ${dependencies.sender}`,
    "To: info@vandrotech.com",
    `Reply-To: ${oneLine(application.email)}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(
      Buffer.from(teamBody(application, applicationId, "The candidate's resume is attached."), "utf8"),
    ),
    `--${boundary}`,
    `Content-Type: ${detected.type}; name="${safeName}-resume.${detected.ext}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${safeName}-resume.${detected.ext}"`,
    "",
    base64Lines(resume),
    `--${boundary}--`,
    "",
  ].join("\r\n");

  await dependencies.ses.send(
    new SendRawEmailCommand({
      Source: dependencies.sender,
      Destinations: ["info@vandrotech.com"],
      RawMessage: { Data: Buffer.from(raw, "utf8") },
    }),
  );
}
async function sendForApplication(
  applicationId: string,
  dependencies: Dependencies,
): Promise<void> {
  const result = await dependencies.db.send(
    new GetCommand({
      TableName: tableName,
      Key: { applicationId },
      ConsistentRead: true,
    }),
  );
  const application = result.Item as Record<string, unknown> | undefined;
  if (!application || application.status === "PENDING_UPLOAD") return;
  if (application.notificationStatus === "SENT") return;

  if (!application.teamEmailSentAt) {
    await sendTeamEmail(application, applicationId, dependencies);
    await dependencies.db.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { applicationId },
        UpdateExpression: "SET teamEmailSentAt = :sentAt",
        ExpressionAttributeValues: {
          ":sentAt": dependencies.now().toISOString(),
        },
      }),
    );
  }

  if (!application.candidateEmailSentAt) {
    await dependencies.ses.send(
      new SendEmailCommand({
        Source: dependencies.sender,
        Destination: { ToAddresses: [String(application.email)] },
        Message: {
          Subject: {
            Data: "We received your VANDRO application",
            Charset: "UTF-8",
          },
          Body: {
            Text: {
              Data: [
                `Hello ${String(application.name)},`,
                "",
                `Thank you for applying for ${String(application.jobTitle)} at VANDRO. We have received your application and our team will review it.`,
                "",
                "Regards,",
                "VANDRO Careers",
              ].join("\n"),
              Charset: "UTF-8",
            },
          },
        },
      }),
    );
    await dependencies.db.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { applicationId },
        UpdateExpression: "SET candidateEmailSentAt = :sentAt",
        ExpressionAttributeValues: {
          ":sentAt": dependencies.now().toISOString(),
        },
      }),
    );
  }

  await dependencies.db.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { applicationId },
      UpdateExpression: "SET notificationStatus = :sent",
      ExpressionAttributeValues: { ":sent": "SENT" },
    }),
  );
}

export function createNotificationHandler(dependencies: Dependencies) {
  return async (event: QueueEvent) => {
    const batchItemFailures: { itemIdentifier: string }[] = [];
    for (const record of event.Records) {
      try {
        const body: unknown = JSON.parse(record.body);
        if (
          !body ||
          typeof body !== "object" ||
          !("applicationId" in body) ||
          typeof body.applicationId !== "string"
        ) {
          throw new Error("Notification message has an invalid shape.");
        }
        await sendForApplication(body.applicationId, dependencies);
      } catch (error) {
        console.error("Careers notification delivery failed.", error);
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }
    return { batchItemFailures };
  };
}

export const handler = createNotificationHandler(productionDependencies);
