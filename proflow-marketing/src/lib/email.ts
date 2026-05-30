import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outgoing email for ProFlow goes through the agency's own mailbox over SMTP
 * (mail.proflowenergy.org). Configure via env:
 *
 *   SMTP_HOST=mail.proflowenergy.org
 *   SMTP_PORT=587
 *   SMTP_USER=agency@proflowenergy.org
 *   SMTP_PASS=********
 *   SMTP_FROM="ProFlow Agency <agency@proflowenergy.org>"
 *
 * Every invite, password-reset and billing email is sent from this address.
 */

let cached: Transporter | null = null;

function smtpPort(): number {
  return Number(process.env.SMTP_PORT || 587);
}

/** Returns a configured SMTP transport, or null when SMTP env is missing. */
export function getMailer(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  if (!cached) {
    const port = smtpPort();
    cached = nodemailer.createTransport({
      host,
      port,
      // 465 = implicit TLS; 587 = STARTTLS.
      secure: port === 465,
      requireTLS: port === 587,
      auth: { user, pass },
    });
  }
  return cached;
}

/** Default From address — the agency mailbox. */
export const FROM =
  process.env.SMTP_FROM ||
  (process.env.SMTP_USER
    ? `ProFlow Agency <${process.env.SMTP_USER}>`
    : "ProFlow Agency <agency@proflowenergy.org>");

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export type SendResult = { sent: boolean; error?: string };

/**
 * Send an email through the agency SMTP mailbox. Never throws — returns
 * `{ sent: false }` when SMTP isn't configured or the send fails, so callers
 * can degrade gracefully (e.g. still create the account, just skip the email).
 */
export type MailAttachment = {
  filename: string;
  content: Buffer | string;
  contentType?: string;
};

export async function sendMail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  attachments?: MailAttachment[];
}): Promise<SendResult> {
  const mailer = getMailer();
  if (!mailer) return { sent: false, error: "SMTP not configured" };
  try {
    await mailer.sendMail({
      from: opts.from || FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo,
      attachments: opts.attachments,
    });
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

// --- Branded HTML email --------------------------------------------------
// Email clients only reliably support table layouts + inline styles, so the
// templates below avoid flexbox/grid. Brand: indigo→blue gradient, ProFlow
// "P" logo lockup in the header, accent CTA button.

const BRAND_DARK = "#4338ca"; // indigo-700 (gradient start / solid fallback)
const BRAND_BLUE = "#2563eb"; // blue-600  (gradient end)

/** The ProFlow logo lockup (white rounded "P" badge + wordmark) for the header. */
function logoLockup(): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="width:46px;height:46px;background:#ffffff;border-radius:12px;text-align:center;vertical-align:middle;font-family:'Segoe UI',Arial,sans-serif;font-size:26px;font-weight:800;color:${BRAND_BLUE};">P</td>
      <td style="padding-left:14px;vertical-align:middle;font-family:'Segoe UI',Arial,sans-serif;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:.3px;">ProFlow<span style="opacity:.72;font-weight:500;">&nbsp;Marketing</span></td>
    </tr></table>`;
}

/** Accent CTA button (bulletproof: bgcolor fallback + gradient + rounded). */
function ctaButton(text: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 8px;"><tr>
      <td align="center" bgcolor="${BRAND_BLUE}" style="border-radius:10px;background-image:linear-gradient(135deg,${BRAND_DARK} 0%,${BRAND_BLUE} 100%);">
        <a href="${url}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:'Segoe UI',Arial,sans-serif;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">${text}</a>
      </td>
    </tr></table>`;
}

/**
 * Wrap body content in the branded ProFlow shell (gradient header with logo,
 * white card, footer). `inner` is raw HTML placed in the card body.
 */
export function emailShell(inner: string): string {
  return `
  <div style="margin:0;padding:24px 12px;background:#eef2f7;font-family:'Segoe UI',-apple-system,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
      <table role="presentation" width="540" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6eaf2;">
        <tr><td bgcolor="${BRAND_DARK}" style="background-image:linear-gradient(135deg,${BRAND_DARK} 0%,${BRAND_BLUE} 100%);padding:30px 34px;">
          ${logoLockup()}
        </td></tr>
        <tr><td style="padding:34px;color:#0f172a;font-size:15px;line-height:1.65;">
          ${inner}
        </td></tr>
        <tr><td style="padding:20px 34px 26px;border-top:1px solid #eef2f7;color:#94a3b8;font-size:12px;line-height:1.6;">
          Sent by <strong style="color:#64748b;">ProFlow Marketing</strong> &middot;
          <a href="mailto:agency@proflowenergy.org" style="color:${BRAND_BLUE};text-decoration:none;">agency@proflowenergy.org</a>
        </td></tr>
      </table>
      <div style="color:#94a3b8;font-size:11px;padding-top:16px;font-family:'Segoe UI',Arial,sans-serif;">&copy; ProFlow Marketing</div>
    </td></tr></table>
  </div>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:21px;font-weight:700;color:#0f172a;">${text}</h1>`;
}

function fallbackLink(url: string): string {
  return `<p style="margin:22px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">If the button doesn't work, copy and paste this link into your browser:<br/>
    <a href="${url}" style="color:${BRAND_BLUE};word-break:break-all;">${url}</a></p>`;
}

export function invoiceSentEmail(opts: {
  client: string;
  invoice_number: string;
  amount: string;
  due_date: string;
  portal_url: string;
}) {
  return emailShell(`
    ${heading("You have a new invoice")}
    <p style="margin:0 0 14px;">Hi ${opts.client},</p>
    <p style="margin:0 0 14px;">Your invoice <strong>${opts.invoice_number}</strong> for
    <strong>${opts.amount}</strong> is attached, due on <strong>${opts.due_date}</strong>.</p>
    <p style="margin:0;">View the invoice and payment options in your portal:</p>
    ${ctaButton("View invoice", opts.portal_url)}
    <p style="margin:14px 0 0;color:#64748b;font-size:14px;">Once paid, please upload your payment proof in the portal so we can confirm receipt quickly.</p>
  `);
}

/** Invite email for a new team member or client, with a set-password link. */
export function inviteEmail(opts: {
  full_name: string;
  roleLabel: string;
  action_link: string;
  org_name?: string;
}) {
  return emailShell(`
    ${heading(`Welcome to ProFlow${opts.org_name ? `, ${opts.org_name}` : ""}`)}
    <p style="margin:0 0 14px;">Hi ${opts.full_name},</p>
    <p style="margin:0 0 6px;">You've been invited to join the ProFlow workspace as
    <strong>${opts.roleLabel}</strong>. ProFlow is where we'll plan content, share approvals,
    track analytics and handle billing &mdash; all in one place.</p>
    <p style="margin:14px 0 0;">Set your password to activate your account:</p>
    ${ctaButton("Set your password", opts.action_link)}
    ${fallbackLink(opts.action_link)}
  `);
}

/** Password-reset email body. */
export function resetEmail(opts: { action_link: string }) {
  return emailShell(`
    ${heading("Reset your password")}
    <p style="margin:0 0 14px;">We received a request to reset your ProFlow password.
    Click below to choose a new one — this link expires in 1 hour.</p>
    ${ctaButton("Reset password", opts.action_link)}
    ${fallbackLink(opts.action_link)}
    <p style="margin:20px 0 0;color:#94a3b8;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
  `);
}
