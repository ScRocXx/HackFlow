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
