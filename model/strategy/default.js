// by @vadimburlakin
//
const moment = require('moment-timezone');
const YYYYMMDD = 'YYYY-MM-DD';
const HHmm = 'HH:mm';

function getEventStartDate(event) {
  if (!event.start) {
    return null;
  }

  if (event.start.dateTime) {
    return moment(event.start.dateTime); // TODO add proper parsing
  }

  if (event.start.date) {
    // this is an all-day event
    return null;
  }

  throw new Error(
    'Unexpected start date pattern: ' + JSON.stringify(event.start)
  );
}

function getEventEndDate(event) {
  if (!event.end) {
    return null;
  }

  if (event.end.dateTime) {
    return moment(event.end.dateTime); // TODO add proper parsing
  }

  if (event.end.date) {
    // this is an all day event
    return null;
  }

  throw new Error('Unexpected end date pattern: ' + JSON.stringify(event.end));
}

function getEventDays(event) {
  const days = [];
  const current = getEventStartDate(event);
  const end = getEventEndDate(event);

  if (!(current && end)) {
    return [];
  }

  while (true) {
    days.push(current.format(YYYYMMDD));

    if (current.format(YYYYMMDD) === end.format(YYYYMMDD)) {
      break;
    }

    current.add(1, 'day');
  }

  return days;
}

function getBreakHoursForDay(day, startOfDay, endOfDay) {
  let breakTime = 0;
  day.forEach(event => {
    if (event.outOfOffice && event.started > startOfDay && event.ended < endOfDay) {
      breakTime += (event.ended - event.started) / 1000 / 60
    }
  });

  return breakTime;
}

function getWorkingHoursForDay(day) {
  const dayWithoutOutOfOfficeEvents = day.filter((event) => !event.outOfOffice);
  const earliestEventOfTheDay = dayWithoutOutOfOfficeEvents.sort((a, b) => a.started - b.started)[0];
  const lastEventOfTheDay = dayWithoutOutOfOfficeEvents.sort((a, b) => b.ended - a.ended)[0];

  const breaktime = getBreakHoursForDay(day, earliestEventOfTheDay.started, lastEventOfTheDay.ended);
  return {
    earliestEvent: earliestEventOfTheDay,
    lastEvent: lastEventOfTheDay,
    clockin: earliestEventOfTheDay.started.format(HHmm),
    clockout: lastEventOfTheDay.ended.format(HHmm),
    year: earliestEventOfTheDay.started.format('YYYY'),
    month: earliestEventOfTheDay.started.format('MM'),
    day: earliestEventOfTheDay.started.format('DD'),
    duration: ((lastEventOfTheDay.ended - earliestEventOfTheDay.started) / 1000 / 60) - breaktime,
    breaktime:  moment(`2000-01-01 00:00`).minutes(breaktime).format('HH:mm')
  };
}

module.exports = function (events) {
  // pre-process
  let hash = events
    .map((event) => ({
      title: event.summary,
      outOfOffice: event.eventType === 'outOfOffice',
      colorId: event.colorId,
      started: getEventStartDate(event),
      ended: getEventEndDate(event),
      days: getEventDays(event),
      attended: event.attendees
        ? event.status === 'confirmed' && event.attendees.find((attendee) => attendee.self).responseStatus ===
          'accepted'
        : event.status === 'confirmed',
    }))
    .filter((event) => event.attended)
    .filter((event) => event.started) // only consider events that are not all-day events
    .reduce((rv, current) => {
      for (let day of current.days) {
        if (!rv[day]) {
          rv[day] = [];
        }
        rv[day].push(current);
      }
      return rv;
    }, {});

  // post-process
  for (const [key, value] of Object.entries(hash)) {
    hash[key] = getWorkingHoursForDay(value);
  }

  return hash;
};
