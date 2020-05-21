const moment = require('moment-timezone');
const calendar = new (require('../model/calendar.js'))();


function input() {
  let unit = 'week';
  let timeMin = moment().subtract(1, unit).startOf(unit).toISOString();
  let timeMax = moment().subtract(1, unit).endOf(unit).toISOString();

  let myArgs = process.argv.slice(2);
  if (myArgs[0]) timeMin = moment(myArgs[0]).toISOString();
  if (myArgs[1]) timeMax = moment(myArgs[1]).toISOString();

  return { timeMin, timeMax };
}


module.exports = async function() {
  const { timeMin, timeMax } = input();

  console.log(`With locale ${moment.locale()}, timezone ${moment().format('Z')}`);
  console.log(`Search between ${timeMin} and ${timeMax}`);

  return await calendar.getEventList(timeMin, timeMax);
};
