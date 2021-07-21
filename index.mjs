import puppeteer from "puppeteer";
import { CronJob } from "cron";
import fs from "fs";

const LOGIN_PAGE_URL = process.env.LOGIN_PAGE_URL;
const SCHEDULE_PAGE_URL = process.env.SCHEDULE_PAGE_URL;

const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;
const TYPE = process.env.TYPE;

const x = async () => {
  let browser;

  try {
    browser = await puppeteer
    .launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })

    const page = await browser.newPage()

    await page.goto(LOGIN_PAGE_URL, { waitUntil: 'load' })

    await page.type("[name=username]", USERNAME);
    await page.type("[name=password]", PASSWORD);
    await page.select("[name=tipo]", TYPE);
    await page.click("[type=submit]");

    await page.goto(SCHEDULE_PAGE_URL, { waitUntil: 'load' });

    const availableTimeSlots = await page.evaluate(() => {
      const TIME_SLOTS = ['08:30', '10:00', '11:30', '13:00', '14:30', '16:00'];
      const EVALUATE_NEXT_N_DAYS = 25;
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
              status: timeSlot.querySelector('p:first-child').innerText.toUpperCase()
            })
          }
        });
      });

      return availableTimeSlots
    });

    console.log(new Date(), availableTimeSlots)

    // fs.writeFile(`./${new Date().getMilliseconds()}.json`, JSON.stringify(ax, null, 2), err => { if (err) throw err });
  } catch (error) {
    console.log(error)
  } finally {
    await browser.close();
  }
}

const job = new CronJob('*/10 * * * *', x, null, true, 'America/Sao_Paulo');

job.start();
