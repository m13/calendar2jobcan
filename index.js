require('dotenv').config();

const moment = require('moment-timezone');
const readline = require('readline');
const {getAuth} = require('./lib/google-oauth2.js');
const {listEvents} = require('./lib/google-calendar.js');
const {show, persist} = require('./lib/jobcan.js');


function shouldPersist(data) {
  show(data);

  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('Do you want to persist the information into JobCan? (y/N) ', (answer) => {
      rl.close();
      if (answer === 'y' || answer === 'Y') return resolve(data);
      reject('Done!');
    });
  });
}


async function main() {
  let unit = 'week';
  let timeMin = moment().subtract(1, unit).startOf(unit).toISOString();
  let timeMax = moment().subtract(1, unit).endOf(unit).toISOString();

  let myArgs = process.argv.slice(2);
  if (myArgs[0]) timeMin = moment(myArgs[0]).toISOString();
  if (myArgs[1]) timeMax = moment(myArgs[1]).toISOString();

  console.log(`With locale ${moment.locale()}, timezone ${moment().format('Z')}`);
  console.log(`Search between ${timeMin} and ${timeMax}`);

  await getAuth()
    .then(auth => listEvents(auth, timeMin, timeMax))
    .then(data => shouldPersist(data))
    .then(data => persist(data));
}

main().catch(console.error);
