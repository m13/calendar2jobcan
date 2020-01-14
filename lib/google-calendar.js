const {google} = require('googleapis');
const moment = require('moment-timezone');


function filterResults(res) {
  const events = res.data.items;
  if (!events.length) return;

  let hash = events.map((event) => {
    return {
      title: event.summary,
      outofoffice: event.description && event.description.startsWith('This is an out-of-office event'),
      colorId: event.colorId,
      started: event.start.dateTime,
      day: moment(event.start.dateTime).format('YYYY-MM-DD'),
      duration: (moment(event.end.dateTime) - moment(event.start.dateTime)) / 1000 / 60,
      attended: (event.attendees) ? event.attendees.find(attendee => attendee.self).responseStatus === 'accepted' : true
    };
  })
    .filter(event => event.attended)
    .filter(event => event.started)
    .filter(event => !event.outofoffice) // TODO: track out-of-office events
    .reduce((rv, current) => {
      if (!(rv[current.day])) {
        rv[current.day] = {
          events: 0,
          year: moment(current.day).format('YYYY'),
          month: moment(current.day).format('MM'),
          day: moment(current.day).format('DD'),
          started: current.started,
          clockin: moment(current.started).format('HH:mm'),
          duration: 0,
          clockout: null,
          extra: 0,
          breaktime: '00:00'
        };
      }
      rv[current.day].events += 1;
      rv[current.day].duration += current.duration;
      return rv;
    }, {});

  for (const [key, value] of Object.entries(hash)) {
    if (value.duration >= 60 * 4) {
      hash[key].extra = 60;
      hash[key].breaktime = '01:00';
    }
    if (hash[key].extra + value.duration > 60 * 12) {
      hash[key].clockin = moment(value.started).format('HH:mm');
    }
    if (moment(value.started).hour() < 7 && value.duration < 60 * 12) {
      hash[key].clockin = moment(value.started).hours(8).format('HH:mm');
    }
    hash[key].clockout = moment(`2000-01-01 ${hash[key].clockin}`)
      .add(hash[key].extra + value.duration, 'minutes').format('HH:mm');
  }

  return hash;
}


exports.listEvents = async function (auth, timeMin, timeMax) {
  const calendar = google.calendar({version: 'v3', auth});
  return await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    maxResults: 2500,
    singleEvents: true,
    showDeleted: false,
    timeZone: 'Asia/Tokyo',
    showHiddenInvitations: true,
    orderBy: 'startTime'
  })
    .then(data => filterResults(data));
};
