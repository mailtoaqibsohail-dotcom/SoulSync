// Thin wrapper around nodemailer — one place to configure SMTP and compose
// templated emails (OTP verification, password reset, etc.).
//
// Env vars required in production:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
//
// On InterServer shared hosting you can use the mailbox created in DirectAdmin,
// e.g. host: mail.proflowenergy.org, port: 587, secure: false.

const nodemailer = require('nodemailer');

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  // Fallback: log emails to console in dev if SMTP isn't configured
  if (!process.env.SMTP_HOST) {
    console.warn('[mailer] SMTP not configured — emails will be logged, not sent.');
    transporter = {
      sendMail: async (opts) => {
        console.log('=== DEV EMAIL ===');
        console.log('To:      ', opts.to);
        console.log('Subject: ', opts.subject);
        console.log(opts.text || opts.html);
        console.log('=================');
        return { messageId: 'dev-' + Date.now() };
      },
    };
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

const FROM = process.env.MAIL_FROM || 'Spark <no-reply@proflowenergy.org>';

const sendMail = async ({ to, subject, text, html }) => {
  const t = getTransporter();
  return t.sendMail({ from: FROM, to, subject, text, html });
};

// Generate a 6-digit numeric OTP
const generateOtp = () =>
  String(Math.floor(100000 + Math.random() * 900000));

const sendOtpEmail = async ({ to, name, code }) => {
  const subject = 'Your Spark verification code';
  const text =
    `Hi ${name || 'there'},\n\n` +
    `Your Spark verification code is: ${code}\n\n` +
    `It expires in 10 minutes. If you didn't request this, you can safely ignore this email.\n\n` +
    `— The Spark team`;
  const html = `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width:480px; margin:auto; padding:32px; background:#0d0d0d; color:#fff; border-radius:12px;">
      <h1 style="color:#fd5068; margin:0 0 16px;">Spark</h1>
      <p>Hi ${name || 'there'},</p>
      <p>Your verification code is:</p>
      <div style="font-size:32px; letter-spacing:8px; font-weight:700; background:#1a1a1a; padding:16px 24px; border-radius:8px; text-align:center; margin:24px 0;">
        ${code}
      </div>
      <p style="color:#999; font-size:14px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    </div>`;
  return sendMail({ to, subject, text, html });
};

const sendPasswordResetEmail = async ({ to, name, code }) => {
  const subject = 'Reset your Spark password';
  const text =
    `Hi ${name || 'there'},\n\n` +
    `Your password reset code is: ${code}\n\n` +
    `It expires in 10 minutes. If you didn't request this, you can safely ignore this email — your password won't be changed.\n\n` +
    `— The Spark team`;
  const html = `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width:480px; margin:auto; padding:32px; background:#0d0d0d; color:#fff; border-radius:12px;">
      <h1 style="color:#fd5068; margin:0 0 16px;">Spark</h1>
      <p>Hi ${name || 'there'},</p>
      <p>Use this code to reset your password:</p>
      <div style="font-size:32px; letter-spacing:8px; font-weight:700; background:#1a1a1a; padding:16px 24px; border-radius:8px; text-align:center; margin:24px 0;">
        ${code}
      </div>
      <p style="color:#999; font-size:14px;">This code expires in 10 minutes. If you didn't request a reset, you can ignore this email — your password won't change.</p>
    </div>`;
  return sendMail({ to, subject, text, html });
};

module.exports = { sendMail, sendOtpEmail, sendPasswordResetEmail, generateOtp };
