import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import { chromium } from "playwright";

// ================== ENV VARIABLES ==================
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const EVENT_URL = process.env.EVENT_URL;

// ================== CONFIG ==================
const CHECK_INTERVAL = 60 * 1000; // 60 seconds
// const CHECK_INTERVAL = 30 * 1000; // optional

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

let ticketsLive = false;
let browser;

// ================== CORE FUNCTION ==================
async function checkTickets() {
  try {
    console.log("🔍 Checking BookMyShow page...");

    // Launch browser only once
    if (!browser) {
      browser = await chromium.launch({ headless: true });
    }

    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    });

    // IMPORTANT: DO NOT use networkidle on BookMyShow
    await page.goto(EVENT_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Allow JS to render booking UI
    await page.waitForTimeout(5000);

    // ===== REAL BOOKMYSHOW DETECTION (NO FALSE POSITIVES) =====
    const status = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();

      // Explicit NOT LIVE condition
      if (text.includes("coming soon")) {
        return "NOT_LIVE";
      }

      // LIVE signals seen in real BookMyShow UI
      const liveSignals = [
        "login to book",
        "book now",
        "₹",
        "available",
        "filling fast",
      ];

      for (const signal of liveSignals) {
        if (text.includes(signal)) {
          return "LIVE";
        }
      }

      return "NOT_LIVE";
    });

    await page.close();

    // ================== ALERT LOGIC ==================
    if (status === "LIVE" && !ticketsLive) {
      ticketsLive = true;

      await bot.sendMessage(
        CHAT_ID,
        `🚨 *TICKETS LIVE!*\n\n🎟️ Booking has started on BookMyShow.\n\n🔗 ${EVENT_URL}`,
        { parse_mode: "Markdown" },
      );

      console.log("✅ REAL TICKETS AVAILABLE — ALERT SENT");
    }

    if (status === "NOT_LIVE") {
      ticketsLive = false;
      console.log("⏳ Tickets not live yet");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// ================== START ==================
console.log("🤖 Bot started. Monitoring tickets...");
checkTickets();
setInterval(checkTickets, CHECK_INTERVAL);
