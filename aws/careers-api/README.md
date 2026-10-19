# VANDRO Careers API

This SAM application is an independent, non-production backend for the Careers
portal. The website accesses it from the browser; no AWS SDK or credentials are
bundled into the TanStack/Nitro server output. Do not change the existing
Amplify `main` build configuration as part of this backend deployment.

The repository builds Nitro with the `cloudflare-module` preset and Amplify
publishes `.output`. The current Amplify app is `WEB_COMPUTE`, but its precise
request-to-runtime behavior for this Cloudflare-targeted artifact has not been
verified. Careers therefore calls API Gateway from browser code only; it does
not depend on SSR or server-side AWS calls.

## Implementation checklist

- [x] Separate SAM backend, browser API client, public job/detail/application
      pages, Cognito admin dashboard, resume validation, notification worker, and
      local tests are implemented.
- [x] Production Amplify configuration and AWS resources remain unchanged.
- [ ] Install/verify SAM CLI and validate the template before deployment.
- [ ] Deploy a non-production API stack with the isolated preview origin.
- [ ] Create and MFA-enroll the first admin; verify SES sender and account
      sending status.
- [ ] Configure public `VITE_CAREERS_*` values only on an isolated preview
      build, then test CORS, admin authorization, upload validation, email,
      retention, and rollback.
- [ ] Review cost/credits and privacy/retention obligations before using
      production data or enabling production traffic.

## Architecture

- API Gateway HTTP API with exact-origin CORS and a low default request throttle.
  The isolated deployment allows only `WebOrigin`; `ProductionWebOrigin` is
  optional and should be set to the exact production origin only when
  production traffic is intentionally enabled.
- Node.js 22 Lambda. Public `GET /jobs` and `GET /jobs/{jobId}`; all admin
  routes use a Cognito JWT authorizer and a second Lambda-side
  `CareersAdmins` group check.
- Cognito managed login uses authorization code + PKCE, admin-created accounts,
  short-lived access tokens, and TOTP MFA.
- On-demand DynamoDB tables store postings and applications. Resumes are
  uploaded directly to a private S3 bucket using short-lived, size-limited
  presigned POST policies.
- Application metadata and its resume have six-month retention policies.
  DynamoDB TTL is asynchronous; S3 lifecycle expiration is configured at 185
  days to avoid expiring a file before six calendar months have elapsed. S3
  lifecycle deletion itself can take additional time.
- A durable SQS queue and dead-letter queue deliver SES emails asynchronously.
  The application record and verified resume are persisted before email is
  queued. Admins can requeue notifications. Email delivery is at-least-once:
  the worker records each successful recipient send to minimize duplicates,
  but SES cannot provide an exactly-once guarantee across a network failure.
- Tables and the resume bucket are retained if the stack is deleted. This is
  intentional protection for candidate data and requires an explicit data
  cleanup decision.

## Local checks

Prerequisites: Bun, AWS SAM CLI, AWS CLI, and an AWS profile with permission to
validate/deploy a CloudFormation stack. SAM's local Node.js build path also
requires its supported Node.js/npm tooling; `sam build --use-container` instead
requires a working Docker runtime. This workstation currently has no SAM CLI.
A deployment is **not** part of local validation.

From the repository root:

```powershell
Set-Location .\aws\careers-api
bun install --frozen-lockfile
bun test
sam validate --lint --template-file template.yaml
sam build --template-file template.yaml
```

Root website checks are run from the repository root:

```powershell
bun run test
bun run lint
bun run build
```

## Non-production deployment

Do not deploy this stack with the production site's origin or configure the
production `main` branch to use it during the initial milestone. First identify
an isolated preview origin (or a dedicated staging Amplify app). Confirm in
Amplify that its build variables can be scoped to the preview only; if they
cannot, use a separate staging Amplify app. The website's generated public
values are baked into the preview build.

Before deploying:

1. Select an AWS account/profile and a unique non-production stack name.
2. Verify SES sender identity `info@vandrotech.com` in `ap-south-1`.
3. Confirm SES account sending status. SES sandbox accounts can send only to
   verified recipients, so real candidate confirmations require the account to
   be out of the sandbox. Production access is not requested by this project.
4. Choose an exact origin including scheme and host, without a trailing slash.
   `http://localhost:5173` is accepted for local browser/CORS testing.
5. Select a globally unique Cognito hosted-login domain prefix.

Leave the optional `ProductionWebOrigin` unset for this non-production stack.
If production is approved later, supply its exact HTTPS origin as
`ParameterKey=ProductionWebOrigin,ParameterValue=https://REPLACE-WITH-APPROVED-PRODUCTION-ORIGIN`
when updating the approved production stack; do not add wildcard origins.

Deploy without changing Amplify:

```powershell
Set-Location .\aws\careers-api
sam deploy --guided `
  --template-file template.yaml `
  --stack-name vandro-careers-nonprod `
  --region ap-south-1 `
  --capabilities CAPABILITY_IAM `
  --parameter-overrides `
    ParameterKey=WebOrigin,ParameterValue=https://REPLACE-WITH-ISOLATED-PREVIEW-ORIGIN `
    ParameterKey=CognitoDomainPrefix,ParameterValue=REPLACE-WITH-GLOBALLY-UNIQUE-PREFIX `
    ParameterKey=SesFromAddress,ParameterValue=info@vandrotech.com
```

Accept a deployment only after reviewing the SAM/CloudFormation change set. The
stack creates AWS resources and is not applied as part of this repository task.
After deployment, read stack outputs (do not commit account-specific values):

```powershell
aws cloudformation describe-stacks `
  --stack-name vandro-careers-nonprod `
  --region ap-south-1 `
  --query "Stacks[0].Outputs" `
  --output table
```

Create the initial admin explicitly; public self-registration is disabled:

```powershell
aws cognito-idp admin-create-user `
  --user-pool-id REPLACE-WITH-UserPoolId `
  --username admin@vandrotech.com `
  --user-attributes Name=email,Value=admin@vandrotech.com Name=email_verified,Value=true `
  --desired-delivery-mediums EMAIL `
  --region ap-south-1

aws cognito-idp admin-add-user-to-group `
  --user-pool-id REPLACE-WITH-UserPoolId `
  --username admin@vandrotech.com `
  --group-name CareersAdmins `
  --region ap-south-1
```

The admin must finish the Cognito invitation/password setup and enroll TOTP MFA.
Never put AWS credentials in website environment variables.

Set only these **public** Vite variables on the isolated preview build, using
the API URL, hosted UI domain, and app client ID from stack outputs:

```text
VITE_CAREERS_API_URL=https://REPLACE.execute-api.ap-south-1.amazonaws.com
VITE_CAREERS_COGNITO_DOMAIN=https://REPLACE.auth.ap-south-1.amazoncognito.com
VITE_CAREERS_COGNITO_CLIENT_ID=REPLACE
```

For local UI checks, copy `.env.careers.example` to `.env.local`, populate the
same public values, and deploy/configure the stack with `WebOrigin` set to
`http://localhost:5173`. Do not commit `.env.local`. The Cognito callback and
logout URLs are generated from `WebOrigin` and, when explicitly configured,
`ProductionWebOrigin`.

## Connectivity and behavior verification

With a preview origin and deployed non-production API, test browser preflight
and public access from PowerShell:

```powershell
$api = "https://REPLACE.execute-api.ap-south-1.amazonaws.com"
$origin = "https://REPLACE-WITH-ISOLATED-PREVIEW-ORIGIN"
Invoke-WebRequest -Method Options -Uri "$api/jobs" -Headers @{
  Origin = $origin
  "Access-Control-Request-Method" = "GET"
  "Access-Control-Request-Headers" = "content-type"
}
Invoke-RestMethod -Uri "$api/jobs"
```

The preflight response must include the exact preview origin and GET method.
An unauthenticated `GET /admin/ping` must return `401`; a signed-in, grouped
admin must receive `200`. Verify a draft is not public, a published role is
public, and close/archive remove it. Submit a valid PDF and DOCX plus renamed
text/oversized files; only real accepted files should complete. Confirm private
resume access works only from the signed-in admin detail view, status updates
persist, and both notification destinations work after SES prerequisites are
met. Check CloudWatch, the SQS dead-letter queue, and the retention policies.

## Rollback

The initial integration should be rolled back on the isolated preview only:

1. Remove the three `VITE_CAREERS_*` values from that preview's build
   environment and rebuild the previous preview commit (or revert the Careers
   UI commit on that preview branch).
2. Confirm the existing production `main` branch and its environment were not
   changed. The production Amplify build configuration is not modified by this
   work.
3. To roll back a deployed non-production API code/template update, revert the
   API commit on the isolated deployment branch, then rebuild and redeploy the
   same named stack with the same preview parameters:

```powershell
git switch REPLACE-WITH-ISOLATED-DEPLOYMENT-BRANCH
git revert REPLACE-WITH-CAREERS-RELEASE-COMMIT
git push origin REPLACE-WITH-ISOLATED-DEPLOYMENT-BRANCH
Set-Location .\aws\careers-api
sam build --template-file template.yaml
sam deploy `
  --template-file .aws-sam\build\template.yaml `
  --stack-name vandro-careers-nonprod `
  --region ap-south-1 `
  --capabilities CAPABILITY_IAM `
  --parameter-overrides `
    ParameterKey=WebOrigin,ParameterValue=https://REPLACE-WITH-ISOLATED-PREVIEW-ORIGIN `
    ParameterKey=CognitoDomainPrefix,ParameterValue=REPLACE-WITH-GLOBALLY-UNIQUE-PREFIX `
    ParameterKey=SesFromAddress,ParameterValue=info@vandrotech.com
```

Review the resulting CloudFormation change set before execution. Failed
CloudFormation updates roll back automatically. 4. Keep the non-production API stack while investigating. If the stack must be
removed, first decide how to handle candidate data: `sam delete
--stack-name vandro-careers-nonprod --region ap-south-1` retains the
DynamoDB tables and S3 bucket by design. Do not empty/delete retained data
without an explicit records-retention decision.

Avoid manually deleting resources to recover a failed stack.

## Cost and outstanding AWS prerequisites

The template avoids RDS, always-on compute, NAT Gateway, and a custom
application server. Recurring charges depend on region, request volume, file
storage, retention, and current account pricing/credits. Main cost drivers:

- API Gateway HTTP API requests and Lambda request/duration/log volume.
- DynamoDB on-demand reads/writes and the two small job indexes plus
  application review index; no point-in-time recovery is enabled.
- S3 resume storage, requests, and lifecycle-managed retained data.
- Cognito active users and managed-login plan/pricing; TOTP avoids SMS charges.
- SES outbound messages, SQS/DLQ, and CloudWatch Logs.

At low usage the design is serverless and usage-based, but this is not a price
quote and credits may not apply to every charge. Check the AWS Pricing
Calculator and Billing/Credits pages before deployment. SES identity
verification/sandbox status, account quota, Amplify preview origin, Cognito
domain availability, and credit eligibility require AWS Console/CLI
confirmation.
