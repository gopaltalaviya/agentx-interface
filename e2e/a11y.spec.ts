import AxeBuilder from '@axe-core/playwright';
import {expect, test} from '@playwright/test';

const RUN_ID = '3f2a9c1e-5b7d-4e8f-9a0b-1c2d3e4f5a6b';

/**
 * Every page through axe-core's WCAG 2.1 A/AA rules: contrast, names and
 * labels, ARIA use, landmarks, headings. A serious or critical violation
 * fails the build; the rest are reported so they are seen.
 *
 * Sections that fade in on scroll are forced visible first (reduced motion),
 * so axe measures their real colours rather than a half-faded frame.
 */
const PAGES = [
  '/',
  '/demo',
  '/agents',
  '/agents/1',
  '/register',
  '/runs',
  `/runs/${RUN_ID}`,
  '/status',
  '/docs',
  '/docs/quickstart',
  '/docs/guides',
  '/docs/concepts',
  '/docs/build-an-agent',
  '/docs/mcp',
  '/docs/api',
  '/docs/security',
  '/docs/faq',
];

for (const path of PAGES) {
  test(`accessibility: ${path}`, async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const {violations} = await new AxeBuilder({page})
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    const summary = violations.map(
      (v) =>
        `${v.impact} ${v.id}: ${v.help} — ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(' ')}`,
    );
    if (summary.length) console.warn(`${path}\n  ${summary.join('\n  ')}`);
    expect(blocking, summary.join('\n')).toEqual([]);
  });
}
