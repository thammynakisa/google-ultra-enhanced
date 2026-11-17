# G1 Ultra $0 Pro v4 — Dynamic Token Engine

> Activate **ANY** Google One plan at $0.00 by injecting free trial offer tokens.

## 🆕 What's New in v4

**Dynamic Token Injection** — The original repo only supports 20TB and 30TB (8 hardcoded tokens). v4 adds:

- **🗝️ Token Registry**: Dashboard showing all Google One plans with token status
- **📱 Frida Token Extractor**: Extract offer tokens for ANY plan from Android device
- **🔌 ADB Token Sniffer**: Extract tokens without rooting (via logcat)
- **💾 Persistent Storage**: Extracted tokens saved permanently, reusable across sessions
- **🎯 SKU-Accurate Injection**: Each plan stays as itself (100GB=$0 as 100GB, NOT swapped to 20TB)

## Supported Plans

| Plan | SKU | Token Status |
|------|-----|-------------|
| Ultra 20TB | `g1.play.20tb` | ✅ Built-in (4 periods) |
| AI Pro 30TB | `g1.play.ai.pro` | ✅ Built-in (4 periods) |
| AI Premium 2TB | `g1.play.2tb` | 🔧 Extract via Frida |
| Premium 200GB | `g1.play.200gb` | 🔧 Extract via Frida |
| Standard 100GB | `g1.play.100gb` | 🔧 Extract via Frida |
| Lite 30GB | `g1.play.30gb` | 🔧 Extract via Frida |
| YouTube Premium | add-on | ✅ Built-in |

## Quick Start

### For 20TB / 30TB (Ready to Use)
1. Load `extension/` folder in `chrome://extensions` (Developer mode)
2. Go to `https://one.google.com/explore-plan/gemini-advanced`
3. Select plan + period in floating panel
4. Click Subscribe → $0.00 checkout

### For Other Plans (100GB, 200GB, 2TB)
1. Extract tokens: `frida -U -n "com.google.android.apps.subscriptions.red" -l scripts/frida_token_extractor.js`
2. Open **🗝️ Token Registry** in extension panel
3. Paste extracted token for target SKU → Save
4. Click **Inject** → Subscribe → $0.00

## 8 Injection Methods

| # | Method | Difficulty |
|---|--------|-----------|
| 1 | Chrome Extension | Easy |
| 2 | Dynamic Token (Frida) | Medium |
| 3 | Console Injection | Easy |
| 4 | Userscript (Tampermonkey) | Easy |
| 5 | Bookmarklet | Easy |
| 6 | CDP (Chrome DevTools Protocol) | Advanced |
| 7 | mitmproxy | Advanced |
| 8 | Alt Entry Points (URLs) | Easy |

See [METHODS.md](METHODS.md) for complete guide.

## How It Works

```
Google One checkout → XMLHttpRequest.send("Ngbm" RPC)
                              ↓
                    inject.js hooks send()
                              ↓
                    Detects Ngbm batch call
                              ↓
                    Patches payload[0][12] with [SKU + offer_token]
                              ↓
                    Google server validates token → $0.00 checkout
```

The offer tokens are cryptographic blobs extracted from Google Play Billing Library's `queryProductDetailsAsync()` response. They represent free trial promotional offers.

## Credits

- Original: [gylive/google-ultra](https://github.com/gylive/google-ultra)
- Enhanced: Dynamic Token Engine, Token Registry, Frida Extractor, 8-Method Architecture

## ⚠️ Disclaimer

For educational and research purposes only. Use at your own risk.
