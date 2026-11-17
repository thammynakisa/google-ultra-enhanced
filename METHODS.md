# G1 Ultra $0 Pro v4 — Complete Methods Guide

## 🎯 Giải Pháp Mới v4: Dynamic Token Engine

### Vấn đề cốt lõi
- Token là **mật mã được ký số** bởi Google, gắn chặt với SKU cụ thể
- Token 20TB **KHÔNG THỂ** dùng cho gói 100GB hay 2TB (Google server sẽ từ chối)
- Nếu swap tất cả về 20TB → Google phát hiện → ban tài khoản

### Giải pháp v4: Mỗi gói có token riêng
1. **20TB và 30TB**: Đã có sẵn token (8 tokens built-in)
2. **100GB, 200GB, 2TB, 30GB**: Cần **tự extract token** bằng Frida/ADB
3. Extension tự động lưu và inject đúng token cho đúng SKU

---

## Method 1: Chrome Extension (Token Injection — GỐC)

**Cơ chế**: Hook `XMLHttpRequest.send()` trên `one.google.com`, chặn Ngbm RPC call, patch `payload[0][12]` và `payload[1][12]` với offer token đã extract.

**Cách dùng**:
1. Load extension vào Chrome (`chrome://extensions` → Developer mode → Load unpacked)
2. Mở `https://one.google.com/explore-plan/gemini-advanced`
3. Chọn gói 20TB hoặc 30TB → chọn period (12mo/6mo/3mo/1mo)
4. Click "Subscribe" → checkout hiện $0.00
5. Dùng địa chỉ Oregon 97201 (nút 🇺🇸 OR 97201 auto-fill)

**Gói hỗ trợ**: 20TB (4 periods) + 30TB (4 periods) = 8 presets

---

## Method 2: Dynamic Token Injection (MỚI v4)

**Cơ chế**: Mở rộng Method 1 cho BẤT KỲ gói Google One nào.

**Bước 1 — Extract token bằng Frida:**
```bash
# Cần: Android device (root) + Frida
pip install frida-tools
frida -U -n "com.google.android.apps.subscriptions.red" -l scripts/frida_token_extractor.js
```
- Mở Google One app trên điện thoại
- Duyệt qua các gói → token tự động được in ra console
- Copy token có dấu `★★★ FREE OFFER TOKEN FOUND ★★★`

**Bước 1b — Extract không root (ADB Sniffer):**
```bash
python scripts/adb_token_sniffer.py
```
- Kết nối Android qua USB debugging
- Mở Google One app, duyệt gói
- Token pattern tự động bắt từ logcat

**Bước 2 — Nhập token vào extension:**
1. Mở extension trên `one.google.com`
2. Click **🗝️ Token Registry (All Plans)** mở panel
3. Thấy dashboard tất cả gói: 🟢 = có token, 🔴 = chưa có
4. Chọn SKU từ dropdown (100GB, 200GB, 2TB, 30GB)
5. Paste token đã extract → Click **Save**
6. Token được lưu vĩnh viễn (localStorage + chrome.storage)

**Bước 3 — Inject và checkout:**
1. Trong Token Registry, click **Inject** bên cạnh gói đã có token
2. Status bar hiện: `Armed: Standard 100GB → $0.00`
3. Click Subscribe trên trang Google One
4. Checkout hiện $0.00 cho đúng gói đã chọn

**Ưu điểm**: 
- ✅ Mỗi gói giữ nguyên là gói đó (100GB=$0 as 100GB, không swap)
- ✅ An toàn — Google server validate token khớp SKU → không bị ban
- ✅ Token lưu vĩnh viễn, dùng lại không cần extract lại
- ✅ Hỗ trợ ALL Google One plans (20TB, 30TB, 2TB, 200GB, 100GB, 30GB)

---

## Method 3: Console Injection (Paste vào DevTools)

```javascript
// Paste toàn bộ file injectors/console_inject.js vào Console
// Hoặc paste nhanh:
(async()=>{const s=document.createElement('script');s.src='injectors/console_inject.js';document.head.appendChild(s)})();
```

---

## Method 4: Userscript (Tampermonkey/Violentmonkey)

1. Cài Tampermonkey hoặc Violentmonkey
2. Import file `injectors/userscript.user.js`
3. Tự động chạy khi mở `one.google.com`

---

## Method 5: Bookmarklet (1-Click)

1. Tạo bookmark mới
2. Paste URL từ file `injectors/bookmarklet.js`
3. Click bookmark khi đang ở `one.google.com`

---

## Method 6: CDP Injection (Chrome DevTools Protocol)

```bash
# Khởi động Chrome với remote debugging:
chrome.exe --remote-debugging-port=9222

# Chạy injector:
python injectors/cdp_inject.py
```

---

## Method 7: mitmproxy (Network Interception)

```bash
# Cài mitmproxy
pip install mitmproxy

# Chạy proxy:
mitmproxy -s injectors/proxy_inject.py

# Cấu hình browser dùng proxy localhost:8080
```

---

## Method 8: Alt Entry Points

Các URL entry point thay thế để trigger checkout flow:

| Entry Point | URL |
|---|---|
| Gemini Advanced | `https://one.google.com/explore-plan/gemini-advanced` |
| Gemini AI | `https://one.google.com/ai` |
| Gemini Student | `https://one.google.com/explore-plan/ai-premium-student` |
| Google One Upgrade | `https://one.google.com/upgrade` |
| Play Deep Link | `https://play.google.com/store/account/subscriptions?sku=SKU&package=com.google.android.apps.subscriptions.red&offer=OFFER` |
| Geo Offer | `...&offer=eft-hcm` |
| Campaign Trial | `https://one.google.com/ai?trial=1` |
| Pixel Trial | `https://one.google.com/ai?utm_source=pixel&utm_campaign=pixel_purchase_trial` |
| Google Fi | `https://fi.google.com/about/free-trial` |
| YouTube Premium | `https://www.youtube.com/premium` |

---

## ⚠️ Lưu ý quan trọng

1. **Token hết hạn**: Token extract từ Frida có thể hết hạn sau một thời gian. Nếu checkout fail → extract lại.
2. **Không có promotional offer**: Nếu tài khoản/vùng không có free trial cho một gói → Frida sẽ KHÔNG extract được token cho gói đó (token chỉ tồn tại khi Google cung cấp promotional offer).
3. **Cancel trước 30 ngày**: Luôn cancel subscription trước khi trial hết hạn để tránh bị charge.
4. **Dùng địa chỉ Oregon 97201**: Không có sales tax → $0.00 thực sự là $0.00.
5. **1 tài khoản = 1 lần trial**: Mỗi SKU chỉ free trial 1 lần per Google account.

---

## Cấu trúc Token

```
Token format: AYrTWi[Base64-encoded encrypted blob]
              AVbCH[Base64-encoded] (YouTube Premium)

Tokens are:
- Cryptographically signed by Google
- Bound to specific SKU (g1.play.20tb, g1.play.100gb, etc.)
- Extracted from Google Play Billing Library responses
- Cannot be forged or transferred between SKUs
```

## File Structure

```
extension/
├── manifest.json        # Chrome Extension manifest v3
├── presets.js           # Token database + SKU registry
├── inject.js            # MAIN world injection engine (v4 Dynamic)
├── content.js           # UI panel + Token Registry + Alt Methods
├── play_guard.js        # Payment safety checker
├── background.js        # Service worker
├── popup.html / popup.js # Extension popup
└── icons/               # Extension icons

scripts/
├── frida_token_extractor.js  # Frida script for Android token extraction
└── adb_token_sniffer.py      # ADB logcat token sniffer (no root)

injectors/
├── console_inject.js    # Console paste injection
├── userscript.user.js   # Tampermonkey userscript
├── bookmarklet.js       # 1-click bookmarklet
├── cdp_inject.py        # Chrome DevTools Protocol
└── proxy_inject.py      # mitmproxy addon
```
