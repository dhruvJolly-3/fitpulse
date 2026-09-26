const nodemailer = require('nodemailer');

// Sends transactional email (currently only password-reset links).
// Configure any SMTP provider via env: SMTP_HOST, SMTP_PORT, SMTP_USER,
// SMTP_PASS and MAIL_FROM. Gmail works with an App Password
// (SMTP_HOST=smtp.gmail.com, SMTP_PORT=465).
// Without SMTP_HOST the email is only logged, which is fine for local dev
// but means real users never receive the link.
const isConfigured = () => Boolean(process.env.SMTP_HOST);

let transporter;
const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 465 = implicit TLS, 587 = STARTTLS
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
};

const sendMail = async ({ to, subject, text, html }) => {
  if (!isConfigured()) {
    console.warn(`[mailer] SMTP_HOST not set — email to ${to} not sent. Subject: ${subject}\n${text}`);
    return;
  }
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to, subject, text, html,
  });
};

module.exports = { sendMail, isConfigured };
