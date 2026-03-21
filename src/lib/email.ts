import { getMailConfig } from "@/lib/env";

type AppEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

export async function sendAppEmail({ to, subject, html, text }: AppEmailInput) {
  const config = getMailConfig();
  if (!config.configured) {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.fromEmail,
        to: [to],
        subject,
        html,
        text: text || htmlToText(html),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json().catch(() => null)) as { id?: string } | null;
    return Boolean(payload?.id);
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendReminderEmail(input: AppEmailInput) {
  return sendAppEmail(input);
}
