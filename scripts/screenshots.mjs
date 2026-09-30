#!/usr/bin/env node
/**
 * Refresh docs/screenshots/ from a RUNNING interface and API.
 *
 *   SITE_URL=http://127.0.0.1:3000 RUN_ID=<uuid> AGENT_ID=2 node scripts/screenshots.mjs
 *
 * Real data only: the pages are pointed at the API a demo just used, so what
 * the pictures show is what the chain did. A screenshot of the mocked smoke
 * test API would be a picture of a fixture.
 */
import {mkdirSync} from 'node:fs';
import {chromium} from '@playwright/test';

const SITE = (process.env.SITE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const RUN_ID = process.env.RUN_ID;
const AGENT_ID = process.env.AGENT_ID ?? '2';
const OUT = 'docs/screenshots';

if (!RUN_ID) {
  console.error('RUN_ID=<a run uuid> is required — the run page is the one that matters most');
  process.exit(1);
}

const pages = [
  {name: 'demo', path: '/'},
  {name: 'marketplace', path: '/agents', wait: 'text=score'},
  {name: 'agent-profile', path: `/agents/${AGENT_ID}`, wait: 'text=What this score is made of'},
  {name: 'register', path: '/register'},
  {name: 'run', path: `/runs/${RUN_ID}`, wait: 'text=Trace'},
];

mkdirSync(OUT, {recursive: true});
const browser = await chromium.launch();
const context = await browser.newContext({viewport: {width: 1440, height: 900}, colorScheme: 'dark'});
const page = await context.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(`${m.location().url}: ${m.text()}`));

for (const p of pages) {
  await page.goto(`${SITE}${p.path}`, {waitUntil: 'networkidle'});
  if (p.wait) await page.waitForSelector(p.wait, {timeout: 15_000});
  // The badge is fetched on mount; a screenshot before it lands shows "…".
  await page.waitForSelector('text=testnet', {timeout: 15_000});
  await page.screenshot({path: `${OUT}/${p.name}.png`, fullPage: true});
  console.log(`  ✓ ${p.name}.png  ${p.path}`);
}

await browser.close();
if (errors.length) {
  console.error(`\n${errors.length} console error(s):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
