import { inflateRawSync } from "node:zlib";

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const ALLOWED_RESUME_TYPES = {
  ".pdf": "application/pdf",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

export type JobStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";

export type JobInput = {
  title: string;
  department: string;
  location: string;
  employmentType: string;
  workMode: string;
  summary: string;
  description: string;
  requirements: string;
};

export type ApplicationInput = {
  jobId: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  idempotencyKey: string;
  uploadToken: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(
  value: unknown,
  field: string,
  maxLength: number,
  minLength = 1,
): string {
  if (typeof value !== "string") throw new Error(`${field} must be text.`);
  const clean = value.trim();
  if (clean.length < minLength || clean.length > maxLength) {
    throw new Error(
      `${field} must be between ${minLength} and ${maxLength} characters.`,
    );
  }
  return clean;
}

export function validateJob(value: unknown): JobInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Job data must be an object.");
  }
  const input = value as Record<string, unknown>;
  return {
    title: text(input.title, "Title", 120),
    department: text(input.department, "Department", 100),
    location: text(input.location, "Location", 120),
    employmentType: text(input.employmentType, "Employment type", 50),
    workMode: text(input.workMode, "Work mode", 50),
    summary: text(input.summary, "Summary", 240),
    description: text(input.description, "Description", 12000),
    requirements: text(input.requirements, "Requirements", 12000),
  };
}

export function validateApplication(value: unknown): ApplicationInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Application data must be an object.");
  }
  const input = value as Record<string, unknown>;
  const email = text(input.email, "Email", 254).toLowerCase();
  if (!EMAIL_PATTERN.test(email))
    throw new Error("Enter a valid email address.");
  const fileName = text(input.fileName, "Resume filename", 180);
  if (/[\\/]/.test(fileName) || fileName === "." || fileName === "..") {
    throw new Error("Resume filename is invalid.");
  }
  const extension = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  const expectedContentType =
    ALLOWED_RESUME_TYPES[extension as keyof typeof ALLOWED_RESUME_TYPES];
  if (!expectedContentType || input.contentType !== expectedContentType) {
    throw new Error("Resume must be a PDF or DOCX file.");
  }
  if (
    typeof input.fileSize !== "number" ||
    !Number.isInteger(input.fileSize) ||
    input.fileSize < 1 ||
    input.fileSize > MAX_RESUME_BYTES
  ) {
    throw new Error("Resume must be no larger than 5 MB.");
  }
  const idempotencyKey = text(input.idempotencyKey, "Idempotency key", 36);
  const uploadToken = text(input.uploadToken, "Upload token", 128);
  if (!UUID_PATTERN.test(idempotencyKey) || !UUID_PATTERN.test(uploadToken)) {
    throw new Error("Application upload identifiers are invalid.");
  }

  return {
    jobId: text(input.jobId, "Job", 64),
    name: text(input.name, "Name", 120),
    email,
    phone: text(input.phone, "Phone", 40),
    message:
      input.message === undefined
        ? ""
        : text(input.message, "Message", 4000, 0),
    fileName,
    fileSize: input.fileSize,
    contentType: expectedContentType,
    idempotencyKey,
    uploadToken,
  };
}

type ZipEntry = {
  name: string;
  flags: number;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
};

function findZipEntries(bytes: Buffer): ZipEntry[] {
  const minOffset = Math.max(0, bytes.length - 22 - 0xffff);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= minOffset; i -= 1) {
    if (bytes.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0 || eocd + 22 > bytes.length)
    throw new Error("DOCX archive is invalid.");

  const count = bytes.readUInt16LE(eocd + 10);
  const directorySize = bytes.readUInt32LE(eocd + 12);
  let offset = bytes.readUInt32LE(eocd + 16);
  if (
    count === 0xffff ||
    directorySize === 0xffffffff ||
    offset === 0xffffffff
  ) {
    throw new Error("DOCX ZIP64 archives are not accepted.");
  }
  if (offset + directorySize > eocd)
    throw new Error("DOCX archive directory is invalid.");

  const entries: ZipEntry[] = [];
  let totalUncompressed = 0;
  for (let i = 0; i < count; i += 1) {
    if (
      offset + 46 > bytes.length ||
      bytes.readUInt32LE(offset) !== 0x02014b50
    ) {
      throw new Error("DOCX archive is invalid.");
    }
    const flags = bytes.readUInt16LE(offset + 8);
    const method = bytes.readUInt16LE(offset + 10);
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const uncompressedSize = bytes.readUInt32LE(offset + 24);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const localOffset = bytes.readUInt32LE(offset + 42);
    const end = offset + 46 + nameLength + extraLength + commentLength;
    if (end > bytes.length) throw new Error("DOCX archive is invalid.");

    const name = bytes.toString("utf8", offset + 46, offset + 46 + nameLength);
    if (
      name.startsWith("/") ||
      name.split("/").includes("..") ||
      (flags & 1) !== 0
    ) {
      throw new Error("DOCX archive contains an unsafe entry.");
    }
    if (method !== 0 && method !== 8)
      throw new Error("DOCX compression method is not supported.");
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > 20 * 1024 * 1024) {
      throw new Error("DOCX expands beyond the accepted size.");
    }
    entries.push({
      name,
      flags,
      method,
      compressedSize,
      uncompressedSize,
      localOffset,
    });
    offset = end;
  }
  if (offset > eocd) throw new Error("DOCX archive directory is invalid.");
  return entries;
}

function readZipEntry(
  bytes: Buffer,
  entry: ZipEntry,
  maxOutput: number,
): Buffer {
  const offset = entry.localOffset;
  if (offset + 30 > bytes.length || bytes.readUInt32LE(offset) !== 0x04034b50) {
    throw new Error("DOCX archive entry is invalid.");
  }
  const nameLength = bytes.readUInt16LE(offset + 26);
  const extraLength = bytes.readUInt16LE(offset + 28);
  const start = offset + 30 + nameLength + extraLength;
  const end = start + entry.compressedSize;
  if (end > bytes.length) throw new Error("DOCX archive entry is invalid.");
  const compressed = bytes.subarray(start, end);
  const result =
    entry.method === 0
      ? compressed
      : inflateRawSync(compressed, { maxOutputLength: maxOutput });
  if (result.length !== entry.uncompressedSize || result.length > maxOutput) {
    throw new Error("DOCX archive entry is invalid.");
  }
  return result;
}

export function validateResumeBytes(bytes: Buffer, contentType: string): void {
  if (bytes.length < 5 || bytes.length > MAX_RESUME_BYTES) {
    throw new Error("Resume file size is invalid.");
  }
  if (contentType === ALLOWED_RESUME_TYPES[".pdf"]) {
    const trailer = bytes
      .subarray(Math.max(0, bytes.length - 1024))
      .toString("latin1");
    if (
      bytes.subarray(0, 5).toString("ascii") !== "%PDF-" ||
      !trailer.includes("%%EOF")
    ) {
      throw new Error("The uploaded file is not a valid PDF.");
    }
    return;
  }
  if (contentType !== ALLOWED_RESUME_TYPES[".docx"]) {
    throw new Error("Resume must be a PDF or DOCX file.");
  }
  if (bytes.readUInt32LE(0) !== 0x04034b50) {
    throw new Error("The uploaded file is not a valid DOCX.");
  }
  const entries = findZipEntries(bytes);
  const contentTypes = entries.find(
    (entry) => entry.name === "[Content_Types].xml",
  );
  const document = entries.find((entry) => entry.name === "word/document.xml");
  if (!contentTypes || !document)
    throw new Error("DOCX document structure is invalid.");
  const xml = readZipEntry(bytes, contentTypes, 64 * 1024).toString("utf8");
  const documentXml = readZipEntry(bytes, document, 10 * 1024 * 1024).toString(
    "utf8",
  );
  if (
    !xml.includes("<Types") ||
    !xml.includes(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
    )
  ) {
    throw new Error("The uploaded file is not a Word document.");
  }
  if (
    !documentXml.includes("<w:document") ||
    !documentXml.includes("</w:document>")
  ) {
    throw new Error("DOCX document content is invalid.");
  }
}

export function addSixMonths(from: Date): number {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth() + 6;
  const expiry = new Date(
    Date.UTC(
      year,
      month,
      1,
      from.getUTCHours(),
      from.getUTCMinutes(),
      from.getUTCSeconds(),
      from.getUTCMilliseconds(),
    ),
  );
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  expiry.setUTCDate(Math.min(from.getUTCDate(), lastDay));
  return Math.floor(expiry.getTime() / 1000);
}

export function safePublicJob<T extends Record<string, unknown>>(
  job: T,
): Omit<T, "publishStatus"> {
  const { publishStatus: _publishStatus, ...publicJob } = job;
  return publicJob;
}
