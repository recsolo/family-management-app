import nodemailer from "nodemailer";

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

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.smtpUser,
      pass: config.smtpAppPassword,
    },
  });

  const info = await transporter.sendMail({
    from: config.fromEmail,
    to,
    subject,
    html,
    text: text || htmlToText(html),
  });

  return Boolean(info.messageId);
}

export async function sendReminderEmail(input: AppEmailInput) {
  return sendAppEmail(input);
}
