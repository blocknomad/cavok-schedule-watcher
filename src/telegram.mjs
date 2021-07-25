import axios from "axios";

const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_BOT_ID = process.env.TELEGRAM_BOT_ID;
const TELEGRAM_BOT_KEY = process.env.TELEGRAM_BOT_KEY;

const TelegramAPI = axios.create({
    baseURL: process.env.TELEGRAM_API_URL
});

export default class Telegram {
    static async sendMessage(message) {
        return await TelegramAPI.post(`/bot${TELEGRAM_BOT_ID}:${TELEGRAM_BOT_KEY}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${encodeURIComponent(message)}&parse_mode=HTML`)
    }
}