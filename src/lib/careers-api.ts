export type Job = {
  jobId: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  workMode: string;
  summary: string;
  description: string;
  requirements: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
  publishedAt?: string;
  createdAt: string;
};

export type Application = {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  fileName: string;
  fileSize: number;
  status:
    "NEW" | "REVIEWING" | "INTERVIEW" | "REJECTED" | "HIRED" | "WITHDRAWN";
  notificationStatus: string;
  submittedAt: string;
};

type UploadPolicy = { url: string; fields: Record<string, string> };
export type ApplicationAttempt = {
  idempotencyKey: string;
  uploadToken: string;
};
type PublicEnvironment = {
  VITE_CAREERS_API_URL?: string;
  VITE_CAREERS_COGNITO_DOMAIN?: string;
  VITE_CAREERS_COGNITO_CLIENT_ID?: string;
};

const environment = import.meta.env as PublicEnvironment;
let accessToken: string | undefined;
let tokenExpiresAt = 0;

function required(value: string | undefined, key: string): string {
  if (!value) throw new Error(`Careers is not configured yet (${key}).`);
  return value.replace(/\/+$/, "");
}

const apiUrl = () =>
  required(environment.VITE_CAREERS_API_URL, "VITE_CAREERS_API_URL");
const cognitoDomain = () =>
  required(
    environment.VITE_CAREERS_COGNITO_DOMAIN,
    "VITE_CAREERS_COGNITO_DOMAIN",
  );
const cognitoClientId = () =>
  required(
    environment.VITE_CAREERS_COGNITO_CLIENT_ID,
    "VITE_CAREERS_COGNITO_CLIENT_ID",
  );

async function request<T>(
  path: string,
  init: RequestInit = {},
  authenticated = false,
): Promise<T> {
  if (authenticated && (!accessToken || Date.now() >= tokenExpiresAt)) {
    accessToken = undefined;
    throw new Error("Your admin session has expired. Sign in again.");
  }
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData))
    headers.set("content-type", "application/json");
  if (authenticated && accessToken)
    headers.set("authorization", `Bearer ${accessToken}`);
  const url = `${apiUrl()}${path}`;
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch {
    throw new Error(
      "Could not connect to the Careers service. Please try again.",
    );
  }
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      result &&
      typeof result === "object" &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : `Careers request failed (${response.status}).`;
    throw new Error(message);
  }
  return result as T;
}

function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}

export function listJobs(cursor?: string) {
  return request<{ jobs: Job[]; nextCursor?: string }>(
    `/jobs${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
  );
}

export function getJob(jobId: string) {
  return request<{ job: Job }>(`/jobs/${encodeURIComponent(jobId)}`);
}

export async function submitApplication(
  values: {
    jobId: string;
    name: string;
    email: string;
    phone: string;
    message: string;
  },
  file: File,
  onUpload?: (progress: string) => void,
  attempt: ApplicationAttempt = {
    idempotencyKey: crypto.randomUUID(),
    uploadToken: crypto.randomUUID(),
  },
): Promise<void> {
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  const contentType =
    extension === ".pdf"
      ? "application/pdf"
      : extension === ".docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "";
  if (!contentType) throw new Error("Choose a PDF or DOCX resume.");
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Resume must be no larger than 5 MB.");

  const initiated = await request<{
    applicationId: string;
    upload?: UploadPolicy;
    completeUrl?: string;
    alreadySubmitted?: boolean;
  }>("/applications", {
    method: "POST",
    body: jsonBody({
      ...values,
      fileName: file.name,
      fileSize: file.size,
      contentType,
      idempotencyKey: attempt.idempotencyKey,
      uploadToken: attempt.uploadToken,
    }),
  });
  if (initiated.alreadySubmitted) return;
  if (!initiated.upload || !initiated.completeUrl) {
    throw new Error(
      "The resume upload could not be started. Please try again.",
    );
  }
  const form = new FormData();
  Object.entries(initiated.upload.fields).forEach(([key, value]) =>
    form.append(key, value),
  );
  form.append("file", file);
  onUpload?.("Uploading resume…");
  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(initiated.upload.url, {
      method: "POST",
      body: form,
    });
  } catch {
    throw new Error("Resume upload failed. Please retry your application.");
  }
  if (!uploadResponse.ok)
    throw new Error("Resume upload failed. Please retry your application.");
  onUpload?.("Submitting application…");
  await request(initiated.completeUrl, {
    method: "POST",
    headers: { "x-upload-token": attempt.uploadToken },
  });
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function randomUrlSafe(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return base64Url(bytes);
}

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64Url(new Uint8Array(digest));
}

export async function beginAdminLogin(): Promise<void> {
  const state = randomUrlSafe(32);
  const verifier = randomUrlSafe(48);
  sessionStorage.setItem("careers-auth-state", state);
  sessionStorage.setItem("careers-pkce-verifier", verifier);
  const url = new URL(`${cognitoDomain()}/oauth2/authorize`);
  url.searchParams.set("client_id", cognitoClientId());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email");
  url.searchParams.set("redirect_uri", `${window.location.origin}/admin/jobs`);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", await pkceChallenge(verifier));
  url.searchParams.set("code_challenge_method", "S256");
  window.location.assign(url);
}

export async function finishAdminLogin(search: string): Promise<boolean> {
  const params = new URLSearchParams(search);
  const code = params.get("code");
  const returnedState = params.get("state");
  if (!code && !returnedState) return false;
  const expectedState = sessionStorage.getItem("careers-auth-state");
  const verifier = sessionStorage.getItem("careers-pkce-verifier");
  sessionStorage.removeItem("careers-auth-state");
  sessionStorage.removeItem("careers-pkce-verifier");
  if (
    !code ||
    !returnedState ||
    !expectedState ||
    returnedState !== expectedState ||
    !verifier
  ) {
    throw new Error("Admin sign-in could not be verified. Please try again.");
  }
  const response = await fetch(`${cognitoDomain()}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: cognitoClientId(),
      code,
      redirect_uri: `${window.location.origin}/admin/jobs`,
      code_verifier: verifier,
    }),
  });
  const result: unknown = await response.json().catch(() => null);
  if (
    !response.ok ||
    !result ||
    typeof result !== "object" ||
    !("access_token" in result) ||
    typeof result.access_token !== "string" ||
    !("expires_in" in result) ||
    typeof result.expires_in !== "number"
  ) {
    throw new Error("Admin sign-in failed. Please try again.");
  }
  accessToken = result.access_token;
  tokenExpiresAt = Date.now() + result.expires_in * 1000 - 30_000;
  window.history.replaceState({}, "", "/admin/jobs");
  return true;
}

export function hasAdminSession(): boolean {
  return Boolean(accessToken && Date.now() < tokenExpiresAt);
}

export function endAdminSession(): void {
  accessToken = undefined;
  tokenExpiresAt = 0;
  const logout = new URL(`${cognitoDomain()}/logout`);
  logout.searchParams.set("client_id", cognitoClientId());
  logout.searchParams.set("logout_uri", `${window.location.origin}/admin/jobs`);
  window.location.assign(logout);
}

export function adminApi<T>(path: string, method = "GET", value?: unknown) {
  return request<T>(
    path,
    { method, ...(value === undefined ? {} : { body: jsonBody(value) }) },
    true,
  );
}

export function submitContactEnquiry(input: {
  name: string;
  email: string;
  interest: string;
  message: string;
}) {
  return request<{ ok: boolean; message: string }>("/contact", {
    method: "POST",
    body: jsonBody(input),
  });
}
