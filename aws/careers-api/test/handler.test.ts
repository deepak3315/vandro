import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";

import { createHandler } from "../src/handler";

const job = {
  jobId: "role-1",
  title: "Cloud Engineer",
  publishStatus: "PUBLISHED",
  status: "PUBLISHED",
};

function makeDependencies(overrides: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const database = {
    async send(command: unknown) {
      const actual = command as {
        constructor: { name: string };
        input: { Key?: { jobId?: string } };
      };
      calls.push(actual.constructor.name);
      if (actual.constructor.name === "GetCommand") {
        return { Item: actual.input.Key?.jobId === "role-1" ? job : undefined };
      }
      if (actual.constructor.name === "QueryCommand") return { Items: [job] };
      return {};
    },
  };
  const dependencies = {
    db: database,
    s3: {
      async send() {
        return {};
      },
    },
    sqs: {
      async send() {
        return {};
      },
    },
    async presignPost() {
      calls.push("presign");
      return {
        url: "https://upload.example.invalid",
        fields: { key: "pending/test.pdf" },
      };
    },
    async signedUrl() {
      return "https://download.example.invalid";
    },
    now: () => new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
  return {
    dependencies: dependencies as Parameters<typeof createHandler>[0],
    calls,
  };
}

describe("Careers API handler", () => {
  test("serves published jobs without requiring admin claims", async () => {
    const { dependencies } = makeDependencies();
    const response = await createHandler(dependencies)({
      routeKey: "GET /jobs",
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).jobs).toHaveLength(1);
    expect(response.headers["cache-control"]).toContain("public");
  });

  test("blocks admin routes without the Cognito administrator group", async () => {
    const { dependencies } = makeDependencies();
    const response = await createHandler(dependencies)({
      routeKey: "GET /admin/ping",
    });
    expect(response.statusCode).toBe(403);
  });

  test("requires the Cognito administrator group even when JWT claims are present", async () => {
    const { dependencies } = makeDependencies();
    const response = await createHandler(dependencies)({
      routeKey: "GET /admin/ping",
      requestContext: {
        authorizer: { jwt: { claims: { "cognito:groups": "OtherGroup" } } },
      },
    });
    expect(response.statusCode).toBe(403);
  });

  test("accepts the Cognito group claim in its JSON-encoded JWT form", async () => {
    const { dependencies } = makeDependencies();
    const response = await createHandler(dependencies)({
      routeKey: "GET /admin/ping",
      requestContext: {
        authorizer: {
          jwt: { claims: { "cognito:groups": '["CareersAdmins"]' } },
        },
      },
    });
    expect(response.statusCode).toBe(200);
  });

  test("persists a valid application before creating a direct-upload policy", async () => {
    const { dependencies, calls } = makeDependencies();
    const response = await createHandler(dependencies)({
      routeKey: "POST /applications",
      body: JSON.stringify({
        jobId: "role-1",
        name: "Candidate Example",
        email: "candidate@example.com",
        phone: "+91 90000 00000",
        message: "",
        fileName: "resume.pdf",
        fileSize: 1024,
        contentType: "application/pdf",
        idempotencyKey: "7e24ad7a-bc44-4a46-a340-22dcc00f47e7",
        uploadToken: "6ed69012-284d-4b30-a487-fb9834bef1fd",
      }),
    });
    expect(response.statusCode).toBe(201);
    expect(calls.indexOf("PutCommand")).toBeGreaterThan(-1);
    expect(calls.indexOf("PutCommand")).toBeLessThan(calls.indexOf("presign"));
  });

  test("rejects candidate submissions with a false file type before persistence", async () => {
    const { dependencies, calls } = makeDependencies();
    const response = await createHandler(dependencies)({
      routeKey: "POST /applications",
      body: JSON.stringify({
        jobId: "role-1",
        name: "Candidate Example",
        email: "candidate@example.com",
        phone: "+91 90000 00000",
        fileName: "resume.pdf",
        fileSize: 1024,
        contentType: "application/x-msdownload",
        idempotencyKey: "7e24ad7a-bc44-4a46-a340-22dcc00f47e7",
        uploadToken: "6ed69012-284d-4b30-a487-fb9834bef1fd",
      }),
    });
    expect(response.statusCode).toBe(400);
    expect(calls).not.toContain("PutCommand");
  });

  test("rejects completion when no matching pending resume object exists", async () => {
    const uploadToken = "6ed69012-284d-4b30-a487-fb9834bef1fd";
    const uploadTokenHash = createHash("sha256")
      .update(uploadToken)
      .digest("hex");
    const db = {
      async send(command: unknown) {
        const actual = command as { constructor: { name: string } };
        if (actual.constructor.name === "GetCommand") {
          return {
            Item: {
              applicationId: "application-1",
              uploadTokenHash,
              status: "PENDING_UPLOAD",
              pendingResumeKey: "pending/application-1/resume.pdf",
            },
          };
        }
        return {};
      },
    };
    const s3 = {
      async send(command: unknown) {
        const actual = command as { constructor: { name: string } };
        if (actual.constructor.name === "ListObjectsV2Command") {
          return { Contents: [] };
        }
        throw new Error(`Unexpected ${actual.constructor.name} operation.`);
      },
    };
    const { dependencies } = makeDependencies({ db, s3 });
    const response = await createHandler(dependencies)({
      routeKey: "POST /applications/{applicationId}/complete",
      pathParameters: { applicationId: "application-1" },
      headers: { "x-upload-token": uploadToken },
    });

    expect(response.statusCode).toBe(400);
  });

  test("skips unfinished uploads and never exposes private resume keys in admin lists", async () => {
    let queryCount = 0;
    const db = {
      async send(command: unknown) {
        const actual = command as { constructor: { name: string } };
        if (actual.constructor.name !== "QueryCommand") return {};
        queryCount += 1;
        if (queryCount === 1) {
          return {
            Items: [{ applicationId: "pending", status: "PENDING_UPLOAD" }],
            LastEvaluatedKey: { applicationId: "pending" },
          };
        }
        return {
          Items: [
            {
              applicationId: "submitted",
              status: "NEW",
              resumeKey: "resumes/private.pdf",
              uploadTokenHash: "private-hash",
              email: "candidate@example.com",
            },
          ],
        };
      },
    };
    const { dependencies } = makeDependencies({ db });
    const response = await createHandler(dependencies)({
      routeKey: "GET /admin/applications",
      requestContext: {
        authorizer: {
          jwt: { claims: { "cognito:groups": ["CareersAdmins"] } },
        },
      },
    });
    const application = JSON.parse(response.body).applications[0];
    expect(response.statusCode).toBe(200);
    expect(queryCount).toBe(2);
    expect(application.applicationId).toBe("submitted");
    expect(application.resumeKey).toBeUndefined();
    expect(application.uploadTokenHash).toBeUndefined();
  });
});
