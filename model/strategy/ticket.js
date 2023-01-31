const moment = require('moment-timezone');

function extractTicketID(value) {
  const regex = /[\[{](([a-zA-Z]+)-([0-9]+))[\]}]/;
  const match = regex.exec(value);
  ticketId = null
  if (match) {
    ticketId = match[1].trim();
  }
  return ticketId;
}

function getDate(date) {
  if (!date) {
    return null;
  }

  if (date.dateTime) {
    return moment.utc(date.dateTime); // TODO add proper parsing
  }

  if (date) {
    // this is an all-day event
    return null;
  }

  throw new Error(
    'Unexpected start date pattern: ' + JSON.stringify(date)
  );
}

module.exports = function (events) {
  // pre-process
  // console.log(events.map((e) => {
  //   return {
  //     description: e.description
  //   }
  // }));

  let hash = events
    .map((event) => ({
      id: extractTicketID(event.summary) || extractTicketID(event.description),
      calendarId: event.id,
      outOfOffice: event.eventType === 'outOfOffice',
      description: event.summary,
      start: getDate(event.start),
      end: getDate(event.end),
      attended: event.attendees
        ? event.status === 'confirmed' && event.attendees.find((attendee) => attendee.self).responseStatus ===
          'accepted'
        : event.status === 'confirmed',
      duration:
        (moment(event.end.dateTime) - moment(event.start.dateTime)) / 1000 / 60,
    }))
    .filter((event) => event.attended) // only events we accepted
    .filter((event) => event.start) // only consider events that are not all-day events
    .filter((event) => !event.outOfOffice) // filter out events of type out of office
    .filter((event) => event.id); // filter out events without a ticket in the summary or description

  return hash;
};
