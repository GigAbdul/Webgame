import nodemailer from 'nodemailer';
import { env } from '../config/env';

type VerificationEmailMessage = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hasResendConfig() {
  return Boolean(env.RESEND_API_KEY && env.RESEND_FROM);
}

function hasSmtpConfig() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM);
}

function createVerificationEmailMessage(email: string, code: string, from: string): VerificationEmailMessage {
  const safeEmail = escapeHtml(email);
  const safeCode = escapeHtml(code);

  return {
    from,
    to: email,
    subject: `Your DashForge verification code is ${code}`,
    text: [
      `Your DashForge verification code is ${code}.`,
      '',
      'Enter this code in DashForge to confirm your email address.',
      'The code expires in 10 minutes.',
      '',
      `This message was sent to ${email} because someone created a DashForge account with this address.`,
      "If this wasn't you, you can ignore this email.",
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
        <h1 style="font-size: 24px; margin: 0 0 16px;">DashForge email verification</h1>
        <p style="margin: 0 0 12px;">Enter this code in DashForge to confirm your email address:</p>
        <p style="font-size: 32px; font-weight: 800; letter-spacing: 6px; margin: 0 0 16px;">${safeCode}</p>
        <p style="margin: 0 0 16px;">This code expires in 10 minutes.</p>
        <p style="margin: 0; color: #6b7280; font-size: 13px;">
          This message was sent to ${safeEmail} because someone created a DashForge account with this address.
          If this wasn't you, you can ignore this email.
        </p>
      </div>
    `,
  };
}

async function sendViaResend(message: VerificationEmailMessage) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: message.from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend email failed (${response.status}): ${errorBody || response.statusText}`);
  }
}

async function sendViaSmtp(message: VerificationEmailMessage) {
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: message.from,
    replyTo: message.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

export async function sendEmailVerificationCode(email: string, code: string) {
  if (hasResendConfig()) {
    await sendViaResend(createVerificationEmailMessage(email, code, env.RESEND_FROM));
    return;
  }

  if (hasSmtpConfig()) {
    await sendViaSmtp(createVerificationEmailMessage(email, code, env.SMTP_FROM));
    return;
  }

  if (env.NODE_ENV === 'production') {
    throw new Error('Email provider is not configured');
  }

  console.info(`[email-verification] Code for ${email}: ${code}`);
}
