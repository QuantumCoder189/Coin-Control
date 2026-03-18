# 🪙 Coin Control

> A clean, beginner-friendly teen budget app built with HTML, CSS, and JavaScript — no frameworks needed.

---

## Features

- **Dashboard** — income/expense overview, running balance, weekly budget tracker
- **Expense Tracking** — add, categorise, and delete expenses
- **Savings Goals** — set a target, contribute, and watch your progress bar grow
- **Charts** — spending by category (doughnut) and income vs expenses (bar)
- **Persistent storage** — all data saved to `localStorage` (survives browser refresh)
- **Responsive** — works on mobile and desktop
- **Beginner-friendly code** — every file is clearly commented

---

## Getting Started

### Run locally (zero setup)

1. Download or clone this repo
2. Open `index.html` in any browser
3. Done — no build step, no server required

```bash
git clone https://github.com/YOUR_USERNAME/coin-control.git
cd coin-control
open index.html   # macOS
# or just double-click index.html on Windows/Linux
```

---

## File Structure

```
coin-control/
├── index.html   — App structure & HTML
├── style.css    — All styles, theming, and responsive layout
├── script.js    — All app logic, localStorage, charts
└── README.md    — This file
```

---

## Deploying

### GitHub Pages (free hosting)

1. Push to a GitHub repository
2. Go to **Settings → Pages → Source → main branch / root**
3. Your app will be live at `https://YOUR_USERNAME.github.io/coin-control`

### Netlify / Vercel (free)

- Drag the folder onto [netlify.com/drop](https://app.netlify.com/drop) or connect your GitHub repo

### Mobile / App Store (via PWA wrapper)

To ship on the App Store or Google Play, wrap the app using one of these tools:

| Tool | Platform | Notes |
|------|----------|-------|
| [Capacitor](https://capacitorjs.com/) | iOS & Android | Free, open-source |
| [Cordova](https://cordova.apache.org/) | iOS & Android | Older, widely used |
| [PWABuilder](https://www.pwabuilder.com/) | iOS, Android, Windows | Easiest — paste your URL |

**Quickest path with PWABuilder:**
1. Host the app on GitHub Pages or Netlify
2. Go to [pwabuilder.com](https://www.pwabuilder.com/)
3. Enter your hosted URL → it generates the app store package for you

---

## Making it a PWA (add to home screen)

Add these two files to enable "Add to Home Screen" on mobile:

**`manifest.json`**
```json
{
  "name": "Coin Control",
  "short_name": "CoinControl",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#0f0f14",
  "theme_color": "#f5c842",
  "icons": [{ "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }]
}
```

**Add to `<head>` in `index.html`:**
```html
<link rel="manifest" href="manifest.json" />
<meta name="theme-color" content="#f5c842" />
```

---

## Tech Stack

- **HTML5** — semantic structure
- **CSS3** — custom properties, CSS Grid, Flexbox, animations
- **Vanilla JavaScript** — no libraries except Chart.js
- **Chart.js 4** — doughnut & bar charts
- **localStorage** — client-side data persistence
- **Google Fonts** — Syne (display) + Manrope (body)

---

## License

MIT — free to use, modify, and share.
