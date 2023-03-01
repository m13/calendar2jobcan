const calendar = new (require('../model/calendar.js'))();

module.exports = async function (output, events) {
  return await calendar.parseEventList(output, events);
};
