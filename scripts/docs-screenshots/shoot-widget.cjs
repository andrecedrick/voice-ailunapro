const L = require('./shoot-lib.cjs'); const { execSync } = require('child_process');
(async () => {
  for (const [mode, file] of [['floating', 'floating-widget-example.png'], ['inline', 'inline-widget-example.png'], ['headless', 'headless-widget-example.png']]) {
    execSync(`psql -h 127.0.0.1 -p 5433 -U synth -d voice -qc "update embed_tokens set settings = (settings::jsonb || '{\\"embedMode\\":\\"${mode}\\",\\"buttonText\\":\\"Talk to Emma\\",\\"buttonColor\\":\\"#7C3AED\\",\\"containerId\\":\\"ailunapro-inline-container\\"}'::jsonb)::json"`);
    const { browser, page } = await L.open({ theme: 'light' });
    const errs = []; page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
    await page.goto(`http://127.0.0.1:3500/${mode}.html`, { waitUntil: 'networkidle' }); await page.waitForTimeout(3000);
    await page.screenshot({ path: `${L.S}/shots/${file}` }); console.log('saved', file, errs.slice(0, 2));
    await browser.close();
  }
})();
