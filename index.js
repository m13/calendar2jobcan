require('dotenv').config();

const moment = require('moment-timezone');
const {askIfContinue} = require('./lib/ask.js');
const calendar = new (require('./model/calendar.js'))();
const jobcan = new (require('./model/jobcan.js'))();


function input() {
  let unit = 'week';
  let timeMin = moment().subtract(1, unit).startOf(unit).toISOString();
  let timeMax = moment().subtract(1, unit).endOf(unit).toISOString();

  let myArgs = process.argv.slice(2);
  if (myArgs[0]) timeMin = moment(myArgs[0]).toISOString();
  if (myArgs[1]) timeMax = moment(myArgs[1]).toISOString();

  return { timeMin, timeMax };
}


async function main() {
  const { timeMin, timeMax } = input();

  console.log(`With locale ${moment.locale()}, timezone ${moment().format('Z')}`);
  console.log(`Search between ${timeMin} and ${timeMax}`);

  const events = await calendar.getEventList(timeMin, timeMax);
  // console.log(events);

  jobcan.display(events);

  const question = 'Do you want to persist the information into JobCan? (y/N) ';
  const accepted = ['y', 'Y', 'yes'];
  const shouldPersist = await askIfContinue(question, accepted);

  if (!shouldPersist) return;

  await jobcan.persist(events);
}


main().catch(console.error);
