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

1. Open `/scraper.js` and `/downloadHelper.js`.
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
## Running in your system terminal

1. **Open your terminal app** (e.g., macOS Terminal, iTerm, PowerShell, cmd.exe, Linux terminal)
2. **Navigate to the project folder**:
   ```bash
   cd /path/to/your/audio-web-scraper
   ```
3. **Install dependencies** (if you haven’t already):
   ```bash
   npm install   # or yarn install
   ```
4. **Start the scraper**:
   ```bash
   node scraper.js
   ```
5. **Cancel** with:
   ```bash
   Ctrl + C
   ```
---
*Enjoy your automated downloads!*
