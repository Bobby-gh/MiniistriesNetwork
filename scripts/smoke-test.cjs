/* Browser smoke test for the Diocese Network app.
 * Drives the real UI in headless Chrome against `npm start` on :3000.
 * Usage: node scripts/smoke-test.cjs [chromePath]
 */
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const os = require("os");
const path = require("path");

const BASE = process.env.APP_URL || "http://localhost:3000";
const CHROME =
  process.argv[2] ||
  process.env.CHROME_PATH ||
  [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(os.homedir(), "AppData/Local/Google/Chrome/Application/chrome.exe"),
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
  ].find((p) => fs.existsSync(p));

if (!CHROME) {
  console.error("Chrome not found — pass a path as the first argument.");
  process.exit(2);
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function clickByText(page, selector, text) {
  const clicked = await page.evaluate(
    (sel, txt) => {
      const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.replace(/\s+/g, " ").includes(txt));
      if (el) {
        el.click();
        return true;
      }
      return false;
    },
    selector,
    text,
  );
  if (!clicked) throw new Error(`Could not find ${selector} containing "${text}"`);
}

/** Click the submit button *inside the open modal dialog* (avoids page-header duplicates). */
function submitModal(page, text) {
  return clickByText(page, '[role="dialog"] button', text);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  // Accept any window.confirm() dialogs before they can block the renderer.
  page.on("dialog", (d) => d.accept().catch(() => {}));

  // Start from a clean demo dataset
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/members`, { waitUntil: "networkidle0" });
  await page.waitForSelector('button');
  await sleep(600);

  const membersBefore = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("diocese-network-db-v1")).members.length,
  );

  // ---- 1. Register a new member through the form ----
  await clickByText(page, "button", "Register member");
  await page.waitForSelector('input[placeholder="e.g. Kwame"]');
  await page.type('input[placeholder="e.g. Kwame"]', "Abigail");
  await page.type('input[placeholder="e.g. Asante"]', "SmokeTest");
  await page.type('input[placeholder="+233 24 000 0000"]', "+233 24 111 2222");
  await submitModal(page, "Register member");
  await sleep(700);

  const afterRegister = await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem("diocese-network-db-v1"));
    const m = db.members.find((x) => x.lastName === "SmokeTest");
    return { count: db.members.length, member: m ? { name: `${m.firstName} ${m.lastName}`, no: m.membershipNo } : null };
  });
  check(
    "Register member persists to the register",
    afterRegister.count === membersBefore + 1 && Boolean(afterRegister.member),
    `${afterRegister.member ? `${afterRegister.member.name} (${afterRegister.member.no})` : "not found"} · ${membersBefore} → ${afterRegister.count}`,
  );

  // ---- 2. Record a dues payment from the Dues page (triggers payment alert) ----
  await page.goto(`${BASE}/dues`, { waitUntil: "networkidle0" });
  await sleep(600);
  const alertsBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("diocese-network-db-v1")).alerts.length);
  await clickByText(page, "button", "Mark paid");
  await page.waitForSelector('form input[type="number"]');
  await submitModal(page, "Record dues");
  await sleep(700);

  const afterDues = await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem("diocese-network-db-v1"));
    return { alerts: db.alerts.length, flash: document.body.innerText.includes("received from") };
  });
  check(
    "Dues payment records + auto-queues payment alert",
    afterDues.alerts === alertsBefore + 1 && afterDues.flash,
    `alerts ${alertsBefore} → ${afterDues.alerts}, confirmation shown: ${afterDues.flash}`,
  );

  // ---- 3. Defaulter alerts from the Defaulters page ----
  await page.goto(`${BASE}/defaulters`, { waitUntil: "networkidle0" });
  await sleep(700);
  const defaulterInfo = await page.evaluate(() => {
    const text = document.body.innerText;
    const m = text.match(/(\d+)\s+defaulter/i);
    return { listed: m ? Number(m[1]) : 0, hasTable: text.includes("Months owed") };
  });
  if (defaulterInfo.listed > 0) {
    await clickByText(page, "button", "Generate alerts");
    await sleep(1200);
    const queued = await page.evaluate(
      () => JSON.parse(localStorage.getItem("diocese-network-db-v1")).alerts.filter((a) => a.kind === "defaulter").length,
    );
    check("Defaulter alerts generated", queued >= defaulterInfo.listed, `${queued} defaulter alert(s) queued`);
  } else {
    check("Defaulter list renders", defaulterInfo.hasTable, "no defaulters in demo data");
  }

  // ---- 4. Attendance save ----
  await page.goto(`${BASE}/attendance`, { waitUntil: "networkidle0" });
  await sleep(600);
  const attendanceBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("diocese-network-db-v1")).attendance.length);
  await clickByText(page, "button", "Mark all present");
  await clickByText(page, "button", "Save attendance");
  await sleep(700);
  const afterAttendance = await page.evaluate(() => ({
    count: JSON.parse(localStorage.getItem("diocese-network-db-v1")).attendance.length,
    flash: document.body.innerText.includes("member(s) marked present"),
  }));
  check(
    "Attendance sheet saves",
    afterAttendance.count > attendanceBefore && afterAttendance.flash,
    `entries ${attendanceBefore} → ${afterAttendance.count}`,
  );

  // ---- 5. Data survives a reload (localStorage persistence) ----
  await page.goto(`${BASE}/members`, { waitUntil: "networkidle0" });
  await sleep(500);
  const persisted = await page.evaluate(() => document.body.innerText.includes("SmokeTest"));
  check("Register persists across reloads", persisted, "new member visible after navigation");

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((err) => {
  console.error("Smoke test crashed:", err.message);
  process.exit(1);
});
