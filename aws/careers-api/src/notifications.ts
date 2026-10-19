import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";

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

type Dependencies = {
  db: DynamoDBDocumentClient;
  ses: SESClient;
  sender: string;
  now: () => Date;
};

const productionDependencies: Dependencies = {
  db,
  ses,
  sender,
  now: () => new Date(),
};

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
    await dependencies.ses.send(
      new SendEmailCommand({
        Source: dependencies.sender,
        Destination: { ToAddresses: ["info@vandrotech.com"] },
        Message: {
          Subject: {
            Data: `New Careers application: ${String(application.jobTitle)}`,
            Charset: "UTF-8",
          },
          Body: {
            Text: {
              Data: [
                `Application for: ${String(application.jobTitle)}`,
                `Candidate: ${String(application.name)}`,
                `Email: ${String(application.email)}`,
                `Phone: ${String(application.phone)}`,
                `Application ID: ${applicationId}`,
                "",
                String(
                  application.message || "No additional message provided.",
                ),
                "",
                "Sign in to the Careers admin dashboard to review the application and access the private resume.",
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
