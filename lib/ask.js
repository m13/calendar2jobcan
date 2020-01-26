const readline = require('readline');

async function askFor(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function askIfContinue(question, accepted) {
  const answer = await askFor(question);
  return accepted.find(e => e === answer);
}

module.exports = {
  askFor,
  askIfContinue
};
