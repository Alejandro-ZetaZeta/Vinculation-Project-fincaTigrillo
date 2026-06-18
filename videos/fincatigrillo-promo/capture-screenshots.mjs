import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Usage: EMAIL=xxx PASSWORD=yyy node capture-screenshots.mjs');
  process.exit(1);
}

const SCREENSHOTS_DIR = path.join(__dirname, 'assets', 'screenshots');

const pages = [
  { name: 'dashboard', url: '/dashboard' },
  { name: 'animals-list', url: '/dashboard/animals/list' },
  { name: 'vaccines', url: '/dashboard/vaccines' },
  { name: 'sembrios', url: '/dashboard/sembrios' },
  { name: 'reports', url: '/dashboard/reports' },
  { name: 'events', url: '/dashboard/events' },
  { name: 'calculators', url: '/dashboard/calculators' },
  { name: 'students', url: '/dashboard/students' },
  { name: 'activities', url: '/dashboard/activities' },
];

async function capture() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();

  // Login
  console.log('Logging in...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await page.type('input[name="email"]', EMAIL);
  await page.type('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  console.log('Logged in successfully');

  // Capture screenshots
  for (const p of pages) {
    console.log(`Capturing ${p.name}...`);
    await page.goto(`http://localhost:3000${p.url}`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000)); // Wait for animations
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `${p.name}.png`),
      fullPage: false,
    });
  }

  await browser.close();
  console.log('Done!');
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
