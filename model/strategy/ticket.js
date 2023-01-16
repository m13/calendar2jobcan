const moment = require('moment-timezone');

function extractTicketID(value) {
  const regex = /\[(.*?)\]/;
  const match = regex.exec(value);
  return match ? match[1] : null;
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
    "Unexpected start date pattern: " + JSON.stringify(event.start)
  );
}

module.exports = function (events) {
  // pre-process
  let hash = events
    .map((event) => ({
      id: extractTicketID(event.summary) || extractTicketID(event.description),
      calendarId: event.id,
      outOfOffice: event.eventType === "outOfOffice",
      description: event.summary,
      start: getDate(event.start),
      end: getDate(event.end),
      attended: event.confirmed
        ? event.attendees.find((attendee) => attendee.self).responseStatus ===
          "accepted"
        : true,
      duration: (moment(event.end.dateTime) - moment(event.start.dateTime)) / 1000 / 60,
    }))
    .filter((event) => event.attended) // only events we accepted
    .filter((event) => event.start) // only consider events that are not all-day events
    .filter((event) => !event.outOfOffice) // filter out events of type out of office
    .filter((event) => event.id); // filter out events without a ticket in the summary or description

  return hash;
};
