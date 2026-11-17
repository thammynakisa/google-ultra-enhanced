# G1 Ultra $0 Pro v3 — 8-Method Activation Engine

> Google One AI Ultra activated at $0.00 via Play Billing offer tokens, Gemini paths, geo-targeted offers, and cross-SKU injection.

## 📁 Structure

```
google-ultra-enhanced/
├── extension/           ← Chrome Extension Pro v3
│   ├── manifest.json    ← MV3, v3.0.0
│   ├── presets.js       ← 8 presets + 9 tokens + ALT_METHODS
│   ├── content.js       ← Floating panel + dark mode + alt methods + cancel timer
│   ├── inject.js        ← MAIN world XHR/iframe hooking (unchanged)
│   ├── play_guard.js    ← Checkout guard (unchanged)
│   ├── popup.html       ← Popup UI with quick methods
│   ├── popup.js         ← Popup logic
│   └── background.js    ← Service worker + tab opener
├── ultra_link_gen.py    ← CLI tool: 8 methods, link gen, cancel timer
├── ultra_links.md       ← Pre-generated links
├── ultra_links.json     ← Pre-generated links (JSON)
└── web/index.html       ← Web UI (5-tab glass dark)
```

## 🔥 6 Injection Vectors

All vectors do the SAME thing: **hook XHR/fetch/iframe → inject offer token → $0.00 checkout**.

| Vector | Method | Needs Install? |
|--------|--------|:--------------:|
| **A** | Chrome Extension (original) | Extension |
| **B** | [Console Injection](injectors/console_inject.js) | Nothing |
| **C** | [Tampermonkey Userscript](injectors/userscript.user.js) | Tampermonkey |
| **D** | [Bookmarklet (1-click)](injectors/bookmarklet.js) | Nothing |
| **E** | [CDP Python Script](injectors/cdp_inject.py) | Python 3 |
| **F** | [mitmproxy Addon](injectors/proxy_inject.py) | mitmproxy |

See [METHODS.md](METHODS.md) for detailed usage instructions.

## 🚀 8 Activation Methods

| # | Method | Type |
|---|--------|------|
| 1 | **Tokenized Play Checkout** | Original — proven |
| 2 | **Play Deep Link + offer=** | URL param preserved |
| 3 | **Geographic eft-hcm** | Geo-targeted offer |
| 4 | **Gemini explore-plan** | 5 valid paths |
| 5 | **Google Fi free trial** | Bundle includes One |
| 6 | **Cross-SKU Token Injection** | 20TB token → any SKU |
| 7 | **YouTube Premium bundle** | Includes One storage |
| 8 | **Play launch_product** | In-app purchase trigger |

## ⚡ Quick Start

### Extension (3 clicks)
1. `chrome://extensions/` → Developer mode ON → Load unpacked
2. Select: `extension/` folder
3. Open [one.google.com/about/plans](https://one.google.com/about/plans) → Select plan → Subscribe at $0.00

### CLI
```bash
python ultra_link_gen.py --plan 20tb --method all
python ultra_link_gen.py --skus
python ultra_link_gen.py --all --save
```

## ⚠️ Important

> **CANCEL before trial ends** to avoid $99.99/month charge!
> Cancel at: [play.google.com/store/account/subscriptions](https://play.google.com/store/account/subscriptions)

## Credits

Based on [gylive/google-ultra](https://github.com/gylive/google-ultra). Enhanced with 8 methods, Pro v3 extension, CLI tool, and deep endpoint probing.
