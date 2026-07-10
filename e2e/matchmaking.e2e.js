const puppeteer = require('puppeteer');
const assert = require('assert');

const SERVER_URL = process.env.SOCKET_SERVER_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3002';
const HEADLESS = process.env.HEADLESS !== 'false';

async function waitFor(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function clickByText(page, text) {
  await page.evaluate((t) => {
    const result = document.evaluate(
      `//*[@role="button"][contains(., '${t}')]`,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    const el = result.singleNodeValue;
    if (!el) throw new Error(`Button with text "${t}" not found`);
    el.click();
  }, text);
}

async function typeIntoPlaceholder(page, placeholder, value) {
  const input = await page.$(`input[placeholder="${placeholder}"]`);
  assert(input, `Input with placeholder "${placeholder}" not found`);
  await input.click();
  await input.type(value, { delay: 10 });
}

async function captureConsole(page, label) {
  page.on('console', (msg) => {
    console.log(`[${label}] ${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    console.error(`[${label}] pageerror: ${err.message}`);
  });
}

async function run() {
  console.log(`Using server: ${SERVER_URL}`);
  console.log(`Using frontend: ${FRONTEND_URL}`);

  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    console.log('TEST: home page shows connection status and server URL');
    const homePage = await browser.newPage();
    await captureConsole(homePage, 'home');
    await homePage.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle2' });
    await waitFor(1500);
    const homeText = await homePage.evaluate(() => document.body.innerText);
    assert(homeText.includes('Connected') || homeText.includes('Disconnected'), 'Expected connection status on home page');
    assert(homeText.includes(SERVER_URL), `Expected server URL ${SERVER_URL} on home page, got: ${homeText}`);
    console.log('PASS: home page diagnostics visible');
    await homePage.close();

    console.log('TEST: two browser tabs can random matchmake');
    const host = await browser.newPage();
    const guest = await browser.newPage();
    await captureConsole(host, 'host-random');
    await captureConsole(guest, 'guest-random');

    await host.goto(`${FRONTEND_URL}/lobby`, { waitUntil: 'networkidle2' });
    await guest.goto(`${FRONTEND_URL}/lobby`, { waitUntil: 'networkidle2' });
    await waitFor(1500);

    await clickByText(host, 'Random Matchmaking');
    await clickByText(guest, 'Random Matchmaking');
    await waitFor(2500);

    const hostUrl = host.url();
    const guestUrl = guest.url();
    assert(hostUrl.includes('/game/'), `Host did not navigate to game: ${hostUrl}`);
    assert(guestUrl.includes('/game/'), `Guest did not navigate to game: ${guestUrl}`);
    console.log('PASS: random matchmaking works');
    await host.close();
    await guest.close();

    console.log('TEST: room code invite flow');
    const host2 = await browser.newPage();
    const guest2 = await browser.newPage();
    await captureConsole(host2, 'host-invite');
    await captureConsole(guest2, 'guest-invite');

    await host2.goto(`${FRONTEND_URL}/lobby`, { waitUntil: 'networkidle2' });
    await waitFor(1500);
    await clickByText(host2, 'Generate Room Code');
    await waitFor(1500);

    let hostBody = await host2.evaluate(() => document.body.innerText);
    const match = hostBody.match(/Room Code: ([A-Z0-9]{4})/);
    assert(match, `Room code not displayed. Body: ${hostBody}`);
    const roomCode = match[1];
    console.log(`  Generated room code: ${roomCode}`);

    await guest2.goto(`${FRONTEND_URL}/lobby`, { waitUntil: 'networkidle2' });
    await waitFor(1500);
    await typeIntoPlaceholder(guest2, 'Enter room code', roomCode);
    await clickByText(guest2, 'Join');
    await waitFor(4000);

    const host2Url = host2.url();
    const guest2Url = guest2.url();
    console.log(`  Host URL after join: ${host2Url}`);
    console.log(`  Guest URL after join: ${guest2Url}`);

    assert(host2Url.includes('/game/'), `Host did not navigate to game: ${host2Url}`);
    assert(guest2Url.includes('/game/'), `Guest did not navigate to game: ${guest2Url}`);
    console.log('PASS: invite flow works');
    await host2.close();
    await guest2.close();

    console.log('\n✅ All E2E tests passed');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('\n❌ E2E test failed:', err.message);
  process.exit(1);
});
