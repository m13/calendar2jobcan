#!/usr/bin/env node
const moment = require('moment');
const fs = require('fs').promises;
const JapaneseHolidays = require('japanese-holidays');

// defaults
let filename = './monthly.csv';
let year = moment().year();
let month = moment().month(); // It seems more useful with previous month than current
let clockin = '10:00';
let clockout = '19:00';
let breaktime = '01:00';

// best effort!
function isHoliday(date) {
  return (
    ['Sat', 'Sun'].indexOf(date.format('ddd')) !== -1 ||
    JapaneseHolidays.isHoliday(date.toDate())
  );
}

async function main() {
  let content = ['date,clockin,clockout,breaktime'];

  let iterator = 1;
  const lastDay = moment([year, month - 1, 1])
    .endOf('month')
    .date();

  while (iterator < lastDay) {
    const cursor = moment([year, month - 1, iterator]);

    if (!isHoliday(cursor)) {
      content.push(
        [cursor.format('YYYY-MM-DD'), clockin, clockout, breaktime].join(',')
      );
    }

    iterator += 1;
  }

  await fs.writeFile(filename, content.join('\n'));
  console.log(`File ${filename} written.`);
  console.log(`Review extra working or swapped days !!`);
}

main().catch(console.error);
