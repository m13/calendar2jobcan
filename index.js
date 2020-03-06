require('dotenv').config();

const {askIfContinue} = require('./lib/ask.js');
const jobcan = new (require('./model/jobcan.js'))();


async function main() {
  const events = await require(`./input/${process.env.INPUT}.js`)();

  jobcan.display(events);

  const question = 'Do you want to persist the information into JobCan? (y/N) ';
  const accepted = ['y', 'Y', 'yes'];
  const shouldPersist = await askIfContinue(question, accepted);

  if (!shouldPersist) return;

  await jobcan.persist(events);
}


main().catch(console.error);
