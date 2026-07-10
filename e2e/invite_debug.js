const puppeteer = require('puppeteer');
(async () => {
  const b = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const h = await b.newPage();
  const g = await b.newPage();
  h.on('console', m => console.log('[h]', m.type(), m.text()));
  g.on('console', m => console.log('[g]', m.type(), m.text()));

  await h.goto('http://localhost:3002/lobby', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  await h.evaluate(() => {
    const r = document.evaluate('//*[contains(text(), "Generate Room Code")]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    r.singleNodeValue.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  const body = await h.evaluate(() => document.body.innerText);
  const code = body.match(/Room Code: ([A-Z0-9]{4})/)[1];
  console.log('code', code);

  await g.goto('http://localhost:3002/lobby', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  const input = await g.$('input[placeholder="Enter room code"]');
  await input.type(code, { delay: 10 });
  await g.evaluate(() => {
    const r = document.evaluate('//*[contains(text(), "Join")]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    r.singleNodeValue.click();
  });
  await new Promise(r => setTimeout(r, 4000));
  console.log('h url', h.url());
  console.log('g url', g.url());
  await b.close();
})();
