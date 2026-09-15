import * as React from 'react';
import { Html, Body, Container, Heading, Text, Button, Hr, Section } from '@react-email/components';

interface DeadlineReminderEmailProps {
  eventTitle: string;
  stageName: string;
  timeRemaining: string;
  checklistProgress: string;
  eventUrl: string;
  intervalKey: string;
}

export function renderDeadlineReminderHtml(props: DeadlineReminderEmailProps): string {
  const getBannerColor = (key: string) => {
    switch (key) {
      case '7d': return '#22c55e'; // Green
      case '3d': return '#eab308'; // Yellow
      case '24h': return '#f97316'; // Orange
      case '6h': return '#ef4444'; // Red
      default: return '#3b82f6'; // Blue
    }
  };

  const bannerColor = getBannerColor(props.intervalKey);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${props.eventTitle} - ${props.stageName}</title>
</head>
<body style="background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px;">
  <div style="background-color: #ffffff; max-width: 580px; margin: 0 auto; border-radius: 6px; overflow: hidden; border: 2px solid #10201d; box-shadow: 4px 4px 0 #10201d;">
    <div style="background-color: #10201d; padding: 20px; text-align: center;">
      <h1 style="color: #f7f7f2; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">⚡ HackFlow</h1>
    </div>
    <div style="height: 6px; background-color: ${bannerColor}; width: 100%;"></div>
    <div style="padding: 32px 28px;">
      <h2 style="color: #10201d; margin-top: 0; font-size: 20px; font-weight: 700;">${props.eventTitle}: ${props.stageName}</h2>
      <p style="font-size: 16px; color: #34433f; line-height: 1.6; margin: 16px 0;">
        Approaching stage deadline: <strong style="color: #e53927; font-size: 18px;">${props.timeRemaining} remaining</strong>
      </p>
      <div style="background-color: #f2f2eb; padding: 12px 16px; border-left: 4px solid #3d5f58; margin: 20px 0; font-size: 14px; color: #2e4742;">
        <strong>Checklist Status:</strong> ${props.checklistProgress}
      </div>
      <div style="text-align: center; margin: 32px 0 20px;">
        <a href="${props.eventUrl}" style="background-color: #10201d; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; border-radius: 4px;">
          Open Hackathon Workspace &rarr;
        </a>
      </div>
    </div>
    <div style="border-top: 1px solid #e6ebf1; padding: 16px; text-align: center; font-size: 12px; color: #8898aa; background-color: #fafafa;">
      Sent automatically by HackFlow Event Engine
    </div>
  </div>
</body>
</html>`;
}

export const DeadlineReminderEmail: React.FC<Readonly<DeadlineReminderEmailProps>> = ({
  eventTitle,
  stageName,
  timeRemaining,
  checklistProgress,
  eventUrl,
  intervalKey,
}) => {
  const getBannerColor = (key: string) => {
    switch (key) {
      case '7d': return '#22c55e'; // Green
      case '3d': return '#eab308'; // Yellow
      case '24h': return '#f97316'; // Orange
      case '6h': return '#ef4444'; // Red
      default: return '#3b82f6'; // Blue
    }
  };

  return (
    <Html>
      <Body style={main}>
        <Container style={container}>
          <Heading style={header}>HackFlow</Heading>
          <Section style={{ ...banner, backgroundColor: getBannerColor(intervalKey) }} />
          <Heading style={title}>{eventTitle}: {stageName}</Heading>
          <Text style={urgencyText}>Due in: <strong>{timeRemaining}</strong></Text>
          <Text style={text}>Checklist Progress: {checklistProgress}</Text>
          <Button style={button} href={eventUrl}>
            View Event
          </Button>
          <Hr style={hr} />
          <Text style={footer}>Sent by HackFlow</Text>
        </Container>
      </Body>
    </Html>
  );
};

interface TeamInviteEmailProps {
  inviterName: string;
  eventTitle: string;
  inviteUrl: string;
}

export function renderTeamInviteHtml(props: TeamInviteEmailProps): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited to ${props.eventTitle}</title>
</head>
<body style="background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px;">
  <div style="background-color: #ffffff; max-width: 580px; margin: 0 auto; border-radius: 6px; overflow: hidden; border: 2px solid #10201d; box-shadow: 4px 4px 0 #10201d;">
    <div style="background-color: #10201d; padding: 20px; text-align: center;">
      <h1 style="color: #f7f7f2; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">⚡ HackFlow</h1>
    </div>
    <div style="padding: 32px 28px;">
      <h2 style="color: #10201d; margin-top: 0; font-size: 20px; font-weight: 700;">You're Invited to Join a Hackathon Team!</h2>
      <p style="font-size: 15px; color: #34433f; line-height: 1.6;">
        <strong>${props.inviterName}</strong> has added you as a teammate for <strong>${props.eventTitle}</strong> on HackFlow.
      </p>
      <p style="font-size: 14px; color: #555; line-height: 1.5;">
        Collaborate on deliverables, sync sprint checklists, track live round deadlines, and manage your team vault together.
      </p>
      <div style="text-align: center; margin: 32px 0 20px;">
        <a href="${props.inviteUrl}" style="background-color: #e53927; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; border-radius: 4px;">
          View Hackathon & Accept &rarr;
        </a>
      </div>
    </div>
    <div style="border-top: 1px solid #e6ebf1; padding: 16px; text-align: center; font-size: 12px; color: #8898aa; background-color: #fafafa;">
      Sent automatically by HackFlow
    </div>
  </div>
</body>
</html>`;
}

export const TeamInviteEmail: React.FC<Readonly<TeamInviteEmailProps>> = ({
  inviterName,
  eventTitle,
  inviteUrl,
}) => {
  return (
    <Html>
      <Body style={main}>
        <Container style={container}>
          <Heading style={header}>HackFlow</Heading>
          <Heading style={title}>You've been invited to join {eventTitle}</Heading>
          <Text style={text}>Invited by {inviterName}</Text>
          <Button style={button} href={inviteUrl}>
            Accept Invitation
          </Button>
          <Hr style={hr} />
          <Text style={footer}>Sent by HackFlow</Text>
        </Container>
      </Body>
    </Html>
  );
};

interface StageCompletedEmailProps {
  eventTitle: string;
  completedStage: string;
  nextStage?: string;
  eventUrl: string;
}

export const StageCompletedEmail: React.FC<Readonly<StageCompletedEmailProps>> = ({
  eventTitle,
  completedStage,
  nextStage,
  eventUrl,
}) => {
  return (
    <Html>
      <Body style={main}>
        <Container style={container}>
          <Heading style={header}>🎉 HackFlow</Heading>
          <Heading style={title}>{completedStage} completed!</Heading>
          {nextStage && (
            <Text style={text}>Next up: {nextStage}</Text>
          )}
          <Button style={button} href={eventUrl}>
            View Event
          </Button>
          <Hr style={hr} />
          <Text style={footer}>Sent by HackFlow</Text>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const header = {
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '30px 0',
  color: '#333',
};

const banner = {
  height: '6px',
  width: '100%',
};

const title = {
  fontSize: '20px',
  padding: '0 48px',
};

const urgencyText = {
  fontSize: '18px',
  padding: '0 48px',
};

const text = {
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 48px',
};

const button = {
  backgroundColor: '#000',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '200px',
  margin: '0 auto',
  padding: '12px',
  borderRadius: '4px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  textAlign: 'center' as const,
};
