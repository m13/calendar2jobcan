const csv = new (require('../model/csv.js'))();
const fs = require('fs').promises;

function input() {
  let filename = './monthly.csv';

  let myArgs = process.argv.slice(2);
  if (myArgs[0]) filename = String(myArgs[0]);

  return { filename };
}


module.exports = async function() {
  const { filename } = input();

  console.log(`Reading from ${filename}`);

  const content = await fs.readFile(filename);

  return csv.extractEvents(content);
};
