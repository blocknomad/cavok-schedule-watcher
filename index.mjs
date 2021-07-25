import puppeteer from "puppeteer";
import _ from "lodash";
import { CronJob } from "cron";

import Telegram from "./telegram.mjs";

const LOGIN_PAGE_URL = process.env.LOGIN_PAGE_URL;
const SCHEDULE_PAGE_URL = process.env.SCHEDULE_PAGE_URL;

const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;
const TYPE = process.env.TYPE;

const jobFn = async () => {
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
      const TIME_SLOTS = ['08:30', '10:00', '11:30', '13:00', '14:30', '16:00'];
      const EVALUATE_NEXT_N_DAYS = 40;
      const ACFT = 'C150-L';

      // get schedule rows
      const rows = document.querySelectorAll('td:first-child strong');

      // filter next N days acft schedule rows  
      const rowsAcft = [...rows].filter(element => element.innerText === ACFT).slice(0, EVALUATE_NEXT_N_DAYS);
      const availableTimeSlots = [];

      rowsAcft.map(rowAcft => {
        // get time slots from 8:30 to 16:00
        const timeSlots = [...rowAcft.parentElement.parentElement.parentElement.children].slice(2, -2);

        // find available time slots
        timeSlots.map((timeSlot, i) => {
          if (timeSlot.querySelector('p:first-child').innerText.toUpperCase() === 'AVALIABLE') {
            availableTimeSlots.push({
              date: rowAcft.closest('table').children[0].children[0].children[0].childNodes[0].textContent.trim(),
              time: TIME_SLOTS[i],
            })
          }
        });
      });

      return availableTimeSlots
    });

    console.log(new Date(), availableTimeSlots)
    const groupedByDateAvailableTimeSlots = _.groupBy(availableTimeSlots, 'date')
    
    if (Object.keys(groupedAvailableTimeSlots).length > 0) {
      Telegram.sendMessage(
        `<b>${availableTimeSlots.length} novos horários disponíveis:</b>\n\n` +
        Object.keys(groupedByDateAvailableTimeSlots).map((date) =>
          `<b>${date.substr(-2)}/${date.substr(-5, 2)}</b>   ${groupedByDateAvailableTimeSlots[date].map(({ time }) => time).join(', ')}`
        ).join('\n')
      )
    }
  } catch (error) {
    console.log(error)
  } finally {
    await browser.close();
  }
}

jobFn();
// const job = new CronJob('*/1 * * * *', jobFn, null, true, 'America/Sao_Paulo');

// job.start();
