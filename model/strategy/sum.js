// by @m13
//
const moment = require('moment-timezone');

const OUT_OF_OFFICE = 'outOfOffice';
const ACCEPTED = 'accepted';

function asCompactedEvent(event) {
  return {
    title: event.summary,
    colorId: event.colorId,
    started: event.start.dateTime,
    date: moment(event.start.dateTime).format('YYYY-MM-DD'),
    duration:
      (moment(event.end.dateTime) - moment(event.start.dateTime)) / 1000 / 60,
    attended: event.attendees
      ? event.attendees.find((a) => a.self).responseStatus === ACCEPTED
      : true,
    outofoffice: event.eventType === OUT_OF_OFFICE,
  };
}

function groupByDate(iterator, current) {
  if (!iterator[current.date]) {
    iterator[current.date] = {
      events: 0,
      year: moment(current.date).format('YYYY'),
      month: moment(current.date).format('MM'),
      day: moment(current.date).format('DD'),
      started: current.started,
      clockin: moment(current.started).format('HH:mm'),
      duration: 0,
      clockout: null,
      extra: 0,
      breaktime: '00:00',
    };
  }
  // if I worked >4h, then add a break (only once)
  if (
    iterator[current.date].duration < 60 * 4 &&
    iterator[current.date].duration + current.duration >= 60 * 4
  ) {
    iterator[current.date].extra = 60;
    iterator[current.date].breaktime = '01:00';
  }
  iterator[current.date].duration += current.duration;
  iterator[current.date].clockout = moment(
    `2000-01-01 ${iterator[current.date].clockin}`
  )
    .add(
      iterator[current.date].extra + iterator[current.date].duration,
      'minutes'
    )
    .format('HH:mm');
  iterator[current.date].events += 1;
  return iterator;
}

module.exports = function (events) {
  return events
    .map(asCompactedEvent)
    .filter((event) => event.attended) // only when I attended
    .filter((event) => event.started) // only if duration is not 24h
    .filter((event) => !event.outofoffice) // skip if I'm supposed to be out -- TODO others like gym, lunch, ..
    .reduce(groupByDate, {});
};
