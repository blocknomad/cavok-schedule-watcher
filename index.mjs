import puppeteer from "puppeteer";
import fs from "fs";

const LOGIN_PAGE_URL = "";
const SCHEDULE_PAGE_URL = "";

const USERNAME = "";
const PASSWORD = "";
const TYPE = "";

(async () => {
  const browser = await puppeteer
    .launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })
  const page = await browser.newPage()

  await page.goto(LOGIN_PAGE_URL, { waitUntil: 'load' })

  await page.type("[name=username]", USERNAME);
  await page.type("[name=password]", PASSWORD);
  await page.select("[name=tipo]", TYPE);
  await page.click("[type=submit]");

  await page.goto(SCHEDULE_PAGE_URL, { waitUntil: 'load' });

  const ax = await page.evaluate(() => {
    const TIME_SLOTS = ['08:30', '10:00', '11:30', '13:00', '14:30', '16:00'];

    // get schedule rows
    const rows = document.querySelectorAll('td:first-child strong');
    
    // filter next 14 days C150 schedule rows  
    const rowsC150 = [...rows].filter(element => element.innerText === 'C150-L').slice(0, 25);
    const availableTimeSlots = [];

    rowsC150.map(rowC150 => {
      // get time slots from 8:30 to 16:00
      const timeSlots = [...rowC150.parentElement.parentElement.parentElement.children].slice(2, -2);

      // find available time slots
      timeSlots.map((timeSlot, i) => {
        if (timeSlot.querySelector('p:first-child').innerText.toUpperCase() === 'AVALIABLE') {
          availableTimeSlots.push({
            date: rowC150.closest('table').children[0].children[0].children[0].childNodes[0].textContent.trim(),
            time: TIME_SLOTS[i],
            status: timeSlot.querySelector('p:first-child').innerText.toUpperCase()
          })
        }
      });
    });

    return availableTimeSlots
  });

  console.log('ax', ax)
  // fs.writeFile(`./${new Date().getMilliseconds()}.json`, JSON.stringify(ax, null, 2), err => { if (err) throw err });
})()
