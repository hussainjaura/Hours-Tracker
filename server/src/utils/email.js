/**
 * Email sending.
 *
 * Uses Resend's HTTP API (https://resend.com), which needs no extra npm
 * package because Node 18+ has fetch built in. Set these in .env:
 *   RESEND_API_KEY - API key from the Resend dashboard
 *   EMAIL_FROM     - sender, e.g. "ISC Audit <no-reply@yourdomain.com>"
 *                    (the domain must be verified in Resend)
 *
 * Without them, emails are printed to the server console instead, which is
 * handy in development. In production that means nobody receives the email,
 * so a warning is logged.
 */

const RESEND_URL = "https://api.resend.com/emails";

export const isEmailConfigured = () =>
  Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

/**
 * Sends an email. Throws if the provider rejects it, so callers can decide
 * whether that should fail the request.
 */
export async function sendEmail({ to, subject, text, html }) {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        `EMAIL NOT SENT to ${to} ("${subject}"): RESEND_API_KEY and EMAIL_FROM are not set`
      );
    }
    console.log("=".repeat(60));
    console.log(`EMAIL (console only, not sent)\nTo: ${to}\nSubject: ${subject}\n`);
    console.log(text);
    console.log("=".repeat(60));
    return { delivered: false };
  }

  const response = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Email provider returned ${response.status}: ${detail}`);
  }

  return { delivered: true };
}

/**
 * Escapes text for safe use inside the HTML email body.
 */
const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export async function sendPasswordResetEmail(to, resetUrl) {
  const subject = "Reset your ISC Audit password";
  const text =
    `You asked to reset your ISC Audit password.\n\n` +
    `Open this link to choose a new password (it expires in 1 hour):\n${resetUrl}\n\n` +
    `If you didn't ask for this, you can ignore this email. Your password won't change.`;
  const safeUrl = escapeHtml(resetUrl);
  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #111827; max-width: 520px;">
      <h2 style="margin: 0 0 16px;">Reset your password</h2>
      <p>You asked to reset your ISC Audit password. This link expires in 1 hour.</p>
      <p style="margin: 24px 0;">
        <a href="${safeUrl}" style="background: #111827; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Choose a new password
        </a>
      </p>
      <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy this link into your browser:<br>${safeUrl}</p>
      <p style="color: #6b7280; font-size: 14px;">If you didn't ask for this, you can ignore this email. Your password won't change.</p>
    </div>`;

  return sendEmail({ to, subject, text, html });
}
