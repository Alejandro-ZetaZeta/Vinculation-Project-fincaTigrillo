import nodemailer from 'nodemailer'

/**
 * Gmail SMTP transporter.
 * Requires env vars:
 *   GMAIL_SMTP_USER  — the Gmail address (e.g. fincatigrillo@gmail.com)
 *   GMAIL_SMTP_PASS  — Gmail App Password (16 chars, no spaces)
 *
 * Generate App Password:
 *   Google Account → Security → 2-Step Verification → App Passwords
 */
export function createGmailTransporter() {
  const user = process.env.GMAIL_SMTP_USER
  const pass = process.env.GMAIL_SMTP_PASS

  if (!user || !pass) {
    throw new Error('[email] GMAIL_SMTP_USER or GMAIL_SMTP_PASS not set')
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
}
