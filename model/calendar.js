const moment = require('moment-timezone');
const {google} = require('googleapis');
const Google = require('./google.js');

const YYYYMMDD = 'YYYY-MM-DD';
const HHmm = 'HH:mm';

class Calendar extends Google {
  constructor() {
    super();
  }

  async calendar() {
    const auth = await this.authorize();
    return google.calendar({ version: 'v3', auth });
  }

  async getEventList(timeMin, timeMax) {
    const myCalendar = await this.calendar();
    const events = await myCalendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      maxResults: 2500,
      singleEvents: true,
      showDeleted: false,
      timeZone: 'Asia/Tokyo',
      showHiddenInvitations: true,
      orderBy: 'startTime'
    });
    return this.filterResults(events);
  }

  // private
  getEventStartDate(event) {
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

    throw new Error('Unexpected start date pattern: ' + JSON.stringify(event.start));
  }

  // private
  getEventEndDate(event) {
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

  // private
  getEventDays(event) {
    const days = [];
    const current = this.getEventStartDate(event);
    const end = this.getEventEndDate(event);

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

  // private
  getWorkingHoursForDay(day) {
    const earliestEventOfTheDay = day.sort((a, b) => (a.started - b.started))[0];
    const lastEventOfTheDay = day.sort((a, b) => (b.ended - a.ended))[0];

    const record = {
      earliestEvent: earliestEventOfTheDay,
      lastEvent: lastEventOfTheDay,
      clockin: earliestEventOfTheDay.started.format(HHmm),
      clockout: lastEventOfTheDay.ended.format(HHmm),
      year: earliestEventOfTheDay.started.format('YYYY'),
      month: earliestEventOfTheDay.started.format('MM'),
      day: earliestEventOfTheDay.started.format('DD'),
      duration: (lastEventOfTheDay.ended - earliestEventOfTheDay.started) / 1000 / 60,
      breaktime: (lastEventOfTheDay.ended - earliestEventOfTheDay.started) > 4 * 60 * 60 * 1000 ? '01:00' : '00:00'
    };

    return record;
  }

  // private
  filterResults(res) {
    const events = res.data.items;
    if (!events.length) return;

    // pre-process
    let hash = events.map((event) => {
      return {
        title: event.summary,
        outofoffice: event.description && event.description.startsWith('This is an out-of-office event'),
        colorId: event.colorId,
        started: this.getEventStartDate(event),
        ended: this.getEventEndDate(event),
        days: this.getEventDays(event),
        attended: (event.attendees) ? event.attendees.find(attendee => attendee.self).responseStatus === 'accepted' : true
      };
    })
      .filter(event => event.attended)
      .filter(event => event.started) // only consider events that are not all-day events
      .filter(event => !event.outofoffice) // TODO: track out-of-office events
      .reduce((rv, current) => {
        for (let day of current.days) {
          if (!(rv[day])) {
            rv[day] = [];
          }
          rv[day].push(current);
        }
        return rv;
      }, {});

    // post-process
    for (const [key, value] of Object.entries(hash)) {
      hash[key] = this.getWorkingHoursForDay(value);
    }

    return hash;
  }
}

module.exports = Calendar;
