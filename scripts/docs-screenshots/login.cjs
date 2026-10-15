const { open, S } = require('./pw-common.cjs'); const fs = require('fs');
(async () => {
  const acc = Object.fromEntries(fs.readFileSync(`${S}/demo-account.txt`, 'utf8').trim().split('\n').map(l => l.split('=')));
  const { browser, ctx, page } = await open();
  await page.goto('http://localhost:3400/auth/login', { waitUntil: 'networkidle' });
  await page.fill('input[type=email]', acc.email);
  await page.fill('input[type=password]', acc.password);
  await page.click('button[type=submit]');
  await page.waitForURL(u => !u.pathname.startsWith('/auth'), { timeout: 60000 });
  await ctx.storageState({ path: `${S}/state.json` });
  console.log('logged in at', page.url());
  await browser.close();
})();
