import { describe, expect, test } from "bun:test";

import {
  addSixMonths,
  MAX_RESUME_BYTES,
  validateApplication,
  validateJob,
  validateResumeBytes,
} from "../src/domain";

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function storedZip(files: Record<string, string>): Buffer {
  const localFiles: Buffer[] = [];
  const centralFiles: Buffer[] = [];
  let localOffset = 0;

  for (const [fileName, content] of Object.entries(files)) {
    const name = Buffer.from(fileName);
    const data = Buffer.from(content);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    localFiles.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(localOffset, 42);
    centralFiles.push(central, name);
    localOffset += local.length + name.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralFiles);
  const entryCount = Object.keys(files).length;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entryCount, 8);
  end.writeUInt16LE(entryCount, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localFiles, centralDirectory, end]);
}

const goodJob = {
  title: "Cloud Engineer",
  department: "Technology",
  location: "Hyderabad, India",
  employmentType: "Full-time",
  workMode: "Hybrid",
  summary: "Build reliable cloud services.",
  description: "Work with a thoughtful engineering team.",
  requirements: "Experience with cloud platforms.",
};

describe("Careers domain validation", () => {
  test("accepts bounded job content and trims text", () => {
    expect(validateJob({ ...goodJob, title: "  Cloud Engineer  " }).title).toBe(
      "Cloud Engineer",
    );
    expect(() => validateJob({ ...goodJob, title: "" })).toThrow("Title");
    expect(() =>
      validateJob({ ...goodJob, description: "x".repeat(12001) }),
    ).toThrow("Description");
  });

  test("validates candidate data and enforces the five-megabyte resume limit", () => {
    const application = validateApplication({
      jobId: "job-123",
      name: "Candidate Example",
      email: "CANDIDATE@example.com",
      phone: "+91 90000 00000",
      message: "Interested in the role.",
      fileName: "resume.PDF",
      fileSize: MAX_RESUME_BYTES,
      contentType: "application/pdf",
      idempotencyKey: "7e24ad7a-bc44-4a46-a340-22dcc00f47e7",
      uploadToken: "6ed69012-284d-4b30-a487-fb9834bef1fd",
    });
    expect(application.email).toBe("candidate@example.com");
    expect(() =>
      validateApplication({ ...application, fileSize: MAX_RESUME_BYTES + 1 }),
    ).toThrow("5 MB");
    expect(() =>
      validateApplication({
        ...application,
        contentType: "application/pdf.exe",
      }),
    ).toThrow("PDF or DOCX");
    expect(() =>
      validateApplication({ ...application, email: "not-an-email" }),
    ).toThrow("valid email");
    expect(() =>
      validateApplication({ ...application, message: { unexpected: true } }),
    ).toThrow("Message must be text");
  });

  test("checks PDF magic bytes rather than trusting filename or declared MIME type", () => {
    expect(() =>
      validateResumeBytes(
        Buffer.from("%PDF-1.7\nbody\n%%EOF"),
        "application/pdf",
      ),
    ).not.toThrow();
    expect(() =>
      validateResumeBytes(Buffer.from("This is not a PDF"), "application/pdf"),
    ).toThrow("not a valid PDF");
    expect(() =>
      validateResumeBytes(
        Buffer.from("%PDF-1.7 but no trailer"),
        "application/pdf",
      ),
    ).toThrow("not a valid PDF");
    expect(() =>
      validateResumeBytes(Buffer.from("%PDF-1.7"), "application/vnd.invalid"),
    ).toThrow("PDF or DOCX");
  });

  test("accepts DOCX only when its ZIP has Word document parts", () => {
    const validDocx = storedZip({
      "[Content_Types].xml":
        '<Types><Override ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
      "word/document.xml": "<w:document><w:body></w:body></w:document>",
    });
    expect(() =>
      validateResumeBytes(
        validDocx,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).not.toThrow();
    expect(() =>
      validateResumeBytes(
        storedZip({ "readme.txt": "not a Word document" }),
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toThrow("DOCX document structure is invalid");
  });

  test("calculates the application metadata expiry six calendar months from submission", () => {
    expect(addSixMonths(new Date("2026-01-31T12:00:00.000Z"))).toBe(
      Math.floor(new Date("2026-07-31T12:00:00.000Z").getTime() / 1000),
    );
    expect(addSixMonths(new Date("2026-08-31T12:00:00.000Z"))).toBe(
      Math.floor(new Date("2027-02-28T12:00:00.000Z").getTime() / 1000),
    );
  });
});
