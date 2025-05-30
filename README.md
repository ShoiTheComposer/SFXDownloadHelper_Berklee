# Audio Web Scraper

This is only a tool for berklee students that want to download the ProSoundFx Library to their local disk. It tracks the download progress and runs on page based scraping so you can pause anytime. To continue just run the program again and will resume where it's left off.

## Prerequisites

* **Node.js** (v18 or newer)
* **npm** or **yarn**

## Installation

Install all dependencies (reads your `package.json` and optional `package-lock.json`):

```bash
npm install
# or
yarn install
```

## Configuration

1. Open `scraper/downloadHelper.js`.
2. Locate the `DOWNLOAD_DIR` constant and update it to your desired folder path:

   ```js
   const DOWNLOAD_DIR = '/path/to/your/download/folder';
   ```

## Usage

Run the scraper:

```bash
node scraper.js
```

To stop the scraper at any time, press:

```
Ctrl + C
```

---

*Enjoy your automated downloads!*
