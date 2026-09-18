const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST) {
    // No SMTP configured - log to console instead (dev fallback)
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

async function sendVerificationEmail(toEmail, verifyUrl) {
  const t = getTransporter();
  const subject = 'Verify your Lunch Ordering account';
  const body = `Welcome! Please verify your account by opening this link (valid for 24 hours):\n\n${verifyUrl}\n\nIf you did not request this, you can ignore this email.`;

  if (!t) {
    // Dev fallback - print instead of sending
    console.log(`\n[DEV EMAIL] To: ${toEmail}\nSubject: ${subject}\n${body}\n`);
    return;
  }

  await t.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@lunch-ordering.local',
    to: toEmail,
    subject,
    text: body,
  });
}

module.exports = { sendVerificationEmail };
