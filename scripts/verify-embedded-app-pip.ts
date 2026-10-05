import { strict as assert } from 'node:assert';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GeneralStatsPipSummary } from '../embedded-app/src/features/general-stats/components/general-stats-pip-summary';
import type { GameComparison } from '../embedded-app/src/live-stats.types';

const temp = path.resolve('.local/embedded-app-pip/browser-temp');
await mkdir(temp, { recursive: true });
process.env.TEMP = temp;
process.env.TMP = temp;
const cssDirectory = 'embedded-app/dist/client/assets/css';
const cssFile = (await readdir(cssDirectory)).find((name) =>
  name.endsWith('.css'),
);
assert(cssFile);
const css = await readFile(path.join(cssDirectory, cssFile), 'utf8');
const pageSource = await readFile(
  'embedded-app/src/features/general-stats/pages/general-stats-page.tsx',
  'utf8',
);
const getPageClass = (prefix: string) => {
  const marker = `className="${prefix}`;
  const start = pageSource.indexOf(marker);
  assert(start >= 0, `Update the PiP audit for the new ${prefix} page wrapper`);
  const valueStart = start + 'className="'.length;
  const valueEnd = pageSource.indexOf('"', valueStart);
  assert(valueEnd > valueStart);
  return pageSource.slice(valueStart, valueEnd);
};
const frameClass = getPageClass('general-stats-frame');
const focusedClass = getPageClass('general-stats-full');
const makeGame = (name: string): GameComparison => ({
  id: name,
  name,
  defeatedBossCount: 3,
  averageDeathsPerBoss: 11.7,
  averageAttemptsPerBoss: 12.7,
  averageAttemptSeconds: 119,
  averageWinningAttemptSeconds: 133,
  difficultyScore: 1,
  bossHighlights: {
    mostAttempts: { name: 'Boss', attempts: 76, winningAttemptSeconds: 360 },
    longestWinningAttempt: null,
    toughestOverall: null,
  },
});
const untimed = {
  ...makeGame('Long game name with missing timing'),
  averageAttemptSeconds: null,
  averageWinningAttemptSeconds: null,
};
const large = {
  ...makeGame('A very long game name that must not displace metrics'),
  averageAttemptsPerBoss: 123.4,
  averageAttemptSeconds: 1628,
  averageWinningAttemptSeconds: 1628,
};
const scenarios = [
  {
    name: 'normal',
    props: {
      hardestByDeaths: makeGame('Nine Sols'),
      longestWinningAttempt: makeGame('Sekiro'),
      toughestOverall: makeGame('Elden Ring'),
    },
  },
  {
    name: 'untimed',
    props: {
      hardestByDeaths: untimed,
      longestWinningAttempt: untimed,
      toughestOverall: untimed,
    },
  },
  {
    name: 'large',
    props: {
      hardestByDeaths: large,
      longestWinningAttempt: large,
      toughestOverall: large,
    },
  },
  {
    name: 'empty',
    props: {
      hardestByDeaths: null,
      longestWinningAttempt: null,
      toughestOverall: null,
    },
  },
];
const browser = await chromium.launch({
  channel: process.platform === 'win32' ? 'msedge' : undefined,
  headless: true,
});
try {
  const page = await browser.newPage();
  for (const scenario of scenarios) {
    for (const size of [
      { width: 320, height: 180 },
      { width: 280, height: 160 },
      { width: 480, height: 270 },
      { width: 240, height: 135 },
    ]) {
      await page.setViewportSize(size);
      const markup = renderToStaticMarkup(
        createElement(GeneralStatsPipSummary, scenario.props),
      );
      await page.setContent(
        `<html class="dark" data-activity-layout="pip" data-discord-platform="desktop"><head><style>${css}</style></head><body><main class="${frameClass}">${markup}<div class="${focusedClass}">Full chart</div></main></body></html>`,
      );
      const result = await page.evaluate(() => {
        const elements = [
          ...document.querySelectorAll(
            'html, body, main, [role="region"], .general-stats-pip-content, .general-stats-pip-rows, .general-stats-pip-rows > div, .general-stats-pip-metrics',
          ),
        ];
        return elements.map((element) => {
          const bounds = element.getBoundingClientRect();
          return {
            name: element.className,
            top: bounds.top,
            bottom: bounds.bottom,
            left: bounds.left,
            right: bounds.right,
            scrollHeight: element.scrollHeight,
            clientHeight: element.clientHeight,
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
          };
        });
      });
      const typography = await page.evaluate(() =>
        [...document.querySelectorAll('.general-stats-pip-game')].map(
          (element) => {
            const bounds = element.getBoundingClientRect();
            const row = element.closest('.general-stats-pip-rows > div');
            if (!row) throw new Error('Missing PiP row');
            const rowBounds = row.getBoundingClientRect();
            const style = getComputedStyle(element);
            return {
              centerOffset: Math.abs(
                (bounds.left + bounds.right) / 2 -
                  (rowBounds.left + rowBounds.right) / 2,
              ),
              fontFamily: style.fontFamily,
              fontSize: style.fontSize,
              fontWeight: style.fontWeight,
            };
          },
        ),
      );
      for (const game of typography) {
        assert(game.centerOffset <= 1, JSON.stringify({ size, game }));
        assert(
          game.fontFamily.includes('sans-serif'),
          JSON.stringify({ size, game }),
        );
        assert.equal(game.fontSize, typography[0]?.fontSize);
        assert.equal(game.fontWeight, typography[0]?.fontWeight);
      }
      for (const element of result) {
        assert(
          element.top >= 0 && element.bottom <= size.height,
          JSON.stringify({ size, element }),
        );
        assert(
          element.left >= 0 && element.right <= size.width,
          JSON.stringify({ size, element }),
        );
        assert(
          element.scrollHeight <= element.clientHeight + 1,
          JSON.stringify({ size, element }),
        );
        assert(
          element.scrollWidth <= element.clientWidth + 1,
          JSON.stringify({ size, element }),
        );
      }
      await page.screenshot({
        path: `.local/embedded-app-pip/general-stats-${scenario.name}-${size.width}x${size.height}.png`,
      });
      console.log(
        `PiP ${scenario.name} ${size.width}x${size.height}: all rows and metrics fit, no overflow`,
      );
    }
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => {
    document.documentElement.dataset.activityLayout = 'focused';
  });
  assert.equal(
    await page
      .getByRole('region', { name: 'General stats PiP summary' })
      .isVisible(),
    false,
  );
  assert.equal(await page.locator('.general-stats-full').isVisible(), true);
  console.log('Focused layout: full content returns, PiP summary is hidden');
} finally {
  await browser.close();
}
