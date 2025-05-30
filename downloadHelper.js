// downloadHelper.js
const fs = require('fs');
const path = require('path');
const DEFAULT_DOWNLOAD_DIR = path.resolve('/Volumes/Extreme Pro', 'ProSoundFxDownload');
const DEFAULT_SELECTOR = 'button.light-blue-icon-button.d-none.d-md-flex';

/** Simple cross-version pause */
function pause(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Polls the download directory until there are no “.crdownload” (partial) files left.
 * @param {string} downloadDir
 * @param {number} interval how often to poll (ms)
 */
async function waitForDownloadsDone(downloadDir, interval = 1000) {
  let inProgress;
  do {
    const files = fs.readdirSync(downloadDir);
    inProgress = files.some(f => f.endsWith('.crdownload'));
    if (inProgress) {
      //   console.log('[DEBUG] Waiting for downloads to finish...');
      await pause(interval);
    }
  } while (inProgress);
}

/**
 * Clicks every download button on the page and then waits for the downloads to complete.
 * @param {import('puppeteer').Page} page 
 * @param {string} downloadDir absolute path where Chrome is saving downloads
 * @param {string} [selector] CSS selector for the buttons
 * @param {number} [delay=1500] ms to wait before/after each click
 */
async function downloadAll(page, downloadDir = DEFAULT_DOWNLOAD_DIR, selector = DEFAULT_SELECTOR, delay = 1500) {
  await page.waitForSelector(selector);
  const buttons = await page.$$(selector);
  for (let i = 0; i < buttons.length; i++) {
    try {
      await page.waitForSelector(selector);
      const buttons = await page.$$(selector);
      await pause(delay);
      await buttons[i].click();
      await pause(delay);

      // Log out a friendly name
      const name = await page.evaluate(el => {
        const href = el.nextElementSibling?.getAttribute('href') || '';
        return href
          ? href
            .split('/')
            .slice(-2)
            .reverse()
            .join('_')
          : 'unknown';
      }, buttons[i]);
      console.log(`→ Started download (${i + 1}/${buttons.length}): ${name}`);
    } catch (err) {
      console.error(`Failed to click button ${i + 1}:`);
      throw err;
    }
  }

  // now wait for Chrome to finish writing ALL files
  console.log('[DEBUG] Waiting for downloads to finish...');
  await waitForDownloadsDone(downloadDir);
  console.log('[DEBUG] All downloads on current page have fully completed.');
}

module.exports = { downloadAll };