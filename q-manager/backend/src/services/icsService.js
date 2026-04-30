const { v4: uuidv4 } = require('uuid');

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatICSDate(dateStr, timeStr) {
  // dateStr: "2026-04-30", timeStr: "14:30"
  const [year, month, day] = dateStr.split('-');
  const [hour, minute] = timeStr.split(':');
  return `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`;
}

function generateICS({ customerName, businessName, serviceName, date, time, durationMinutes }) {
  const dtStart = formatICSDate(date, time);

  // Calculate end time
  const [hour, minute] = time.split(':').map(Number);
  const totalMinutes = hour * 60 + minute + (durationMinutes || 30);
  const endHour = Math.floor(totalMinutes / 60) % 24;
  const endMinute = totalMinutes % 60;
  const endTimeStr = `${pad(endHour)}:${pad(endMinute)}`;
  const dtEnd = formatICSDate(date, endTimeStr);

  const uid = uuidv4();
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OmniQueue//Appointment//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:Appointment at ${businessName}`,
    `DESCRIPTION:${customerName}'s appointment for ${serviceName || 'service'} at ${businessName}.`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

module.exports = { generateICS };
