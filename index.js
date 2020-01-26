require('dotenv').config();

const moment = require('moment-timezone');
const readline = require('readline');
const {authenticate} = require('./lib/google-oauth2.js');
const {getEventList} = require('./lib/google-calendar.js');
const {display, persist} = require('./lib/jobcan.js');


async function askIfContinue(question, accepted) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(accepted.find(e => e === answer));
    });
  });
}


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

  const auth = await authenticate();
  const events = await getEventList(auth, timeMin, timeMax);

  display(events);

  const question = 'Do you want to persist the information into JobCan? (y/N) ';
  const accepted = ['y', 'Y', 'yes'];
  const shouldPersist = await askIfContinue(question, accepted);

  if (!shouldPersist) return;

  await persist(events);
}


main().catch(console.error);
