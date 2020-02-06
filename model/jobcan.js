const colors = require('colors/safe');
const pad = require('pad-left');
const moment = require('moment-timezone');
const {openBrowser, goto, write, click, button, closeBrowser,
  $, evaluate, near, textBox, dropDown, text, clear, alert, accept} = require('taiko');
const TAIKO_WRITE_OPTIONS = {
  delay: 1,
  waitForStart: 0
};


class Jobcan {
  display(events) {
    let dduration = 0;
    let weekday = 0;

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
        value.clockin, value.clockout, value.breaktime,
        duration
      ]
        .join("\t");

      // TODO moment-holiday ??
      if (['Sat', 'Sun'].indexOf(moment(key).format('ddd')) !== -1) {
        console.log(colors.grey(line));
      } else {
        console.log(line);
        weekday += 1;
      }
      dduration += value.duration;
    }

    dduration = moment(`2000-01-01 00:00`).add(dduration / weekday, 'minutes');
    console.log(colors.bold(`${dduration.format('HH:mm')} avg during ${weekday} weekdays`));
  }

  async persist(events) {
    try {
      await openBrowser({headless: false});
      // this doesn't work - dunno why :(
      alert('Are you sure', async () => await accept());

      // login
      await goto('https://id.jobcan.jp/users/sign_in?app_key=atd');
      await write(process.env.JOBCAN_USERNAME, $('#user_email'));
      await write(process.env.JOBCAN_PASSWORD, $('#user_password'));
      await click(button('ログイン'));
      await goto('https://ssl.jobcan.jp/employee/attendance/edit');

      const requestAgain = `//div[text()='Request again']`;

      // select right month
      for (const [key, value] of Object.entries(events)) {
        process.stdout.write(`Started with ${key}`);

        try {
          // goto right year/month
          const currentYear = await dropDown({name: 'year'}).value();
          if (pad(currentYear, 4, '0') !== value.year) {
            await dropDown({name: 'year'}).select(value.year);
          }
          const currentMonth = await dropDown({name: 'month'}).value();
          if (pad(currentMonth, 2, '0') !== value.month) {
            await dropDown({name: 'month'}).select(value.month);
          }

          if (await $(requestAgain).exists()) {
            // clicking this displays an alert.
            // because handling alerts does not work, you need to click manually.
            await click($(requestAgain));
          }

          // select row
          const id = await evaluate($(`//tr[td[contains(text(),'${value.month}/${value.day}')]]`), (e) => e.id.match(/\d+/));
          process.stdout.write(` & id=${id}`);

          await clear(textBox({id: `start_${id}`}), TAIKO_WRITE_OPTIONS);
          await write(value.clockin, textBox({id: `start_${id}`}), TAIKO_WRITE_OPTIONS);
          await clear(textBox({id: `end_${id}`}), TAIKO_WRITE_OPTIONS);
          await write(value.clockout, textBox({id: `end_${id}`}), TAIKO_WRITE_OPTIONS);
          await clear(textBox({id: `rest_${id}`}), TAIKO_WRITE_OPTIONS);
          await write(value.breaktime, textBox({id: `rest_${id}`}), TAIKO_WRITE_OPTIONS);

          console.log(` & requested!`);
        } catch (error) {
          console.error(` is already submitted!`);
          console.error(error);
        }
      }

      // execute
      await click($(`//div[text()='Send Request']`));
    } catch (error) {
      console.error(error);
    } finally {
      await closeBrowser();
    }
  }
}

module.exports = Jobcan;
