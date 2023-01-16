const parse = require('csv-parse/lib/sync');
const moment = require('moment-timezone');

class Csv {
  asCompactedEvent(event) {
    return {
      date: event.date,
      duration:
        (moment(`2000-01-01 ${event.clockout}`) -
          moment(`2000-01-01 ${event.clockin}`)) /
        1000 /
        60,
      clockin: event.clockin,
      clockout: event.clockout,
      breaktime: event.breaktime,
      year: moment(event.date).format('YYYY'),
      month: moment(event.date).format('MM'),
      day: moment(event.date).format('DD'),
    };
  }

  groupByDate(iterator, current) {
    // no duplicates, right?
    iterator[current.date] = current;
    return iterator;
  }

  extractEvents(content) {
    const records = parse(content, {
      columns: true,
      trim: true,
      skip_empty_lines: true,
    });

    return records.map(this.asCompactedEvent).reduce(this.groupByDate, {});
  }
}

module.exports = Csv;
