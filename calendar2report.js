require('dotenv').config();

const moment = require('moment-timezone');
const calendar = new (require('./model/calendar.js'))();

const OUT_OF_OFFICE = 'This is an out-of-office event';
const ACCEPTED = 'accepted';

function asCompactedEvent(event) {
  // console.log(event);
  return {
    week: moment(event.start.dateTime).format('w'),
    year: moment(event.start.dateTime).format('YYYY'),
    month: moment(event.start.dateTime).format('M'),
    title: String(event.summary).toLowerCase(),
    colorId: event.colorId,
    started: event.start.dateTime,
    duration:
      (moment(event.end.dateTime) - moment(event.start.dateTime)) / 1000 / 60,
    attended: event.attendees
      ? event.attendees.find((a) => a.self).responseStatus === ACCEPTED
      : true,
    outofoffice:
      event.description && event.description.startsWith(OUT_OF_OFFICE),
  };
}

function groupByDate(iterator, current) {
  if (!iterator[current.week]) {
    iterator[current.week] = {
      week: current.week,
      month: current.month,
      year: current.year,
      events: 0,
      titles: [],
      duration: 0,
      c_meeting: 0,
      c_focus: 0,
      c_extra: 0,
      c_unknown: 0,
      t_oneonone: 0,
      t_incident: 0,
      t_interview: 0,
      t_sync: 0,
      t_monaco: 0,
      t_bcn: 0,
      t_changeset: 0,
    };
  }

  const D = current.duration;
  const X = current.week;
  const T = current.title;

  // by color
  if (!current.colorId) iterator[X].c_meeting += D;
  else if (current.colorId === '2') iterator[X].c_focus += D;
  else if (current.colorId === '1' && T !== 'lunch') iterator[X].c_extra += D;
  else iterator[X].c_unknown += D;

  // by type
  if (T.includes('sergio') && T.includes(' / ')) iterator[X].t_oneonone += D;
  if (T.includes('incident')) iterator[X].t_incident += D;
  if (T.includes('interview')) iterator[X].t_interview += D;
  // custom
  if (T.startsWith('sync') || T.endsWith('sync')) iterator[X].t_sync += D;
  if (T.includes('monaco') || T.includes('mutb')) iterator[X].t_monaco += D;
  if (T.includes('bcn') || T.includes('barcelona')) iterator[X].t_bcn += D;
  if (T.includes('changeset')) iterator[X].t_changeset += D;

  iterator[X].titles.push(T);
  iterator[X].duration += D;
  iterator[X].events += 1;

  return iterator;
}

async function main() {
  let timeMin = moment('2020-01-01').toISOString();
  let timeMax = moment().toISOString();

  let events = await calendar.retrieveEvents(timeMin, timeMax);

  events = events
    .map(asCompactedEvent)
    .filter((event) => event.attended) // only when I attended
    .filter((event) => event.started) // only if duration is not 24h
    .filter((event) => !event.outofoffice) // skip if I'm supposed to be out -- TODO others like gym, lunch, ..
    .filter((event) => event.title !== 'lunch')
    .reduce(groupByDate, {});

  console.log(
    [
      'week',
      'month',
      'events',
      'duration',
      'c_meeting',
      'c_focus',
      'c_extra',
      'c_unknown',
      't_oneonone',
      't_incident',
      't_interview',
      't_sync',
      't_monaco',
      't_bcn',
      't_changeset',
    ].join('\t')
  );
  Object.values(events).forEach((v) =>
    console.log(
      [
        v.week,
        v.month,
        v.events,
        v.duration,
        v.c_meeting,
        v.c_focus,
        v.c_extra,
        v.c_unknown,
        v.t_oneonone,
        v.t_incident,
        v.t_interview,
        v.t_sync,
        v.t_monaco,
        v.t_bcn,
        v.t_changeset,
      ].join('\t')
    )
  );
}

main().catch(console.error);
