import nodemailer from 'nodemailer';
import { ENV } from '../../config/env';
import { createError } from '../../middleware/errorHandler';

let transporter: nodemailer.Transporter | null = null;

function hasSmtpConfig() {
  return Boolean(ENV.SMTP_HOST && ENV.SMTP_USER && ENV.SMTP_PASS && ENV.SMTP_FROM);
}

function createTransporter() {
  return nodemailer.createTransport({
    ...(ENV.SMTP_SERVICE ? { service: ENV.SMTP_SERVICE } : {}),
    host: ENV.SMTP_HOST,
    port: ENV.SMTP_PORT,
    secure: ENV.SMTP_SECURE || ENV.SMTP_PORT === 465,
    requireTLS: !ENV.SMTP_SECURE && ENV.SMTP_PORT !== 465,
    auth: {
      user: ENV.SMTP_USER,
      pass: ENV.SMTP_PASS,
    },
    tls: {
      minVersion: 'TLSv1.2',
    },
  });
}

export function getMailer() {
  if (!hasSmtpConfig()) {
    throw createError('SMTP email configuration is incomplete.', 500);
  }

  if (!transporter) {
    transporter = createTransporter();
  }

  return transporter;
}

export async function verifyMailerConnection() {
  if (!hasSmtpConfig()) {
    if (ENV.IS_PRODUCTION) {
      throw new Error('SMTP configuration is required in production.');
    }

    console.warn('SMTP is not fully configured. Email sending is disabled.');
    return;
  }

  const mailer = getMailer();
  await mailer.verify();
  console.log(`SMTP mailer verified for ${ENV.SMTP_HOST}:${ENV.SMTP_PORT}`);
}

export async function sendMail(options: nodemailer.SendMailOptions) {
  try {
    const mailer = getMailer();
    const info = await mailer.sendMail(options);

    console.log(`Email sent successfully to ${String(options.to)} with message id ${info.messageId}`);
    return info;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown SMTP error';
    console.error('SMTP send failed:', message, error);
    throw createError(`Failed to send email via SMTP: ${message}`, 502);
  }
}
