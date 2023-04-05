require('dotenv').config();

const { askIfContinue } = require('./lib/ask.js');
const jobcan = new (require('./model/jobcan.js'))();
const jira = new (require('./model/jira.js'))();
const colors = require('colors/safe');
const moment = require('moment-timezone');

function getDateRange() {
  let unit = 'week';
  let timeMin = moment().subtract(1, unit).startOf(unit).toISOString();
  let timeMax = moment().subtract(1, unit).endOf(unit).toISOString();

  let myArgs = process.argv.slice(2);
  if (myArgs[0]) timeMin = moment(myArgs[0]).toISOString();
  if (myArgs[1]) timeMax = moment(myArgs[1]).toISOString();

  return { timeMin, timeMax };
}

async function main() {
  const output = process.env.OUTPUT.toUpperCase();
  const { timeMin, timeMax } = getDateRange();

  console.log(colors.bold(`\n🤖 Locale ${moment.locale()}, timezone ${moment().format('Z')}`));
  console.log(colors.bold(`Search between ${colors.blue(timeMin)} and ${colors.blue(timeMax)}`));

  // TODO: support CSV
  const input = new (require(`./model/${process.env.INPUT}.js`))();
  const inputEvents = await input.getEventList(timeMin, timeMax);

  const jiraEvents = await require(`./input/${process.env.INPUT}.js`)(process.env.JIRA_STRATEGY, inputEvents);
  const jobcanEvents = await require(`./input/${process.env.INPUT}.js`)(process.env.JOBCAN_STRATEGY, inputEvents);

  if (output === 'JOBCAN') {
    jobcan.display(jobcanEvents);
  } else if (output === 'JIRA') {
    jira.display(jiraEvents);
  } else if (output === 'BOTH') {
    jira.display(jiraEvents);
    jobcan.display(jobcanEvents);
  }

  const question = `Do you want to persist the information into ${output === 'BOTH' ? 'JIRA and JOBCAN' : output}? (y/N) `;
  const accepted = ['y', 'Y', 'yes'];
  const shouldPersist = await askIfContinue(question, accepted);
  if (!shouldPersist) return;

  switch (output) {
    case 'JOBCAN':
      await jobcan.persist(jobcanEvents);
      break;
    case 'JIRA':
      await jira.persist(jiraEvents);
      break;
    case 'BOTH':
      await jira.persist(jiraEvents);
      await jobcan.persist(jobcanEvents);
    default:
      console.log('\n');
  }
}

main().catch(console.error);
