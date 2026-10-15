const { open, S } = require('./pw-common.cjs');
const BASE = 'http://localhost:3400';
async function go(page, route) {
  await page.goto(BASE + route, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1500);
  // dismiss onboarding hints
  for (const t of ['Close', 'Got it', 'Skip']) {
    const b = page.getByRole('button', { name: t, exact: true });
    if (await b.count()) { await b.first().click().catch(() => {}); await page.waitForTimeout(300); }
  }
}
// Red annotation box (and optional arrow) drawn over an element.
async function mark(page, locator, { arrow = false, pad = 6 } = {}) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('mark: element not visible');
  await page.evaluate(({ box, arrow, pad }) => {
    const d = document.createElement('div');
    d.className = '__mark';
    Object.assign(d.style, { position: 'fixed', left: box.x - pad + 'px', top: box.y - pad + 'px', width: box.width + 2 * pad + 'px',
      height: box.height + 2 * pad + 'px', border: '3px solid #EF4444', borderRadius: '10px', zIndex: 2147483647, pointerEvents: 'none',
      boxShadow: '0 0 0 4px rgba(239,68,68,.18)' });
    document.body.appendChild(d);
    if (arrow) {
      const a = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const right = arrow !== 'left'; const x2 = right ? box.x + box.width + pad + 6 : box.x - pad - 6, y2 = box.y + box.height / 2, x1 = right ? x2 + 90 : x2 - 90, y1 = y2 + 46;
      a.setAttribute('style', 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:2147483647;pointer-events:none');
      a.innerHTML = `<defs><marker id="ah" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#EF4444"/></marker></defs>
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#EF4444" stroke-width="4" stroke-linecap="round" marker-end="url(#ah)"/>`;
      a.classList.add('__mark'); document.body.appendChild(a);
    }
  }, { box, arrow, pad });
}
async function closeTestPanel(page) {
  const x = page.locator('button:right-of(:text("Test Chat"))').filter({ has: page.locator('svg.lucide-x') }).first();
  if (await x.count()) { await x.click().catch(() => {}); await page.waitForTimeout(500); }
}
async function fit(page, zoomIns = 1) {
  // custom controls bottom-left: [+] [-] [fit] [lock]
  const ctrls = page.locator('button:has(svg.lucide-maximize), button:has(svg.lucide-expand), button:has(svg.lucide-maximize-2)');
  if (await ctrls.count()) { await ctrls.first().click().catch(() => {}); await page.waitForTimeout(600); }
  const plus = page.locator('button:has(svg.lucide-minus)').first().locator('xpath=preceding::button[1]');
  for (let i = 0; i < zoomIns; i++) { await plus.click().catch(() => {}); await page.waitForTimeout(350); }
}
async function clear(page) { await page.evaluate(() => document.querySelectorAll('.__mark').forEach(e => e.remove())); }
async function publicUrls(page) {
  await page.evaluate(() => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) { if (n.nodeValue.includes('127.0.0.1:8100')) n.nodeValue = n.nodeValue.replaceAll('http://127.0.0.1:8100', 'https://voice-api.ailunapro.com'); if (n.nodeValue.includes('environment=local')) n.nodeValue = n.nodeValue.replaceAll('environment=local', 'environment=production'); }
    document.querySelectorAll('input,textarea').forEach(i => { if (i.value.includes('127.0.0.1:8100')) i.value = i.value.replaceAll('http://127.0.0.1:8100', 'https://voice-api.ailunapro.com'); });
  });
}
async function shot(page, name, { locator, clip, full } = {}) {
  await publicUrls(page);
  const path = `${S}/shots/${name}`;
  if (locator) await locator.screenshot({ path });
  else await page.screenshot({ path, clip, fullPage: !!full });
  console.log('saved', name);
}
module.exports = { open, go, mark, clear, shot, closeTestPanel, fit, S, BASE };
