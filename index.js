require('dotenv').config();

const { askIfContinue } = require('./lib/ask.js');
const jobcan = new (require('./model/jobcan.js'))();
const jira = new (require('./model/jira.js'))();

async function main() {
  const events = await require(`./input/${process.env.INPUT}.js`)();

  if (process.env.OUTPUT === 'jobcan') {
    jobcan.display(events);
  } else if (process.env.OUTPUT === 'jira') {
    jira.display(events);
  }

  const question = `Do you want to persist the information into ${process.env.OUTPUT.toUpperCase()}? (y/N) `;
  const accepted = ['y', 'Y', 'yes'];
  const shouldPersist = await askIfContinue(question, accepted);

  if (!shouldPersist) return;

  switch (process.env.OUTPUT) {
    case 'jobcan':
      await jobcan.persist(events);
      break;
    case 'jira':
      await jira.persist(events);
      break;
    default:
      console.log('Invalid');
  }
}

main().catch(console.error);
