const { google } = require('googleapis');
const Google = require('./google.js');

class Calendar extends Google {
  constructor() {
    super();
  }

  async retrieveEvents(timeMin, timeMax) {
    const auth = await this.authorize();
    const calendar = google.calendar({ version: 'v3', auth });
    const body = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      maxResults: 2500,
      singleEvents: true,
      showDeleted: false,
      timeZone: process.env.CALENDAR_TIMEZONE || 'Asia/Tokyo',
      showHiddenInvitations: true,
      orderBy: 'startTime',
    });

    return body.data.items;
  }

  async getEventList(timeMin, timeMax) {
    const events = await this.retrieveEvents(timeMin, timeMax);
    if (!events.length) return [];

    const strategy = require(`./strategy/${process.env.STRATEGY}.js`);
    return strategy(events);
  }
}

module.exports = Calendar;
