import { describe, expect, test } from "bun:test";

import { createNotificationHandler } from "../src/notifications";

async function withoutConsoleErrors<T>(action: () => Promise<T>): Promise<T> {
  const original = console.error;
  console.error = () => undefined;
  try {
    return await action();
  } finally {
    console.error = original;
  }
}

function makeDependencies(failEmail = false) {
  const application: Record<string, unknown> = {
    applicationId: "application-1",
    status: "NEW",
    notificationStatus: "QUEUED",
    jobTitle: "Cloud Engineer",
    name: "Candidate Example",
    email: "candidate@example.com",
    phone: "+91 90000 00000",
    message: "Please consider my application.",
  };
  const sentDestinations: string[] = [];
  const applicationReadIsConsistent: boolean[] = [];
  const db = {
    async send(command: unknown) {
      const actual = command as {
        constructor: { name: string };
        input: {
          ConsistentRead?: boolean;
          UpdateExpression?: string;
          ExpressionAttributeValues?: Record<string, unknown>;
        };
      };
      if (actual.constructor.name === "GetCommand") {
        applicationReadIsConsistent.push(actual.input.ConsistentRead === true);
        return { Item: { ...application } };
      }
      if (actual.constructor.name === "UpdateCommand") {
        const expression = actual.input.UpdateExpression ?? "";
        const values = actual.input.ExpressionAttributeValues ?? {};
        if (expression.includes("teamEmailSentAt")) {
          application.teamEmailSentAt = values[":sentAt"];
        }
        if (expression.includes("candidateEmailSentAt")) {
          application.candidateEmailSentAt = values[":sentAt"];
        }
        if (expression.includes("notificationStatus")) {
          application.notificationStatus = values[":sent"];
        }
      }
      return {};
    },
  };
  const ses = {
    async send(command: unknown) {
      if (failEmail) throw new Error("SES unavailable");
      const actual = command as {
        input: { Destination?: { ToAddresses?: string[] } };
      };
      sentDestinations.push(...(actual.input.Destination?.ToAddresses ?? []));
      return {};
    },
  };
  return {
    dependencies: {
      db,
      ses,
      sender: "info@vandrotech.com",
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    } as Parameters<typeof createNotificationHandler>[0],
    application,
    sentDestinations,
    applicationReadIsConsistent,
  };
}

describe("Careers notification worker", () => {
  test("sends both emails and safely ignores a duplicate queue delivery", async () => {
    const {
      dependencies,
      application,
      sentDestinations,
      applicationReadIsConsistent,
    } = makeDependencies();
    const handler = createNotificationHandler(dependencies);
    const event = {
      Records: [
        {
          messageId: "message-1",
          body: JSON.stringify({ applicationId: "application-1" }),
        },
        {
          messageId: "message-2",
          body: JSON.stringify({ applicationId: "application-1" }),
        },
      ],
    };

    const response = await handler(event);

    expect(response.batchItemFailures).toEqual([]);
    expect(sentDestinations).toEqual([
      "info@vandrotech.com",
      "candidate@example.com",
    ]);
    expect(applicationReadIsConsistent).toEqual([true, true]);
    expect(application.notificationStatus).toBe("SENT");
  });

  test("returns failed SQS message identifiers so AWS can retry them", async () => {
    const { dependencies } = makeDependencies(true);
    const handler = createNotificationHandler(dependencies);

    const response = await withoutConsoleErrors(() =>
      handler({
        Records: [
          {
            messageId: "message-failed",
            body: JSON.stringify({ applicationId: "application-1" }),
          },
        ],
      }),
    );

    expect(response.batchItemFailures).toEqual([
      { itemIdentifier: "message-failed" },
    ]);
  });

  test("rejects malformed queue payloads for retry and dead-letter handling", async () => {
    const { dependencies } = makeDependencies();
    const response = await withoutConsoleErrors(() =>
      createNotificationHandler(dependencies)({
        Records: [{ messageId: "message-invalid", body: "{}" }],
      }),
    );
    expect(response.batchItemFailures).toEqual([
      { itemIdentifier: "message-invalid" },
    ]);
  });
});


describe("Careers notification attachments", () => {
  test("attaches the resume to the team email", async () => {
    const { dependencies, application } = makeDependencies();
    application.resumeKey = "resumes/application-1.pdf";
    const sent: { name: string; input: any }[] = [];
    const wired = dependencies as any;
    wired.s3 = {
      async send() {
        return {
          Body: {
            async transformToByteArray() {
              return new TextEncoder().encode("%PDF-1.4 test resume");
            },
          },
        };
      },
    };
    wired.bucket = "resume-bucket";
    wired.ses = {
      async send(command: any) {
        sent.push({ name: command.constructor.name, input: command.input });
        return {};
      },
    };
    const response = await createNotificationHandler(dependencies)({
      Records: [
        { messageId: "m1", body: JSON.stringify({ applicationId: "application-1" }) },
      ],
    });
    expect(response.batchItemFailures).toEqual([]);
    expect(sent[0].name).toBe("SendRawEmailCommand");
    const raw = Buffer.from(sent[0].input.RawMessage.Data).toString("utf8");
    expect(raw).toContain("application/pdf");
    expect(raw).toContain("Content-Disposition: attachment");
    expect(sent[1].name).toBe("SendEmailCommand");
  });
});