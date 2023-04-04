const colors = require('colors/safe');
const moment = require('moment-timezone');
const holidays = new (require('date-holidays'))();
const puppeteer = require('puppeteer');

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
    let overtime = 0;
    let weekday = 0;
    const FULL_DAY = 480;

    console.log(
      colors.bold(`\nJOBCAN`)
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
        colors.blue(moment(key).format('ddd')),
        moment(key).format('MM-DD'),
        colors.grey(value.clockin),
        colors.grey(value.clockout),
        colors.grey(value.breaktime),
        duration,
        colors.yellow(value.vacation)
      ].join('  ');

      if (this.isHoliday(moment(key))) {
        console.log(colors.grey(line));
      } else {
        console.log(line);
        weekday += 1;
      }
      dduration += value.duration;
      overtime += value.duration - FULL_DAY;
    }

    dduration = moment(`2000-01-01 00:00`).add(dduration / weekday, 'minutes');

    let isOvertime = false;
    if (overtime > 0) {
      isOvertime = true;
    }
    const overtimeText = (isOvertime ? '+' : '-') + (moment(`2000-01-01 00:00`).add(Math.abs(overtime), 'minutes')).format('HH:mm');

    console.log(this.LINE_BREAK);
    console.log(
      colors.bold(`>Average: ${dduration.format('HH:mm')} ⏱  during ${weekday} weekdays. ${isOvertime ? colors.green(overtimeText) : colors.red(overtimeText)}`)
    );
  }

  async clear(page, selector) {
    await page.$eval(selector, el => el.value = '');
  }

  async exists(page, xpath) {
    const elements = await page.$x(xpath);
    return elements.length > 0;
  }

  async persist(events) {
    const browser = await puppeteer.launch(); // {headless: false} default is true
    const page = await browser.newPage();

    try {
      await page.goto('https://id.jobcan.jp/users/sign_in?app_key=atd&lang=ja');
      // Set screen size
      await page.setViewport({width: 1080, height: 1024});

      await page.type('#user_email', process.env.JOBCAN_USERNAME);
      await page.type('#user_password', process.env.JOBCAN_PASSWORD);

      await page.click('#login_button');

      for (const [key, value] of Object.entries(events)) {
        await page.goto(`https://ssl.jobcan.jp/employee/adit/modify?year=${value.year}&month=${value.month}&day=${value.day}`);

        if (!await this.exists(page, '//tr[@class="text-center"]//td[contains(., "Clock-in") or contains(., "Clock In")]')) {
          if (!await this.exists(page, '//form[@id="modifyForm"]//div[contains(., "Cannot revise clock time on this day")]')) {
            // Clock-In
            await this.clear(page, '#ter_time');
            await page.type('#ter_time', value.clockin.replace(':', ''));
            await page.click('#insert_button');

            // Clock-Out
            await this.clear(page, '#ter_time');
            await page.type('#ter_time', value.clockout.replace(':', ''));
            await page.click('#insert_button');
            console.log(colors.blue(`clocking in/out: ${key} ${value.clockin} - ${value.clockout}: clocked-in/out`));
          }
        }
      }

    } catch (error) {
      console.error(error);
    } finally {
      await browser.close();
    }
  }
}

module.exports = Jobcan;
