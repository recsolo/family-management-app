import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { hash } from "bcryptjs";

import { db } from "@/lib/db";
import { sendAppEmail } from "@/lib/email";
import { getAppUrl, getAuthSecret, getMailConfig } from "@/lib/env";

type AccountActionPurpose = "verify-email" | "reset-password";

type AccountActionPayload = {
  purpose: AccountActionPurpose;
  sub: string;
  email: string;
  exp: number;
  version?: string;
};

type VerificationEmailUser = {
  id: string;
  name: string;
  email: string;
};

type PasswordResetUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
};

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getSigningSecret() {
  const secret = getAuthSecret();
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for account emails.");
  }

  return secret;
}

function signPayload(data: string) {
  return createHmac("sha256", getSigningSecret()).update(data).digest("base64url");
}

function passwordVersion(passwordHash: string) {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}

function createActionToken(payload: AccountActionPayload) {
  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(encoded);
  return `${encoded}.${signature}`;
}

function readActionToken(token: string, purpose: AccountActionPurpose) {
  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) {
    throw new Error("That link is not valid anymore.");
  }

  const expectedSignature = signPayload(encodedPayload);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    throw new Error("That link is not valid anymore.");
  }

  let payload: AccountActionPayload;
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload)) as AccountActionPayload;
  } catch {
    throw new Error("That link is not valid anymore.");
  }

  if (payload.purpose !== purpose || !payload.sub || !payload.email || typeof payload.exp !== "number") {
    throw new Error("That link is not valid anymore.");
  }

  if (Date.now() > payload.exp) {
    throw new Error("That link has expired.");
  }

  return payload;
}

function emailLayout(title: string, intro: string, ctaLabel: string, ctaUrl: string, outro: string) {
  return `<div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.6;color:#111;">
    <h2 style="margin:0 0 12px;">${title}</h2>
    <p style="margin:0 0 16px;">${intro}</p>
    <p style="margin:0 0 20px;">
      <a href="${ctaUrl}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#111;color:#fff;text-decoration:none;font-weight:600;">
        ${ctaLabel}
      </a>
    </p>
    <p style="margin:0 0 8px;">${outro}</p>
    <p style="margin:0;color:#666;font-size:13px;">If the button does not open, copy this link:<br />${ctaUrl}</p>
  </div>`;
}

export function isAccountEmailConfigured() {
  return getMailConfig().configured;
}

export async function sendVerificationEmail(user: VerificationEmailUser) {
  if (!isAccountEmailConfigured()) {
    return false;
  }

  const token = createActionToken({
    purpose: "verify-email",
    sub: user.id,
    email: user.email,
    exp: Date.now() + 1000 * 60 * 60 * 48,
  });
  const url = `${getAppUrl()}/verify-email?token=${encodeURIComponent(token)}`;

  return sendAppEmail({
    to: user.email,
    subject: "Verify your FamilyFlow email",
    html: emailLayout(
      "Verify your email",
      `Hi ${user.name}, tap below to finish setting up your FamilyFlow account.`,
      "Verify email",
      url,
      "After that, you can sign in and open your profile.",
    ),
  });
}

export async function sendPasswordResetEmail(user: PasswordResetUser) {
  if (!isAccountEmailConfigured()) {
    return false;
  }

  const token = createActionToken({
    purpose: "reset-password",
    sub: user.id,
    email: user.email,
    exp: Date.now() + 1000 * 60 * 60,
    version: passwordVersion(user.passwordHash),
  });
  const url = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;

  return sendAppEmail({
    to: user.email,
    subject: "Reset your FamilyFlow password",
    html: emailLayout(
      "Reset your password",
      `Hi ${user.name}, tap below to choose a new FamilyFlow password.`,
      "Reset password",
      url,
      "This reset link stays active for one hour.",
    ),
  });
}

export async function markEmailVerifiedFromToken(token: string) {
  const payload = readActionToken(token, "verify-email");
  const user = await db.user.findUnique({
    where: { id: payload.sub },
  });

  if (!user || user.email.toLowerCase() !== payload.email.toLowerCase()) {
    throw new Error("That link is not valid anymore.");
  }

  if (user.emailVerifiedAt) {
    return { status: "already-verified" as const };
  }

  await db.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date() },
  });

  return { status: "verified" as const };
}

export async function resetPasswordFromToken(token: string, nextPassword: string) {
  const payload = readActionToken(token, "reset-password");
  const user = await db.user.findUnique({
    where: { id: payload.sub },
  });

  if (!user || user.email.toLowerCase() !== payload.email.toLowerCase()) {
    throw new Error("That reset link is not valid anymore.");
  }

  if (payload.version !== passwordVersion(user.passwordHash)) {
    throw new Error("That reset link has already been used.");
  }

  const nextPasswordHash = await hash(nextPassword, 10);

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: nextPasswordHash,
      updatedAt: new Date(),
    },
  });

  return { status: "password-reset" as const };
}
