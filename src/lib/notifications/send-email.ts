import { renderDeadlineReminderHtml, renderTeamInviteHtml } from './email-templates';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

/**
 * Universal email dispatcher supporting:
 * 1. Brevo REST API (Default free choice: 300 emails/day, no custom domain required)
 * 2. Standard SMTP via Nodemailer (Supports Brevo SMTP relay, Gmail SMTP with App Password, MailerLite, etc.)
 * 3. Resend fallback (if RESEND_API_KEY is configured)
 */
export async function sendEmail(options: SendEmailOptions) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || process.env.SENDER_NAME || 'HackFlow';

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  const resendApiKey = process.env.RESEND_API_KEY;

  const htmlContent = options.html || `<p>${options.subject}</p>`;

  // -------------------------------------------------------------
  // 1. Brevo (Sendinblue) Transactional API
  // No custom domain required — any verified email address works as sender!
  // -------------------------------------------------------------
  if (brevoApiKey) {
    const senderEmail = brevoSenderEmail || 'notifications@hackflow.app';
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: senderName,
            email: senderEmail,
          },
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: htmlContent || `<p>${options.subject}</p>`,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[EmailService] Brevo API error (${response.status}):`, errText);
        return { success: false, error: errText };
      }

      const result = await response.json();
      return { success: true, provider: 'brevo', messageId: result?.messageId };
    } catch (error: any) {
      console.error('[EmailService] Failed to send email via Brevo:', error);
      return { success: false, error: error.message };
    }
  }

  // -------------------------------------------------------------
  // 2. Standard SMTP via Nodemailer
  // Works with Brevo SMTP (smtp-relay.brevo.com), Gmail SMTP, MailerLite, etc.
  // -------------------------------------------------------------
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const nodemailer = await import('nodemailer');
      const port = Number(process.env.SMTP_PORT || 587);
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: port,
        secure: port === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const fromAddress = process.env.SMTP_FROM || `"${senderName}" <${brevoSenderEmail || smtpUser}>`;

      const info = await transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        html: htmlContent || `<p>${options.subject}</p>`,
      });

      return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (error: any) {
      console.error('[EmailService] Failed to send email via SMTP:', error);
      return { success: false, error: error.message };
    }
  }

  // -------------------------------------------------------------
  // 3. Resend Fallback
  // -------------------------------------------------------------
  if (resendApiKey && !resendApiKey.startsWith('re_dummy')) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(resendApiKey);
      const { data, error } = await resend.emails.send({
        from: `${senderName} <${process.env.RESEND_FROM || 'onboarding@resend.dev'}>`,
        to: [options.to],
        subject: options.subject,
        html: htmlContent,
      });

      if (error) {
        console.error('[EmailService] Resend API error:', error);
        return { success: false, error };
      }
      return { success: true, provider: 'resend', data };
    } catch (error: any) {
      console.error('[EmailService] Failed to send email via Resend:', error);
      return { success: false, error: error.message };
    }
  }

  // -------------------------------------------------------------
  // 4. Development simulation fallback
  // -------------------------------------------------------------
  console.warn(
    `[EmailService] No active email credentials found. To send real emails without a custom domain, add BREVO_API_KEY and BREVO_SENDER_EMAIL to .env.local (Free 300 emails/day). Simulated email to ${options.to}: "${options.subject}"`
  );
  return { success: true, simulated: true };
}

export async function sendDeadlineEmail(params: {
  to: string;
  eventTitle: string;
  stageName: string;
  timeRemaining: string;
  checklistProgress: string;
  eventUrl: string;
  intervalKey: string;
}) {
  return sendEmail({
    to: params.to,
    subject: `HackFlow Reminder: ${params.eventTitle} - ${params.stageName}`,
    html: renderDeadlineReminderHtml(params),
  });
}

export async function sendTeamInviteEmail(params: {
  to: string;
  inviterName: string;
  eventTitle: string;
  inviteUrl: string;
}) {
  return sendEmail({
    to: params.to,
    subject: `You have been invited to ${params.eventTitle} on HackFlow`,
    html: renderTeamInviteHtml(params),
  });
}
