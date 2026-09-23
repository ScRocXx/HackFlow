/**
 * Calendar Sync Utility for HackFlow Hackathon Sprints
 * Supports:
 * 1. .ics iCalendar file generation with native phone alarms (BEGIN:VALARM for -PT24H and -PT2H)
 * 2. Google Calendar Web direct template link
 */

export interface CalendarEventDetails {
  title: string;
  description: string;
  location?: string;
  deadline: Date;
  kickoffDate?: Date | null;
  eventUrl?: string;
  meetUrl?: string | null;
}

/**
 * Formats a Date to iCal UTC timestamp format: YYYYMMDDTHHMMSSZ
 */
function formatToIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Generates an .ics file string with explicit VALARM blocks for phone OS triggers.
 */
export function generateIcsContent(details: CalendarEventDetails): string {
  const nowUtc = formatToIcsUtc(new Date());
  const endUtc = formatToIcsUtc(details.deadline);
  
  // Default start to 2 hours before deadline (the critical submission window) or kickoff date if provided
  const startDate = details.kickoffDate && details.kickoffDate < details.deadline
    ? details.kickoffDate
    : new Date(details.deadline.getTime() - 2 * 60 * 60 * 1000);
  const startUtc = formatToIcsUtc(startDate);

  const uid = `hackflow-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@hackflow.app`;

  const fullDescription = [
    details.description,
    details.meetUrl ? `\n🎙️ Squad Meet: ${details.meetUrl}` : '',
    details.eventUrl ? `\n🚀 Workspace: ${details.eventUrl}` : '',
    '\nSynced via HackFlow // Hackathon Execution Engine',
  ].filter(Boolean).join('\n');

  // Escape special chars for iCal
  const cleanSummary = details.title.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, ' ');
  const cleanDescription = fullDescription.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
  const cleanLocation = (details.meetUrl || details.location || 'Online Workspace')
    .replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, ' ');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HackFlow//Hackathon Execution Engine//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:HackFlow Sprints',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:${cleanSummary}`,
    `DESCRIPTION:${cleanDescription}`,
    `LOCATION:${cleanLocation}`,
    details.eventUrl ? `URL:${details.eventUrl}` : '',
    'STATUS:CONFIRMED',
    // Phone Alarm 1: 24 Hours Before Cutoff
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    `DESCRIPTION:⚡ 24H Code Freeze Alert: ${cleanSummary}`,
    'END:VALARM',
    // Phone Alarm 2: 2 Hours Before Cutoff (Critical phone buzzer)
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:🚨 CRITICAL 2H CUTOFF WARNING: ${cleanSummary}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

/**
 * Triggers a browser download of the .ics file.
 */
export function downloadIcsFile(details: CalendarEventDetails) {
  const icsString = generateIcsContent(details);
  const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeFilename = (details.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) || 'hackflow-deadline');
  a.download = `${safeFilename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates a direct Google Calendar Web URL.
 * Note: Google Calendar web scheme populates event details directly; user default web reminders apply.
 */
export function getGoogleCalendarUrl(details: CalendarEventDetails): string {
  const startUtc = formatToIcsUtc(
    details.kickoffDate && details.kickoffDate < details.deadline
      ? details.kickoffDate
      : new Date(details.deadline.getTime() - 2 * 60 * 60 * 1000)
  );
  const endUtc = formatToIcsUtc(details.deadline);

  const fullDetails = [
    details.description,
    details.meetUrl ? `\n🎙️ Squad Meet / Huddle: ${details.meetUrl}` : '',
    details.eventUrl ? `\n🚀 HackFlow Workspace: ${details.eventUrl}` : '',
    '\n⏰ Set alarms at 24h & 2h before deadline to avoid portal rush.',
  ].filter(Boolean).join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: details.title,
    dates: `${startUtc}/${endUtc}`,
    details: fullDetails,
    location: details.meetUrl || details.location || 'Online Workspace',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
