const L = require('./shoot-lib.cjs');
const only = process.argv.slice(2);
const want = (n) => !only.length || only.includes(n);
const log = (...a) => console.log(...a);
async function canvas(page, wf, z = 1, dx = 70) { await L.go(page, '/workflow/' + wf); await L.closeTestPanel(page); await L.fit(page, z); await page.waitForTimeout(500);
  if (dx) { const b = await page.locator('.react-flow__pane').boundingBox(); const x = b.x + 30, y = b.y + b.height - 40;
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(400); } }
async function nodeDialog(page, wf, name) {
  await canvas(page, wf);
  await page.locator('.react-flow__node').filter({ hasText: name }).first().dblclick({ force: true });
  await page.waitForTimeout(1000);
  return page.locator('[role=dialog]').first();
}
async function settings(page) { await L.go(page, '/workflow/1?view=settings'); await L.closeTestPanel(page); await page.waitForTimeout(800); }
async function sectionCard(page, title) {
  const h = page.locator('main.app-surface').getByText(title, { exact: true }).filter({ visible: true });
  const n = await h.count(); const el = h.nth(n > 1 ? 1 : 0);
  return el.locator('xpath=ancestor::*[contains(@class,"rounded") and (contains(@class,"border") or contains(@class,"card"))][1]');
}
async function newModelCfg(page) { await L.go(page, '/model-configurations'); await page.getByText('Add Configuration').first().click(); await page.waitForTimeout(1500); }
const jobs = {
  dark: {
    'allow-interruption.png': async (p) => { const d = await nodeDialog(p, 1, 'Start Call'); await L.mark(p, d.getByText('Allow Interruption', { exact: true }), { arrow: true }); await L.shot(p, 'allow-interruption.png', { locator: d }); },
    'global-node.png': async (p) => { const d = await nodeDialog(p, 1, 'Start Call'); await L.mark(p, d.getByText('Add Global Prompt', { exact: true }), { arrow: true }); await L.shot(p, 'global-node.png', { locator: d }); },
    'tuner-dograh-workflow-builder.png': async (p) => { await canvas(p, 1); await L.shot(p, 'tuner-dograh-workflow-builder.png'); },
    'noveum-integrations-panel.png': async (p) => { await canvas(p, 3); await p.locator('button:has(svg.lucide-plus)').filter({ hasNotText: /./ }).first().click();
      await p.waitForTimeout(800); const integ = p.getByText('Integrations', { exact: true }).last(); await integ.scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
      await L.shot(p, 'noveum-integrations-panel.png');
      const box = await integ.boundingBox(); const panel = await p.getByText('Add New Node').first().locator('xpath=ancestor::*[contains(@class,"fixed") or contains(@class,"absolute")][1]').boundingBox();
      const x = panel ? panel.x : box.x - 20, w = panel ? panel.width : 380;
      await L.shot(p, 'tuner-integrations-panel.png', { clip: { x, y: Math.max(0, box.y - 16), width: w, height: Math.min(420, 900 - box.y + 16) } }); },
    'noveum-node-configured.png': async (p) => { await canvas(p, 3, 0, 0); await L.shot(p, 'noveum-node-configured.png');
      const n = p.locator('.react-flow__node').filter({ hasText: 'Tuner' }).first(); const b = await n.boundingBox();
      await L.shot(p, 'tuner-node-configured.png', { clip: { x: b.x - 24, y: b.y - 24, width: b.width + 48, height: b.height + 48 } }); },
    'tuner-node-not-configured.png': async (p) => { await canvas(p, 3, 0, 0);
      const n = p.locator('.react-flow__node').filter({ hasText: 'Tuner' }).first(); const b = await n.boundingBox();
      await L.shot(p, 'tuner-node-not-configured.png', { clip: { x: b.x - 24, y: b.y - 24, width: b.width + 48, height: b.height + 48 } }); },
    'tuner-edit-modal.png': async (p) => { const d = await nodeDialog(p, 3, 'Tuner'); await L.shot(p, 'tuner-edit-modal.png', { locator: d }); },
    'noveum-edit-modal.png': async (p) => { await nodeDialog(p, 3, 'Noveum'); await L.shot(p, 'noveum-edit-modal.png'); },
    'create-a-voice-agent.png': async (p) => { await L.go(p, '/workflow/create'); await L.shot(p, 'create-a-voice-agent.png'); },
    'api-keys.png': async (p) => { await L.go(p, '/api-keys');
      await L.shot(p, 'api-keys.png', { locator: await sectionCard(p, 'API Keys') });
      await L.shot(p, 'service-keys.png', { locator: await sectionCard(p, 'Voice AiLunaPro Service Keys') }); },
    'template-variables.png': async (p) => { await L.go(p, '/workflow/1?view=variables'); await L.closeTestPanel(p);
      await L.mark(p, p.getByText('Template Variables', { exact: true }).first(), { arrow: true }); await L.shot(p, 'template-variables.png'); },
    'models_dropdown.png': async (p) => { await newModelCfg(p); await p.getByPlaceholder('Sales assistant').fill('Support - English');
      log('AIL', (await p.locator('main.app-surface').innerText()).slice(600, 1500).replace(/\n+/g, ' | ')); const lbl = p.getByText(/^LLM Model/i).filter({ visible: true }).first(); await lbl.evaluate(e => e.scrollIntoView({ block: 'start' })); await p.mouse.wheel(0, -120); await p.waitForTimeout(500);
      const trig = lbl.locator('xpath=following::button[1]'); await trig.click(); await p.waitForTimeout(700);
      await L.shot(p, 'models_dropdown.png'); await p.keyboard.press('Escape'); await p.waitForTimeout(300); },
    'add_model_manually.png': async (p) => { await newModelCfg(p); await p.getByPlaceholder('Sales assistant').fill('BYOK - OpenAI');
      await p.getByText('BYOK', { exact: true }).click(); await p.waitForTimeout(900);
      const cb = p.getByText('Enter Custom Value', { exact: true }).filter({ visible: true }).first(); await cb.evaluate(e => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
      await L.mark(p, cb, { arrow: true }); await L.shot(p, 'add_model_manually.png'); },
    'add_tts_manually.png': async (p) => { await newModelCfg(p); await p.getByPlaceholder('Sales assistant').fill('BYOK - ElevenLabs');
      await p.getByText('BYOK', { exact: true }).click(); await p.waitForTimeout(900);
      await p.getByText('TTS', { exact: true }).filter({ visible: true }).first().click(); await p.waitForTimeout(900);
      log('TTS text:', (await p.locator('main.app-surface').innerText()).slice(0, 1200).replace(/\n+/g, ' | '));
      const cb = p.getByText('Enter Custom Value', { exact: true }).filter({ visible: true }).first();
      if (await cb.count()) { await cb.evaluate(e => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(300); await L.mark(p, cb, { arrow: true }); }
      await L.shot(p, 'add_tts_manually.png'); },
    'embedding-configurations.png': async (p) => { await newModelCfg(p); await p.getByPlaceholder('Sales assistant').fill('BYOK - knowledge base');
      await p.getByText('BYOK', { exact: true }).click(); await p.waitForTimeout(900);
      const tab = p.getByText('Embedding', { exact: true }).filter({ visible: true }).first(); await tab.click(); await p.waitForTimeout(900); await p.getByText('Enable embeddings', { exact: true }).click(); await p.waitForTimeout(900);
      log('EMB text:', (await p.locator('main.app-surface').innerText()).slice(0, 900).replace(/\n+/g, ' | '));
      await tab.evaluate(e => e.scrollIntoView({ block: 'center' })); await L.mark(p, tab, { arrow: true }); await L.shot(p, 'embedding-configurations.png'); },
    'whatsapp-dograh-credentials.png': async (p) => { await L.go(p, '/telephony-configurations'); await p.getByText('Add configuration').first().click(); await p.waitForTimeout(900);
      const d = p.locator('[role=dialog]').first(); log('TEL DLG', (await d.innerText()).slice(0, 500).replace(/\n+/g, ' | '));
      const sel = d.locator('button[role=combobox], select').first(); if (await sel.count()) { await sel.click().catch(()=>{}); await p.waitForTimeout(400);
        await p.getByRole('option', { name: /WhatsApp/ }).click().catch(async () => { await sel.selectOption({ label: 'WhatsApp' }).catch(()=>{}); }); }
      await p.waitForTimeout(700); await L.shot(p, 'whatsapp-dograh-credentials.png', { locator: d }); },
    'whatsapp-dograh-webhook.png': async (p) => { await L.go(p, '/telephony-configurations/1'); await L.shot(p, 'whatsapp-dograh-webhook.png'); },
    'tool description.png': async (p) => { const tu = require(`${L.S}/seed-out.json`).tools[0]; await L.go(p, '/tools/' + tu);
      log('TOOL', (await p.locator('main.app-surface').innerText()).slice(0, 500).replace(/\n+/g, ' | '));
      const desc = p.getByText('Description', { exact: true }).filter({ visible: true }).first().locator('xpath=following::textarea[1]');
      if (await desc.count()) await L.mark(p, desc, { arrow: true });
      await L.mark(p, p.locator('[data-sidebar] a, nav a').filter({ hasText: /^Tools$/ }).first(), { arrow: true }).catch(()=>{});
      await L.shot(p, 'tool description.png'); await L.clear(p);
      await p.getByRole('tab', { name: 'Parameters' }).click(); await p.waitForTimeout(800); await L.shot(p, 'tool params.png'); },
    'tool attachment.png': async (p) => { const d = await nodeDialog(p, 1, 'Main Agenda and Questions');
      const t = d.getByText('Get order details from order id', { exact: true }).filter({ visible: true }).first(); await t.evaluate(e => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(400);
      await L.mark(p, t, { arrow: true }); await L.shot(p, 'tool attachment.png', { locator: d }); },
    'accessing-traces.png': async (p) => { await L.go(p, '/workflow/1/run/1'); await L.mark(p, p.getByText('View Trace', { exact: true }).first(), { arrow: true });
      await L.shot(p, 'accessing-traces.png'); },
  },
  tools: {},
  light: {
    'node.png': async (p) => { const d = await nodeDialog(p, 1, 'Start Call'); await L.shot(p, 'node.png', { locator: d }); },
    'extracted_variables.png': async (p) => { const d = await nodeDialog(p, 1, 'Main Agenda and Questions');
      await d.getByText('Extraction Prompt', { exact: true }).scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await L.shot(p, 'extracted_variables.png', { locator: d }); },
    'edge.png': async (p) => { await canvas(p, 1); await p.getByText('Move to Main Agenda', { exact: true }).first().dblclick({ force: true }); await p.waitForTimeout(900);
      const d = p.locator('[role=dialog]').first(); log('edge dialogs', await d.count()); await L.shot(p, 'edge.png', (await d.count()) ? { locator: d } : {}); },
    'open-settings.png': async (p) => { await canvas(p, 1); await L.mark(p, p.getByRole('tab', { name: /Settings/ }).first(), { arrow: true }); await L.shot(p, 'open-settings.png'); },
    'add-to-website.png': async (p) => { await settings(p);
      const all = p.getByText('Add to Website', { exact: true }); log('a2w count', await all.count());
      const toc = all.last(); await toc.click(); await p.waitForTimeout(900);
      const btn = p.getByRole('button', { name: /Configure Widget/ }); const sec = btn.locator('xpath=ancestor::*[contains(@class,"rounded-") or contains(@class,"border")][2]');
      await L.mark(p, (await sec.count()) ? sec : btn); await L.mark(p, toc, { arrow: true }); await L.shot(p, 'add-to-website.png'); },
    'save-configurations.png': async (p) => { await settings(p); await p.getByRole('button', { name: /Configure Widget/ }).click(); await p.waitForTimeout(1000);
      const d = p.locator('[role=dialog]').first(); log('EMBED', (await d.innerText()).slice(0, 700).replace(/\n+/g, ' | '));
      const sw = d.getByRole('switch').first(); if (await sw.count() && (await sw.getAttribute('aria-checked')) !== 'true') { await sw.click(); await p.waitForTimeout(500); }
      const bt = d.getByRole('textbox').filter({ hasText: '' });
      const save = d.getByRole('button', { name: /Save Configuration/ }); await save.evaluate(e => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(400); await L.mark(p, save, { arrow: 'left' }); await L.shot(p, 'save-configurations.png', { locator: d });
      await L.clear(p); await save.click(); await p.waitForTimeout(1800);
      await p.waitForTimeout(5000); const code = d.getByText('Embed Code', { exact: false }).first(); await code.evaluate(e => e.scrollIntoView({ block: 'start' })); await p.waitForTimeout(500);
      const card = code.locator('xpath=ancestor::*[contains(@class,"rounded")][1]'); await L.mark(p, (await card.count()) ? card : code);
      await L.shot(p, 'copy-deployment-code.png', { locator: d }); },
  },
};
(async () => {
  for (const theme of ['dark', 'light']) {
    const names = Object.keys(jobs[theme]).filter(want); if (!names.length) continue;
    const { browser, page } = await L.open({ theme });
    for (const n of names) { try { await L.clear(page); await jobs[theme][n](page); } catch (e) { log('FAIL', n, e.message.split('\n')[0].slice(0, 160)); } }
    await browser.close();
  }
})();
