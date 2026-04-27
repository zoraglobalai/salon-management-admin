import 'reflect-metadata';
import { ENV } from '../../config/env';
import { sendMail, verifyMailerConnection } from '../../shared/mail/mailer';

type CliArgs = {
  to?: string;
  subject?: string;
};

function parseArgs(argv: string[]) {
  return argv.reduce<CliArgs>((acc, arg) => {
    const [key, ...valueParts] = arg.split('=');
    const value = valueParts.join('=').trim();

    if (key === '--to') {
      acc.to = value;
    }

    if (key === '--subject') {
      acc.subject = value;
    }

    return acc;
  }, {});
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const to = args.to?.trim();

  if (!to) {
    throw new Error('Usage: npm run test-email -- --to=<recipient@example.com> [--subject=<subject>]');
  }

  await verifyMailerConnection();

  const subject = args.subject?.trim() || 'Salon Growth Engine SMTP Test';
  const sentAt = new Date().toISOString();

  await sendMail({
    from: `"Salon Growth Engine" <${ENV.SMTP_FROM}>`,
    to,
    subject,
    text: `This is a real SMTP test email from Salon Growth Engine.\nSent at: ${sentAt}\nFrom: ${ENV.SMTP_FROM}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="margin-top: 0; color: #111827;">SMTP Test Successful</h2>
        <p>This message was sent from the backend using your configured SMTP credentials.</p>
        <p><strong>Sent at:</strong> ${sentAt}</p>
        <p><strong>From:</strong> ${ENV.SMTP_FROM}</p>
        <p>If you received this, the backend SMTP setup is working properly.</p>
      </div>
    `,
  });

  console.log(`Test email sent to ${to}`);
}

main().catch((error) => {
  console.error('SMTP test failed:', error.message || error);
  process.exit(1);
});
