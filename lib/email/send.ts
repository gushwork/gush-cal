export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
};

export type EmailSendResult = { ok: true } | { ok: false; error: string };

let sendOverride: ((input: SendEmailInput) => Promise<EmailSendResult>) | null =
  null;

/** @internal test seam */
export function setEmailSendForTest(
  fn: ((input: SendEmailInput) => Promise<EmailSendResult>) | null,
) {
  sendOverride = fn;
}

async function sendViaResend(input: SendEmailInput): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend");
  }

  const from = process.env.EMAIL_FROM ?? "noreply@example.com";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.body,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, error: text || response.statusText };
  }

  return { ok: true };
}

async function sendViaSendgrid(input: SendEmailInput): Promise<EmailSendResult> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is required when EMAIL_PROVIDER=sendgrid");
  }

  const from = process.env.EMAIL_FROM ?? "noreply@example.com";
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: input.to }] }],
      from: { email: from },
      subject: input.subject,
      content: [{ type: "text/plain", value: input.body }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, error: text || response.statusText };
  }

  return { ok: true };
}

async function sendViaMock(input: SendEmailInput): Promise<EmailSendResult> {
  void input;
  return { ok: true };
}

export async function sendEmail(input: SendEmailInput): Promise<EmailSendResult> {
  if (sendOverride) {
    return sendOverride(input);
  }

  const provider = process.env.EMAIL_PROVIDER;
  if (!provider) {
    throw new Error("EMAIL_PROVIDER is required to send email");
  }

  switch (provider) {
    case "mock":
      return sendViaMock(input);
    case "resend":
      return sendViaResend(input);
    case "sendgrid":
      return sendViaSendgrid(input);
    default:
      throw new Error(`Unknown EMAIL_PROVIDER: ${provider}`);
  }
}
