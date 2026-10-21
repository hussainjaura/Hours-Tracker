// I made this emailVerification.js so a new account has to prove it owns its email address:
// the link we email holds a random token, and the database only keeps a hash of it:

import { randomBytes, createHash } from "crypto";
import { AppError } from "./errors.js";
import { sendVerificationEmail } from "./email.js";

// a verification link stays valid for 24 hours:
const LINK_LIFETIME_MS = 24 * 60 * 60 * 1000;

// this hashes the token the same way as password reset tokens:
// so someone who sees the database still cannot use the links:
const hashToken = (token) => createHash("sha256").update(token).digest("hex");


// this checks if verification is switched on in .env:
// when it is off, new accounts are marked as verified straight away (handy for demos):
export const isEmailVerificationEnabled = () => {
  return process.env.ENABLE_EMAIL_VERIFICATION === "true";
};


// this builds the link the user clicks, using the first address in FRONTEND_URL:
const buildVerificationUrl = (token) => {
  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0].trim();
  return `${frontendUrl}/verify-email?token=${token}`;
};


// this makes a fresh link for a user and emails it to them:
// any older links are deleted first, so only the newest email works:
export async function createAndSendVerification(prisma, user) {
  const token = randomBytes(32).toString("hex");

  await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      token: hashToken(token),
      expiresAt: new Date(Date.now() + LINK_LIFETIME_MS),
    },
  });

  // a failed email should not break sign up, so we only log the problem:
  try {
    await sendVerificationEmail(user.email, buildVerificationUrl(token));
  } catch (emailError) {
    console.error("VERIFICATION EMAIL FAILED:", emailError.message);
  }
}


// this checks a token from a link and marks the user as verified:
// it returns the user so the route can record who verified:
export async function verifyEmailToken(prisma, token) {
  const saved = await prisma.emailVerificationToken.findUnique({
    where: { token: hashToken(token) },
    include: { user: true },
  });

  if (!saved) {
    throw new AppError("This verification link is not valid. It may have been replaced by a newer email.", 400, "INVALID_TOKEN");
  }

  // an old link is removed so it cannot be tried again:
  if (new Date() > saved.expiresAt) {
    await prisma.emailVerificationToken.delete({ where: { id: saved.id } });
    throw new AppError("This verification link has expired. Log in and send yourself a new one.", 400, "TOKEN_EXPIRED");
  }

  // this saves the time they verified, then removes the used link:
  const user = await prisma.user.update({
    where: { id: saved.userId },
    data: { emailVerifiedAt: saved.user.emailVerifiedAt || new Date() },
  });
  await prisma.emailVerificationToken.deleteMany({ where: { userId: saved.userId } });

  return user;
}
