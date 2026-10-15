const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
const S = process.env.S;
const F = `${S}/fonts/node_modules/@fontsource-variable`;
const FONT_CSS = `
@font-face{font-family:'InterV';src:url('/__al_fonts/inter') format('woff2');font-weight:100 900}
@font-face{font-family:'SoraV';src:url('/__al_fonts/sora') format('woff2');font-weight:100 900}
@font-face{font-family:'GeistV';src:url('/__al_fonts/geist') format('woff2');font-weight:100 900}
@font-face{font-family:'GeistMonoV';src:url('/__al_fonts/geist-mono') format('woff2');font-weight:100 900}
:root,html,body{--font-inter:'InterV';--font-sora:'SoraV';--font-geist-sans:'GeistV';--font-geist-mono:'GeistMonoV';--font-pricing-sans:'InterV';--font-pricing-display:'SoraV'}
nextjs-portal,[data-nextjs-toast],#__next-build-watcher{display:none!important}
`;
const FILES = { inter: 'inter/files/inter-latin-wght-normal.woff2', sora: 'sora/files/sora-latin-wght-normal.woff2',
  geist: 'geist/files/geist-latin-wght-normal.woff2', 'geist-mono': 'geist-mono/files/geist-mono-latin-wght-normal.woff2' };
async function open({ theme = 'dark', locale = 'en', width = 1440, height = 900, scale = 2 } = {}) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale,
    storageState: fs.existsSync(`${S}/state.json`) ? `${S}/state.json` : undefined });
  await ctx.addCookies([{ name: 'al_locale', value: locale, url: 'http://localhost:3400' }]);
  await ctx.route('**/__al_fonts/*', (r) => r.fulfill({ path: path.join(F, FILES[r.request().url().split('/').pop()]), contentType: 'font/woff2' }));
  await ctx.addInitScript(([css, theme]) => {
    try { localStorage.setItem('theme', theme); } catch {}
    const add = () => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); };
    if (document.head) add(); else document.addEventListener('DOMContentLoaded', add);
  }, [FONT_CSS, theme]);
  const page = await ctx.newPage();
  return { browser, ctx, page };
}
module.exports = { open, S };
