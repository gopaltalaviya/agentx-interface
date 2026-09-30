import {expect, test, type Page} from '@playwright/test';

const RUN_ID = '3f2a9c1e-5b7d-4e8f-9a0b-1c2d3e4f5a6b';

/** Collect console errors — a CSP violation surfaces only as one of these. */
function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

test('the landing page makes its case and leads to the demo and the docs', async ({page}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', {level: 1})).toContainText('trust layer for the agent economy');
  await expect(page.getByRole('link', {name: /Watch agents pay each other/})).toHaveAttribute(
    'href',
    '/demo',
  );
  await expect(page.getByRole('link', {name: 'Read the docs'})).toHaveAttribute('href', '/docs');
  // Live figures come from the API, and the deployed escrow links to the explorer.
  await expect(page.getByText('Jobs settled on chain')).toBeVisible();
  await expect(page.getByRole('link', {name: /TaskEscrow/})).toHaveAttribute('href', /^https:\/\//);
  // The FAQ opens.
  await page.getByText('Is this real money?').click();
  await expect(page.getByText(/Monad testnet with a test stablecoin/)).toBeVisible();
});

test('every docs page renders, and the sidebar marks where you are', async ({page}) => {
  for (const [path, title] of [
    ['/docs', 'Introduction'],
    ['/docs/quickstart', 'Quickstart'],
    ['/docs/concepts', 'How it works'],
    ['/docs/build-an-agent', 'Build an agent'],
    ['/docs/mcp', 'MCP server'],
    ['/docs/api', 'HTTP API'],
    ['/docs/security', 'Security model'],
    ['/docs/faq', 'FAQ'],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole('heading', {level: 1})).toHaveText(title);
    await expect(
      page
        .getByRole('navigation', {name: 'Documentation'})
        .first()
        .getByRole('link', {name: title, exact: true}),
    ).toHaveAttribute('aria-current', 'page');
  }
});

test('the demo page renders with labelled inputs and the network badge', async ({page}) => {
  const errors = watchConsole(page);
  await page.goto('/demo');
  await expect(page.getByRole('heading', {level: 1})).toContainText('One sentence');
  await expect(page.getByLabel('Goal')).toBeVisible();
  await expect(page.getByLabel('Orchestrator API key')).toBeVisible();
  await expect(page.getByText('Monad Testnet · testnet')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the marketplace ranks, filters, and labels an unproven agent', async ({page}) => {
  const errors = watchConsole(page);
  await page.goto('/agents');
  await expect(page.getByText('ResearchBot')).toBeVisible();
  await expect(page.getByText('unproven — no settled jobs yet')).toBeVisible();

  const quality = page.getByRole('button', {name: 'Quality'});
  await quality.click();
  await expect(quality).toHaveAttribute('aria-pressed', 'true');

  await page.getByLabel('Filter by capability').fill('nothing-offers-this');
  await expect(page.getByText(/No agent matches/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('an agent profile renders, and a hostile explorer URL is not a link', async ({page}) => {
  const errors = watchConsole(page);
  await page.goto('/agents/1');
  await expect(page.getByRole('heading', {name: 'ResearchBot'})).toBeVisible();
  await expect(page.getByRole('link', {name: /0x0{39}2/})).toHaveAttribute(
    'href',
    /^https:\/\/testnet\.monadexplorer\.com\//,
  );

  await expect(page.getByText('#42')).toBeVisible(); // its ERC-8004 identity
  await page.goto('/agents/2');
  await expect(page.getByRole('heading', {name: 'Unproven'})).toBeVisible();
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a malformed agent id is a real 404', async ({page}) => {
  const res = await page.goto('/agents/abc');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', {name: 'Not found'})).toBeVisible();
});

test('a run renders its answer, steps and trace, with money as money', async ({page}) => {
  const errors = watchConsole(page);
  await page.goto(`/runs/${RUN_ID}`);
  await expect(page.getByRole('heading', {level: 1})).toContainText('Research ETH/USDC');
  await expect(page.getByText('Liquidity is thin; wait.')).toBeVisible();
  // The trace's total, formatted from base units with the token's decimals.
  await expect(
    page.getByRole('list', {name: 'Run trace'}).getByText('0.02 USDC', {exact: true}).last(),
  ).toBeVisible();
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a serial run id names nothing', async ({page}) => {
  const res = await page.goto('/runs/17');
  expect(res?.status()).toBe(404);
});

test('the run history needs a key and then lists runs', async ({page}) => {
  const errors = watchConsole(page);
  await page.goto('/runs');
  await page.getByLabel('Orchestrator API key').fill('ax_0123456789abcdef_secret');
  await page.getByRole('button', {name: 'Show runs'}).click();
  await expect(page.getByRole('link', {name: /Research ETH\/USDC/})).toHaveAttribute(
    'href',
    `/runs/${RUN_ID}`,
  );
  expect(errors).toEqual([]);
});

test('register explains itself without a wallet and validates before signing', async ({page}) => {
  const errors = watchConsole(page);
  await page.goto('/register');
  await expect(page.getByText(/No browser wallet found/)).toBeVisible();
  await page.getByLabel(/Payout wallet/).fill('0x1234');
  await expect(page.getByText(/Not an address/)).toBeVisible();
  await page.getByLabel(/Price per task/).fill('500');
  await expect(page.getByText(/Below the escrow minimum of 0.01 USDC/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the status page says what is degraded, in words', async ({page}) => {
  await page.goto('/status');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('System status');
  await expect(page.getByText('Partially degraded')).toBeVisible();
  const indexer = page.getByRole('listitem').filter({hasText: 'Indexer'});
  await expect(indexer.getByText('Degraded')).toBeVisible();
  await expect(page.getByText('400 blocks')).toBeVisible();
});

test('the menu works at phone width, and no page scrolls sideways', async ({page}) => {
  await page.setViewportSize({width: 375, height: 800});
  for (const path of [
    '/',
    '/demo',
    '/agents',
    '/agents/1',
    '/register',
    '/runs',
    `/runs/${RUN_ID}`,
    '/status',
    '/docs',
    '/docs/concepts',
    '/docs/api',
  ]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
  }
  await page.goto('/');
  const toggle = page.getByRole('button', {name: 'Open menu'});
  await toggle.click();
  await expect(page.locator('#mobile-nav').getByRole('link', {name: 'Marketplace'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobile-nav')).toBeHidden();
});

/** Motion off must lose nothing: sections that fade in on scroll are simply shown. */
test('with reduced motion, every revealed section is fully visible without scrolling', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/');
  const problem = page.getByRole('heading', {name: /Agents can reason/});
  await expect(problem).toBeAttached();
  const hidden = await page.evaluate(
    () =>
      [...document.querySelectorAll('[data-reveal]')].filter((el) => getComputedStyle(el).opacity !== '1')
        .length,
  );
  expect(hidden).toBe(0);
});

test('every response carries the security headers', async ({request}) => {
  const res = await request.get('/');
  const headers = res.headers();
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['content-security-policy']).toContain(
    `http://127.0.0.1:${process.env['MOCK_API_PORT'] ?? 8787}`,
  );
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['x-powered-by']).toBeUndefined();
});
