// by @vadimburlakin
//
const moment = require('moment-timezone');
const YYYYMMDD = 'YYYY-MM-DD';
const HHmm = 'HH:mm';

const holiday_map = {
  'PTO': 'Annual leave 年次有給休暇 (Full day)',
  'PTO-AM': 'Annual leave 年次有給休暇 (AM OFF 午前休)',
  'PTO-PM': 'Annual leave 年次有給休暇 (PM OFF 午後休)',
  'SL': 'Sick/Care Leave 傷病/介護 (Full day)',
  'SL-AM': 'Sick/Care Leave 傷病/介護 (AM OFF)',
  'SL-PM': 'Sick/Care Leave 傷病/介護 (PM OFF)',
}

function extractVacationType(value) {
  const regex = /[\[{]([a-zA-Z]+)[\]}]/;
  const match = regex.exec(value);
  let vacation = null
  if (match) {
    let v = match[1].trim();
    if (holiday_map[v])
      vacation = v;
  }
  return vacation;
}

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

    const duration = (end - current) / 1000 / 60 / 60;
    if (current.format(YYYYMMDD) === end.format(YYYYMMDD) || duration === 24) {
      break;
    }

    current.add(1, 'day');
  }

  return days;
}

function getBreakHoursForDay(startOfDay, endOfDay) {
  let breakTime = 0;
  const dailyHours = ((endOfDay - startOfDay) / 1000 / 60 / 60) - 1;

  // JobCan's default breaktime logic
  if (dailyHours >= 6 && dailyHours < 7)
    breakTime = 45;
  else if (dailyHours >= 7)
    breakTime = 60

  return breakTime;
}

function getWorkingHoursForDay(day) {
  const dayWithoutOutOfOfficeEvents = day.filter((event) => !event.outOfOffice);
  const vacationEvent = day.filter((event) => event.vacation)[0];

  const fullDayOutOfOffice = day.filter((event) => (event.end - event.start) / 1000 / 60 / 60 === 24)[0];
  if (!fullDayOutOfOffice && dayWithoutOutOfOfficeEvents.length > 1) {
    const earliestEventOfTheDay = dayWithoutOutOfOfficeEvents.sort((a, b) => a.start - b.start)[0];
    const lastEventOfTheDay = dayWithoutOutOfOfficeEvents.sort((a, b) => b.end - a.end)[0];
    const breaktime = getBreakHoursForDay(earliestEventOfTheDay.start, lastEventOfTheDay.end);

    let vacationTime = 0;
    if (vacationEvent) {
      // TODO: Decide if we go with 4 hours by default if it's a half vacation, or calculate from event duration (4 * 60)
      vacationTime = ((vacationEvent.end - vacationEvent.start) / 1000 / 60)
    }

    return {
      earliestEvent: earliestEventOfTheDay,
      lastEvent: lastEventOfTheDay,
      clockin: earliestEventOfTheDay.start.format(HHmm),
      clockout: lastEventOfTheDay.end.format(HHmm),
      vacation: vacationEvent ? vacationEvent.vacation + ' 1/2' : '',
      year: earliestEventOfTheDay.start.format('YYYY'),
      month: earliestEventOfTheDay.start.format('MM'),
      day: earliestEventOfTheDay.start.format('DD'),
      duration: ((lastEventOfTheDay.end - earliestEventOfTheDay.start) / 1000 / 60) + vacationTime - breaktime,
      breaktime:  moment(`2000-01-01 00:00`).minutes(breaktime).format('HH:mm')
    };
  } else {
    const earliestEventOfTheDay = day.sort((a, b) => a.start - b.start)[0];

    if (vacationEvent) {
      return {
        earliestEvent: null,
        lastEvent: null,
        clockin: '--:--',
        clockout: '--:--',
        vacation: vacationEvent.vacation,
        year: earliestEventOfTheDay.start.format('YYYY'),
        month: earliestEventOfTheDay.start.format('MM'),
        day: earliestEventOfTheDay.start.format('DD'),
        duration: (8 * 60),
        breaktime:  '--:--'
      };
    }
  }

  return null;
}

module.exports = function (events) {
  // pre-process
  let hash = events
    .map((event) => ({
      title: event.summary,
      outOfOffice: event.eventType === 'outOfOffice',
      colorId: event.colorId,
      start: getEventStartDate(event),
      end: getEventEndDate(event),
      days: getEventDays(event),
      vacation: extractVacationType(event.summary) || extractVacationType(event.description),
      attended: event.attendees
        ? event.status === 'confirmed' && event.attendees.find((attendee) => attendee.self).responseStatus ===
          'accepted'
        : event.status === 'confirmed',
    }))
    .filter((event) => event.attended)
    .filter((event) => event.start) // only consider events that are not all-day events
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
    const workingHours = getWorkingHoursForDay(value);
    if (workingHours)
      hash[key] = workingHours;
    else
      delete hash[key];
  }

  return hash;
};
