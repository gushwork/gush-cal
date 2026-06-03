import { createPrivateKey, type KeyObject } from "node:crypto";
import { google } from "googleapis";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

export type ServiceAccountCredentials = {
  client_email: string;
  private_key: string;
};

function normalizePrivateKey(key: string): string {
  // Env JSON may contain literal \n, real newlines, or a single-line PEM blob.
  let normalized = key.replace(/\\n/g, "\n").trim();

  if (normalized.includes("\n")) {
    return normalized;
  }

  const match = normalized.match(
    /^-----BEGIN ([A-Z ]+)-----(.+)-----END \1-----$/,
  );
  if (match) {
    const label = match[1];
    const body = match[2].replace(/\s+/g, "");
    const lines = body.match(/.{1,64}/g) ?? [];
    return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
  }

  return normalized;
}

export function parsePrivateKeyObject(privateKeyPem: string): KeyObject {
  return createPrivateKey(normalizePrivateKey(privateKeyPem));
}

export function parseServiceAccountJson(): ServiceAccountCredentials {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not set. See docs/adr/001-google-dwd.md",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }

  const credentials = parsed as Partial<ServiceAccountCredentials>;
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON must include client_email and private_key",
    );
  }

  return {
    client_email: credentials.client_email,
    private_key: normalizePrivateKey(credentials.private_key),
  };
}

/** Parsed credentials when env JSON and PEM key are usable; otherwise null. */
export function tryParseServiceAccountJson(): ServiceAccountCredentials | null {
  try {
    const credentials = parseServiceAccountJson();
    parsePrivateKeyObject(credentials.private_key);
    return credentials;
  } catch {
    return null;
  }
}

/** JWT client impersonating a Workspace user via domain-wide delegation. */
export function createImpersonatedClient(subjectEmail: string) {
  const credentials = parseServiceAccountJson();
  parsePrivateKeyObject(credentials.private_key);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [CALENDAR_SCOPE],
    subject: subjectEmail,
  });
  return google.calendar({ version: "v3", auth });
}

export function freeBusySubjectEmail(memberEmails: string[]): string {
  const configured = process.env.GOOGLE_DWD_SUBJECT_EMAIL;
  if (configured) {
    return configured;
  }
  const first = memberEmails[0];
  if (!first) {
    throw new Error("freeBusySubjectEmail requires at least one member email");
  }
  return first;
}
