// Required Libraries
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const { setTimeout } = require('node:timers/promises');
const { downloadAll } = require('./downloadHelper');
const readline = require('readline');

puppeteer.use(StealthPlugin());

// Paths
const PROGRESS_PATH = path.resolve(__dirname, 'progress.json');
const COOKIE_PATH = path.resolve(__dirname, 'cookies.json');
const DOWNLOAD_PATH = path.resolve('/Volumes/Extreme Pro', 'ProSoundFxDownload');
if (!fs.existsSync(DOWNLOAD_PATH)) fs.mkdirSync(DOWNLOAD_PATH);

const LOGIN_URL = 'https://login.ezproxyberklee.flo.org/login?auth=SSO&url=https://teams.prosoundeffects.com/';

// readline helper
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function askQuestion(promptText) {
    return new Promise(resolve => rl.question(promptText, resolve));
}

function saveProgress(pageNum) {
    const tmp = PROGRESS_PATH + '.tmp';
    const data = JSON.stringify({ lastPage: pageNum }, null, 2);
    return new Promise((res, rej) =>
        fs.writeFile(tmp, data, err => err ? rej(err) : fs.rename(tmp, PROGRESS_PATH, err2 => err2 ? rej(err2) : res()))
    );
}

function loadProgress() {
    return new Promise((res, rej) =>
        fs.readFile(PROGRESS_PATH, 'utf8', (err, data) => {
            if (err) return saveProgress(0).then(() => res(0), rej);
            let parsed;
            try { parsed = JSON.parse(data); }
            catch (_) { return saveProgress(0).then(() => res(0), rej); }
            if (typeof parsed.lastPage === 'number') return res(parsed.lastPage);
            saveProgress(0).then(() => res(0), rej);
        })
    );
}

// Our “worker” now takes all the inputs it needs
async function run(startPage, pageCount, headless) {
    let browser;          // <- declare here so catch() can see it
    const endPage = startPage + pageCount;
    try {
        console.log('[DEBUG] Launching browser...');
        browser = await puppeteer.launch({
            headless,
            defaultViewport: null,
            args: ['--start-maximized'],
        });
        const page = await browser.newPage();

        // ─── set up CDP download ───────────────────────
        const client = await page.target().createCDPSession();
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: DOWNLOAD_PATH,
        });

        // ─── load or save cookies ──────────────────────
        let cookiesLoaded = false;
        if (fs.existsSync(COOKIE_PATH)) {
            try {
                const ck = JSON.parse(fs.readFileSync(COOKIE_PATH, 'utf8'));
                if (Array.isArray(ck)) {
                    console.log('[DEBUG] Setting cookies…');
                    await page.setCookie(...ck);
                    cookiesLoaded = true;
                }
            } catch (e) { console.warn('[WARNING] Cookie load failed:', e); }
        }

        console.log('[DEBUG] Going to login page…');
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });

        if (!cookiesLoaded) {
            console.log('[DEBUG] Please log in manually (60s)…');
            await setTimeout(60000);
            const ck = await page.cookies();
            fs.writeFileSync(COOKIE_PATH, JSON.stringify(ck, null, 2));
            console.log('[DEBUG] Cookies saved. Restart to begin scraping.');
            await browser.close();
            return process.exit(1);
        }

        console.log('[DEBUG] Cookies loaded. Starting scrape…');

        // Get to the first category Page
        await page.waitForSelector('a[href="/Universal-Category-System"]');
        await page.click('a[href="/Universal-Category-System"]');
        await page.waitForSelector('a.mb-2.mt-2.d-block');
        await page.$eval('a.mb-2.mt-2.d-block', el => el.click());

        // Accept EULA
        await page.waitForSelector('button[data-tid="banner-accept"]');
        await page.click('button[data-tid="banner-accept"]');

        // Get to the next page to open up all the possible pages
        await page.waitForSelector('div.pager input');
        const inputHandleBtn = await page.$$('div.pager .grey-bg-icon-square-button');
        if (inputHandleBtn[0]) {
            await inputHandleBtn[0].click();
        } else {
            console.error('Input field not found within the pager div.');
        }

        // Agree with cookie use
        await page.waitForSelector('#hs-eu-confirmation-button');
        await page.click('#hs-eu-confirmation-button');

        // Load the desired page 
        await page.waitForSelector('div.pager input');
        const inputHandle = await page.$('div.pager input');
        if (inputHandle) {
            await inputHandle.focus();
            await setTimeout(1000);
            await inputHandle.click({ clickCount: 3 });
            await setTimeout(1000);
            await page.keyboard.press('Backspace');
            await setTimeout(1000);
            await inputHandle.type(String(startPage));
            await setTimeout(1000);
            await inputHandle.press('Enter');
            await setTimeout(5000);
        } else {
            console.error('Input field not found within the pager div.');
        }

        // ─── the main loop ────────────────────────────
        for (let i = startPage; i < endPage; i++) {
            console.log(`Downloading page ${i}/${endPage - 1}… (out of 10761 total)`);
            await downloadAll(page);
            await saveProgress(i);
            const navButtons = await page.$$('div.pager .grey-bg-icon-square-button');
            await navButtons[1].click();
        }

        // ─── clean shutdown ───────────────────────────
        await browser.close();
        console.log('✅ Done!');
        process.exit(0);

    } catch (err) {
        // 1) Handle Not Logged in Error
        if (
            err.name === 'TimeoutError' &&
            err.message.includes('Waiting for selector `a[href="/Universal-Category-System"]`')
        ) {
            console.error('❌ Account not Logged in, please restart with headless=false to log in');
            // delete the cookies file if it exists
            if (fs.existsSync(COOKIE_PATH)) {
                try {
                    fs.unlinkSync(COOKIE_PATH);
                    console.log('[DEBUG] Deleted cookie file at', COOKIE_PATH);
                } catch (unlinkErr) {
                    console.warn('[WARNING] Failed to delete cookie file:', unlinkErr);
                }
            }
            if (browser) await browser.close().catch(() => { });
            return process.exit(1);
        }

        // 2) Handle disk‐full (ENOSPC) fatal error
        if (err.code === 'ENOSPC') {
            console.error('❌ Disk full: no space left on device. Exiting.');
            if (browser) await browser.close().catch(() => { });
            return process.exit(1);
        }

        // 3) All other errors → retry from next page
        console.error('❌ Error, will restart:', err);
        if (browser) {
            try { await browser.close(); } catch (_) {/*ignore*/ }
        }
        await setTimeout(5000);
        return run(await loadProgress() + 1, pageCount, headless);
    }
}

// top-level kickoff: MUST be inside an async function
; (async () => {
    // 1) ask user
    const headlessAnswer = await askQuestion('Headless? (true/false): ');
    const pageCountAnswer = await askQuestion('Pages to run: ');
    rl.close();

    // 2) validate
    const headlessLower = headlessAnswer.trim().toLowerCase();
    const headless = headlessLower === 'true' ? true
        : headlessLower === 'false' ? false
            : null;
    const pageCount = parseInt(pageCountAnswer, 10);
    if (headless === null || isNaN(pageCount) || pageCount < 1) {
        console.error('❌ Invalid inputs. Exiting.');
        return process.exit(1);
    }

    // 3) figure out where to start
    const lastPage = await loadProgress();
    const startPage = lastPage + 1;

    // 4) run
    run(startPage, pageCount, headless);
})();