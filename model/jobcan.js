const colors = require('colors/safe');
const moment = require('moment-timezone');
const holidays = new (require('date-holidays'))();
const {
  openBrowser,
  goto,
  write,
  click,
  button,
  closeBrowser,
  $,
  textBox,
  text,
  clear,
  into,
  setConfig,
} = require('taiko');

/*
 events = {
  duration: 8*60
  clockin: '10:00'
  clockout: '19:00'
  breaktime: '1:00'
  year: '2020'
  month: '01'
  day: '01'
 }
 */
class Jobcan {
  constructor() {
    holidays.init(process.env.HOLIDAY_ZONE || 'JP');
    this.LINE_BREAK = '----------------------------------------------------------------------------------------------------';
  }

  // best effort!
  isHoliday(date) {
    return (
      ['Sat', 'Sun'].indexOf(date.format('ddd')) !== -1 ||
      holidays.isHoliday(date.toDate())
    );
  }

  display(events) {
    let dduration = 0;
    let weekday = 0;
    console.log(
      colors.bold(`\nJOBCAN Output`)
    );
    console.log(this.LINE_BREAK);
    for (const [key, value] of Object.entries(events)) {
      let duration = moment(`2000-01-01 00:00`).minutes(value.duration);
      if (duration.hours() > 9) {
        duration = colors.red(duration.format('HH:mm'));
      } else if (duration.hours() < 7) {
        duration = colors.yellow(duration.format('HH:mm'));
      } else {
        duration = colors.green(duration.format('HH:mm'));
      }
      const line = [
        moment(key).format('ddd'),
        key,
        value.clockin,
        value.clockout,
        value.breaktime,
        duration,
      ].join('\t');

      if (this.isHoliday(moment(key))) {
        console.log(colors.grey(line));
      } else {
        console.log(line);
        weekday += 1;
      }
      dduration += value.duration;
    }

    dduration = moment(`2000-01-01 00:00`).add(dduration / weekday, 'minutes');
    console.log(this.LINE_BREAK);
    console.log(
      colors.bold(`>Average: ${dduration.format('HH:mm')} ⏱  during ${weekday} weekdays`)
    );
  }

  async persist(events) {
    try {
      await openBrowser({ headless: false });

      // login
      await goto('https://id.jobcan.jp/users/sign_in?app_key=atd&lang=ja');
      await write(process.env.JOBCAN_USERNAME, $('#user_email'));
      await write(process.env.JOBCAN_PASSWORD, $('#user_password'));
      await click(button('ログイン'));

      // it doesn't work very well...
      setConfig({ observeTime: 200, navigationTimeout: 1000 });

      for (const [key, value] of Object.entries(events)) {
        process.stdout.write(`Started with ${key}`);

        await goto(
          `https://ssl.jobcan.jp/employee/adit/modify?year=${value.year}&month=${value.month}&day=${value.day}`
        );

        if (await text('Clock In').exists()) {
          console.error(` is already submitted!`);
        } else if (!(await text('No clocking on shift day.').exists())) {
          console.error(` is holiday!`);
        } else {
          // Clock-In
          let ter_time = textBox({ id: 'ter_time' });
          let insert_button = button({ id: 'insert_button' });
          await clear(ter_time);
          await write(value.clockin.replace(':', ''), into(ter_time));
          await click(insert_button);
          process.stdout.write(` & in`);
          // Clock-Out
          await clear(ter_time);
          await write(value.clockout.replace(':', ''), into(ter_time));
          await click(insert_button);
          process.stdout.write(` & out`);
          console.log(` & requested!`);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      await closeBrowser();
    }
  }
}

module.exports = Jobcan;
