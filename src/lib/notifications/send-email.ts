import { Resend } from 'resend';
import * as React from 'react';
import { DeadlineReminderEmail, TeamInviteEmail } from './email-templates';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build');

export async function sendEmail(options: { to: string; subject: string; react: React.ReactElement }) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'HackFlow <onboarding@resend.dev>',
      to: [options.to],
      subject: options.subject,
      react: options.react,
    });
    if (error) {
      console.error('Resend API error:', error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
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
    react: React.createElement(DeadlineReminderEmail, params),
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
    react: React.createElement(TeamInviteEmail, params),
  });
}
