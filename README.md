# Heritage Lake Advisors — Market Timing Simulator

Interactive S&P 500 market timing analysis tool. Compares a buy-and-hold strategy against a configurable timing strategy with tax impact modeling, rolling window analysis, and best/worst day tracking.

**Repository:** [github.com/HeritageLake/Market-Timing](https://github.com/HeritageLake/Market-Timing)

**Live URL:** [https://heritagelake.github.io/Market-Timing/](https://heritagelake.github.io/Market-Timing/)

---

## Project Structure

```
Market-Timing/
├── index.html              ← HTML shell (~2KB) — loads CDN scripts + app files
├── data.json               ← S&P 500 daily prices + dividend yields (~238KB)
├── css/
│   └── styles.css          ← Base styles, slider theming, loading screen
├── js/
│   ├── simulation.js       ← Pure JS: simulate(), rollingAnalysis(), helpers
│   └── app.jsx             ← React components + UI (JSX, transpiled by Babel)
├── images/
│   ├── logo-full.png       ← Light mode logo
│   └── logo-inverse.png    ← Dark mode logo
└── README.md               ← This file
```

### What each file does

| File | Purpose | When to edit |
|------|---------|--------------|
| `index.html` | Loads libraries, bootstraps data fetch | Rarely — only to add/remove CDN scripts |
| `data.json` | 12,900+ daily S&P 500 prices (1975–2026) + yearly dividend yields | When updating price data |
| `js/simulation.js` | All math — simulation engine, rolling analysis, formatting | When changing strategy logic or adding metrics |
| `js/app.jsx` | All visuals — React components, chart config, layout | When changing the UI or adding controls |
| `css/styles.css` | Base CSS — slider styling, loading screen, selection colors | When changing global styling |

---

## Uploading the Project to GitHub (Web Browser Only)

Everything below is done through the GitHub website — no terminal, no Git install, no desktop apps.

### Step 1: Upload the files

1. Go to [github.com/HeritageLake/Market-Timing](https://github.com/HeritageLake/Market-Timing)
2. If the repo is empty, you'll see a setup page — click **"uploading an existing file"** (blue link in the middle of the page). If the repo already has files, click **Add file** → **Upload files** (top right area, above the file list).
3. Unzip the `market-timing-simulator.zip` on your computer
4. **Drag the contents of the folder** into the upload area on GitHub. That means: select `index.html`, `data.json`, `.gitignore`, `README.md`, and the `css/`, `js/`, and `images/` folders — then drag them all at once onto the GitHub upload area. GitHub will preserve the folder structure.
5. Under "Commit changes," type something like: `Initial upload: market timing simulator`
6. Make sure **"Commit directly to the main branch"** is selected
7. Click **Commit changes**

**Important:** Drag the *contents* of the unzipped folder, not the folder itself. You want `index.html` at the root of the repo, not nested inside a subfolder.

### Step 2: Verify the upload

After committing, you should see this file listing at the repo root:

```
css/
images/
js/
.gitignore
README.md
data.json
index.html
```

If `index.html` is nested inside a subfolder (like `market-timing-simulator/index.html`), GitHub Pages won't find it. See Troubleshooting at the bottom if that happened.

### Step 3: Enable GitHub Pages

1. From the repo page, click **Settings** (gear icon in the top menu bar)
2. In the left sidebar, scroll down and click **Pages**
3. Under **"Build and deployment"** → **Source**, select **Deploy from a branch**
4. Under **Branch**, select **main** and leave the folder as **/ (root)**
5. Click **Save**

GitHub will start building the site. This takes 1–2 minutes.

### Step 4: Get your live URL

Stay on the Settings → Pages screen. After a minute or two, refresh the page. You'll see a banner with your live URL:

```
https://heritagelake.github.io/Market-Timing/
```

Click it to verify the simulator loads and works.

**Note on private repos:** GitHub Pages is free for public repos. For private repos, it requires a paid GitHub plan (Pro/Team/Enterprise). If the repo is private and you're on a free plan, you'll need to either make it public or use Netlify instead (see the Alternative Hosting section below).

---

## Making Changes Through the GitHub Website

### Editing a file

1. Navigate to the file (e.g., click `js/` → `app.jsx`)
2. Click the **pencil icon** (top right of the file view)
3. Make your changes
4. Click **Commit changes** (green button, top right)
5. Add a short description of what you changed
6. Click **Commit changes** again to confirm

The live site auto-updates within 1–2 minutes of each commit.

### Uploading replacement files

If you've edited a file on your computer (like updating `data.json` with new price data):

1. Go to the repo page
2. Click **Add file** → **Upload files**
3. Drag the updated file(s) onto the page — GitHub replaces files with the same name and path
4. Commit with a short description

### Checking deployment status

After any commit:

1. Click the **Actions** tab at the top of the repo
2. Look for the most recent "pages build and deployment" workflow run
3. Green checkmark = live. Orange dot = still building.

---

## Sharing With the Team

Once GitHub Pages is live, share the URL. Anyone with the link can use the simulator — no login, no setup required on their end.

To give team members editing access:

1. Go to **Settings** → **Collaborators** (left sidebar, under "Access")
2. Click **Add people**
3. Enter their GitHub username or email
4. They accept the invitation and can edit files through the same web interface

---

## Updating Market Data

The `data.json` file has two sections:

- **`dailyPrices`**: Array of `[YYYYMMDD, close_price]` pairs
- **`dividendYields`**: Object mapping year → annual dividend yield percentage

To add new data: edit `data.json` on GitHub (pencil icon), append new entries to the end of the `dailyPrices` array, and add any new year to `dividendYields`. Or edit the file locally and upload the replacement.

---

## Architecture Notes

**Why Babel is still included:** The app uses JSX syntax (the HTML-like `<Component />` tags in `app.jsx`), which browsers can't run natively. Babel transpiles it on-the-fly. This adds ~748KB to the initial load but keeps the code readable and editable without any build tools. Removing Babel is a future optimization that would require a local build step.

**Debouncing:** Slider inputs use a 200ms debounce hook. The displayed slider value updates instantly, but the expensive simulation recalculates only after you stop dragging. This prevents 30–60 redundant calculations per second.

---

## Alternative: Deploy via Netlify (Free for Private Repos)

If the repo needs to stay private and you don't have a paid GitHub plan:

1. Go to [app.netlify.com](https://app.netlify.com) and sign up (you can use your GitHub login)
2. Click **"Add new site"** → **"Deploy manually"**
3. Drag and drop the unzipped project folder onto the page
4. Done — you get a live URL like `random-name-123.netlify.app`
5. Click **"Site configuration"** → **"Change site name"** to customize it

To auto-deploy from GitHub on every change: choose **"Add new site"** → **"Import an existing project"** → select your GitHub repo. Netlify deploys automatically whenever you commit.

---

## Future Optimizations

- [ ] **Remove Babel runtime** — Pre-compile JSX with a build tool (saves ~748KB per visit)
- [ ] **Web Worker for rolling analysis** — Prevent UI freeze during heavy computation
- [ ] **Compress images** — Convert PNGs to WebP (saves ~50–70%)
- [ ] **Add automated tests** — Unit tests for simulation.js to catch regressions

---

## Troubleshooting

**"Failed to load market data" error on the live site:**
Check that `data.json` is at the repo root (not nested in a subfolder). Go to the repo page and confirm you see `data.json` listed alongside `index.html`.

**Files ended up in a subfolder after upload:**
If your repo shows `market-timing-simulator/index.html` instead of just `index.html` at the root, you dragged the outer folder instead of its contents. The easiest fix: delete the repo contents and re-upload, this time selecting all the files and folders *inside* the unzipped folder and dragging those.

To delete files on GitHub: click into the file, click the three-dot menu (top right), choose **Delete file**, and commit. Or, simpler — delete the entire repo (Settings → scroll to bottom → "Delete this repository"), recreate it, and re-upload correctly.

**Logos not loading:**
Navigate to `images/` in the repo and confirm both PNG files are there. If missing, upload them via **Add file** → **Upload files**.

**Changes not showing on the live site:**
Wait 1–2 minutes after committing. Hard-refresh the page (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac). Check the **Actions** tab to confirm the deploy completed.

**Chart doesn't render / blank page:**
Open the browser console (F12 → Console tab) and look for red errors. Common causes: a syntax error introduced while editing `app.jsx` on GitHub, or CDN scripts blocked by a corporate firewall.
