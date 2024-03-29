import puppeteer from "puppeteer";
import _ from "lodash";
import { CronJob } from "cron";

import Telegram from "./telegram.js";

const LOGIN_PAGE_URL = process.env.LOGIN_PAGE_URL;
const SCHEDULE_PAGE_URL = process.env.SCHEDULE_PAGE_URL;

const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;
const TYPE = process.env.TYPE;

let notifiedAvailableTimeSlots = [];

const crawler = async () => {
  let browser;

  try {
    browser = await puppeteer
      .launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      })

    const page = await browser.newPage()

    await page.goto(LOGIN_PAGE_URL, { waitUntil: 'networkidle2' })

    await page.type("[name=username]", USERNAME);
    await page.type("[name=password]", PASSWORD);
    await page.select("[name=tipo]", TYPE);
    await page.click("[type=submit]");

    await page.goto(SCHEDULE_PAGE_URL, { waitUntil: 'networkidle2' });

    const availableTimeSlots = await page.evaluate(() => {
      const TIME_SLOTS = ['06:30', '08:00', '09:30', '11:00', '12:30', '14:00', '15:30', '17:00'];
      const EVALUATE_NEXT_N_DAYS = 25;
      const ACFT = 'C150-L';

      // get schedule rows
      const rows = document.querySelectorAll('td:first-child strong');

      // filter next N days of the acft schedule rows  
      const rowsAcft = [...rows].filter(element => element.innerText === ACFT).slice(0, EVALUATE_NEXT_N_DAYS);

      const availableTimeSlots = [];

      rowsAcft.map((rowAcft, rowAcftIndex) => {
        // get time slots from 07:00 to 16:00
        const timeSlots = [...rowAcft.parentElement.parentElement.parentElement.children].slice(1, -3);

        // find available time slots inside desired time range
        timeSlots.map((timeSlot, i) => {
          if (timeSlot.querySelector('p:first-child').innerText.toUpperCase() === 'AVALIABLE') {
            availableTimeSlots.push({
              acft: rowAcftIndex % 2,
              date: rowAcft.closest('table').children[0].children[0].children[0].childNodes[0].textContent.trim(),
              time: TIME_SLOTS[i],
            })
          }
        });
      });

      return availableTimeSlots
    });

    const unnotifiedAvailableTimeSlots = _.differenceWith(availableTimeSlots, notifiedAvailableTimeSlots, _.isEqual);

    console.log(new Date(), `${unnotifiedAvailableTimeSlots.length} new time slots found`, unnotifiedAvailableTimeSlots)

    if (unnotifiedAvailableTimeSlots.length === 0) return;

    const notificationSections = [{
      name: 'Barra 1',
      list: _.groupBy(unnotifiedAvailableTimeSlots.filter(({ acft }) => acft === 0), 'date')
    }, {
      name: 'Barra 2',
      list: _.groupBy(unnotifiedAvailableTimeSlots.filter(({ acft }) => acft === 1), 'date')
    }]

    const generateNotificationSectionText = ({ name, list }) =>
      `\n\n${name}\n\n` +
      Object.keys(list).map((date) =>
        `<b>${date.substr(-2)}/${date.substr(-5, 2)}</b>   ${list[date].map(({ time }) => time).join(', ')}`
      ).join('\n')

    Telegram.sendMessage(
      `<b>${unnotifiedAvailableTimeSlots.length} ${unnotifiedAvailableTimeSlots.length === 1 ? 'novo horário disponível' : 'novos horários disponíveis'}:</b>` +
      notificationSections.reduce((acc, notificationSection) =>
        acc + (Object.keys(notificationSection.list).length > 0 ? generateNotificationSectionText(notificationSection) : '')
      , '')
    )

    notifiedAvailableTimeSlots = availableTimeSlots;
  } catch (error) {
    console.log(error)
  } finally {
    await browser.close();
  }
}

// run every 10 minutes from 6am to 11pm
new CronJob('*/10 6-23 * * *', crawler, null, true, 'America/Sao_Paulo', null, true);
