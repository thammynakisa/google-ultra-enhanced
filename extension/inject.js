/* G1 Ultra $0 Pro v4 — DYNAMIC TOKEN INJECT (MAIN world)
 * ═══════════════════════════════════════════════════════
 * UPGRADE v4: Dynamic Token Injection System
 *
 * Giải quyết vấn đề cốt lõi: Token là MẬT MÃ GẮN VỚI SKU.
 * Token 20TB chỉ dùng được cho SKU 20TB, KHÔNG THỂ dùng cho 100GB/2TB.
 *
 * GIẢI PHÁP MỚI:
 * 1. Giữ nguyên cơ chế gốc cho 20TB/30TB (đã có token)
 * 2. HỖ TRỢ NHẬP TOKEN ĐỘNG cho BẤT KỲ gói nào
 *    → User extract token bằng Frida script → paste vào extension
 *    → Extension tự động inject đúng token cho đúng SKU
 * 3. TOKEN REGISTRY: Lưu trữ tokens đã extract cho mọi SKU
 *    → Mỗi lần extract xong, token được lưu vĩnh viễn
 *    → Lần sau chỉ cần chọn gói, không cần extract lại
 *
 * CƠ CHẾ AN TOÀN:
 * - Gói nào → token gói đó (KHÔNG swap SKU)
 * - Google server validate token khớp SKU → không bị ban
 * - Mỗi gói hiển thị đúng tên + giá $0 khi có token
 * ═══════════════════════════════════════════════════════ */
(() => {
  if (window.__G1_PK_HOOKED) return;
  window.__G1_PK_HOOKED = true;

  const PREFIX = "subs:com.google.android.apps.subscriptions.red:";
  const YT_SKU = "g1.youtube_premium_individual_add_on";

  // ══════════════════════════════════════════════════════
  // COMPLETE GOOGLE ONE SKU REGISTRY
  // ══════════════════════════════════════════════════════
  const SKU_REGISTRY = {
    // Ultra tiers (HAVE tokens)
    "g1.play.20tb":    { name: "Ultra 20TB",        hasBuiltinToken: true  },
    "g1.play.ai.pro":  { name: "AI Pro 30TB",       hasBuiltinToken: true  },
    // Standard/Premium tiers (NEED extracted tokens)
    "g1.play.2tb":     { name: "AI Premium 2TB",    hasBuiltinToken: false },
    "g1.play.200gb":   { name: "Premium 200GB",     hasBuiltinToken: false },
    "g1.play.100gb":   { name: "Standard 100GB",    hasBuiltinToken: false },
    "g1.play.30gb":    { name: "Lite 30GB",         hasBuiltinToken: false },
    "g1.play.storage": { name: "Storage Basic",     hasBuiltinToken: false },
  };

  // ══════════════════════════════════════════════════════
  // BUILT-IN TOKENS (extracted via Frida from Play Billing)
  // ══════════════════════════════════════════════════════
  const BUILTIN_TOKENS = {
    // 20TB Ultra
    ultra20tb_12m: "AYrTWi65Jbm3KRubLXLLA3Re29zKibSnRbvAJEPfxEIVs/d57w8vEhsU7hSkSAfGyjZH8B7/5aj5UTlidbsEwUH8aPN2RTA6pKiltA==",
    ultra20tb_6m:  "AYrTWi6lMoHTB2cVb1VC+i3DHvfp1Q9VGblBeF9b1+O8e5+kNws87YdcgNEUJOuHJDp/mitKx1KmBCYurbXIubpM50o4AqgcBB3gMGk85mQ=",
    ultra20tb_3m:  "AYrTWi6sldhCH+REVXA3inXWB+LuAvtnSPYHMvhbqKmv3TRdQPhoynS4ZTLxPEiaNGnaAmDTqliYzrLwJ3Aq49Vi9ktjNP+xcTF5R9Yn1MQ=",
    ultra20tb_1m:  "AYrTWi5QWD5gc0ZxMJHAAUvXbYRFJgI6w5vnF9PKIFg1DFQML36iijrmN5Vum7u9ty2JnHvt9JFLgsfGKwScJcfZaKttqn0hSX4Fnpdn9No=",
    // 30TB AI Pro
    ultra30tb_12m: "AYrTWi51Eo3HG0tq1J6SYr4u3FDCCxb6xSEEWHskaFwSA7Vn4y+Lfqlfy+Lbkx2T/xPi4uCRB71ZIn+weD0kHZsMgS6ogUiZ8hG9SA==",
    ultra30tb_6m:  "AYrTWi5hXUkLGa1e7nBstxl4Z3cUcYWzHF38Xks304ClJj8yVxeFCwDg/pJg82w8w9xHsk8Wl5WNhYKk26LB9besC0kYJ6AvlXapJA==",
    ultra30tb_3m:  "AYrTWi4iJ8AzqZkDL53g/dcS7g93mZgiEBJANI0lOucBiUITWEYqCiwLsIXY7P62rmMWb+wFR4WW9tQlFrskR67oCzzwVHghPSs29w==",
    ultra30tb_1m:  "AYrTWi7nBQ2Zn0z4s+QJOwg9kQRwH3+z+HXpzRqw9IIU4/C48vPvjH32Bub8SHrWq3YX+yI4g1wJgviYiLCobJNqc9DqRd9WZnDdaQ==",
    // YouTube Premium add-on
    yt: "AVbCH/eW4Nfp8KBl0zlm7x9PhaiCvpnqwUuL2D8NFPBQgmM9+HuYS1h2xH5lLWU/BsBj775LK5GqK8UHKqoSzhDDz+PqP3paNesqLU0r9i6XCrYa"
  };

  const SKUS = {
    ultra20tb_12m: "g1.play.20tb", ultra20tb_6m: "g1.play.20tb",
    ultra20tb_3m: "g1.play.20tb",  ultra20tb_1m: "g1.play.20tb",
    ultra30tb_12m: "g1.play.ai.pro", ultra30tb_6m: "g1.play.ai.pro",
    ultra30tb_3m: "g1.play.ai.pro",  ultra30tb_1m: "g1.play.ai.pro",
  };

  // ══════════════════════════════════════════════════════
  // DYNAMIC TOKEN REGISTRY
  // Stores user-extracted tokens for ANY SKU
  // Key format: "sku::period" → token string
  // Example: "g1.play.100gb::12m" → "AYrTWi..."
  // ══════════════════════════════════════════════════════
  let dynamicTokens = {};

  // Load saved dynamic tokens from storage
  function loadDynamicTokens() {
    try {
      const saved = localStorage.getItem("g1_dynamic_tokens");
      if (saved) dynamicTokens = JSON.parse(saved);
    } catch (_) {}
  }

  function saveDynamicTokens() {
    try {
      localStorage.setItem("g1_dynamic_tokens", JSON.stringify(dynamicTokens));
    } catch (_) {}
  }

  // Register a new token for any SKU
  function registerToken(sku, period, token) {
    const key = `${sku}::${period || "default"}`;
    dynamicTokens[key] = token;
    saveDynamicTokens();
    console.log(`[G1 TOKEN REGISTRY] Saved: ${key} (${token.substring(0, 20)}...)`);
  }

  // Get best available token for a SKU
  function getTokenForSku(sku, period) {
    // 1. Check dynamic registry (user-extracted tokens) first
    const exactKey = `${sku}::${period || "default"}`;
    if (dynamicTokens[exactKey]) return dynamicTokens[exactKey];
    // Try any period for this SKU
    for (const [k, v] of Object.entries(dynamicTokens)) {
      if (k.startsWith(sku + "::")) return v;
    }
    // 2. Fall back to built-in tokens
    if (sku === "g1.play.20tb") return BUILTIN_TOKENS.ultra20tb_12m;
    if (sku === "g1.play.ai.pro") return BUILTIN_TOKENS.ultra30tb_12m;
    return null;
  }

  loadDynamicTokens();

  // ══════════════════════════════════════════════════════
  // CURRENT STATE
  // ══════════════════════════════════════════════════════
  let currentTest = null;
  let subId = null;

  function makeItem(skuShort, token) {
    return [[PREFIX + skuShort, 21], null, null, null, 1, [token]];
  }

  function makeCfg(presetId, includeYt, tokenOverride) {
    const sku = SKUS[presetId];
    const tok = (tokenOverride && String(tokenOverride).trim()) || BUILTIN_TOKENS[presetId];
    if (!sku || !tok) return null;
    const full_items = [makeItem(sku, tok), makeItem(YT_SKU, BUILTIN_TOKENS.yt)];
    return { name: "g1pk_" + presetId, presetId, full_items, ear8: null, includeYt: true };
  }

  // ══════════════════════════════════════════════════════
  // v4 DYNAMIC INJECTION — Detect SKU từ payload và inject
  // token ĐÚNG cho SKU đó (không swap!)
  // ══════════════════════════════════════════════════════
  function detectSkuFromPayload(payload) {
    try {
      const str = JSON.stringify(payload);
      for (const sku of Object.keys(SKU_REGISTRY)) {
        if (str.includes(sku)) return sku;
      }
    } catch (_) {}
    return null;
  }

  function buildDynamicItems(sku, token) {
    return [makeItem(sku, token), makeItem(YT_SKU, BUILTIN_TOKENS.yt)];
  }

  // ══════════════════════════════════════════════════════
  // PATCHING ENGINE
  // Priority: currentTest (preset mode) > dynamic token > skip
  // ══════════════════════════════════════════════════════
  function patchNode(node, fullPayload) {
    if (!Array.isArray(node)) return false;

    let items = null;
    let patchSource = "preset";

    if (currentTest && Array.isArray(currentTest.full_items)) {
      // Preset mode: use pre-selected config
      items = currentTest.full_items;
    } else {
      // Dynamic mode: detect SKU from payload and find matching token
      const detectedSku = detectSkuFromPayload(fullPayload || node);
      if (detectedSku) {
        const token = getTokenForSku(detectedSku);
        if (token) {
          items = buildDynamicItems(detectedSku, token);
          patchSource = `dynamic:${detectedSku}`;
        } else {
          console.log(`[G1 ⚠️] SKU ${detectedSku} detected but NO TOKEN available. Use Frida to extract.`);
          return false;
        }
      }
    }

    if (!items) return false;

    let patched = false;

    if (node.length > 12 && Array.isArray(node[12])) {
      if (Array.isArray(node[7]) && Array.isArray(node[7][5]) && node[7][5].length > 0) subId = node[7][5][0];
      node[12] = items;
      const ear8 = currentTest && currentTest.ear8;
      const mode = (ear8 && ear8[1]) || 5;
      if (ear8) node[7] = ear8;
      else if (Array.isArray(node[7]) && Array.isArray(node[7][5]) && node[7][5].length > 0) node[7][1] = mode;
      else if (subId) node[7] = [null, mode, null, null, null, [subId]];
      patched = true;
    }
    if (node.length > 10 && Array.isArray(node[10]) && Array.isArray(node[10][0])) {
      node[10] = [items];
      if (Array.isArray(node[2]) && Array.isArray(node[2][2]) && Array.isArray(node[2][2][8])) {
        node[2][2][8] = [items];
      }
      const ear8 = currentTest && currentTest.ear8;
      if (ear8) node[6] = ear8;
      patched = true;
    }

    if (patched) {
      console.log(`[G1 ✓ ${patchSource}] Node patched → $0.00`);
    }
    return patched;
  }

  function rewriteFreq(bodyStr) {
    if (typeof bodyStr !== "string" || !bodyStr.includes("f.req=") || !bodyStr.includes("Ngbm")) return bodyStr;
    try {
      const parts = bodyStr.split("&");
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].startsWith("f.req=")) {
          const raw = decodeURIComponent(parts[i].slice(6).replace(/\+/g, " "));
          const outer = JSON.parse(raw);
          let changed = false;
          if (Array.isArray(outer)) {
            for (const group of outer) {
              if (!Array.isArray(group)) continue;
              for (const call of group) {
                if (Array.isArray(call) && call[0] === "Ngbm" && typeof call[1] === "string") {
                  const payload = JSON.parse(call[1]);
                  if (Array.isArray(payload)) {
                    if (patchNode(payload[0], payload)) changed = true;
                    if (patchNode(payload[1], payload)) changed = true;
                  }
                  if (changed) call[1] = JSON.stringify(payload);
                }
              }
            }
          }
          if (changed) {
            parts[i] = "f.req=" + encodeURIComponent(JSON.stringify(outer));
            return parts.join("&");
          }
        }
      }
    } catch (e) {}
    return bodyStr;
  }

  // ── XHR Hook ──
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (body) {
    try {
      if (typeof body === "string" && body.includes("Ngbm")) body = rewriteFreq(body);
    } catch (e) {}
    return origSend.call(this, body);
  };

  // ── Fetch Hook ──
  const origFetch = window.fetch;
  window.fetch = function(input, init) {
    try {
      if (init && init.body && typeof init.body === "string" && init.body.includes("Ngbm")) {
        init.body = rewriteFreq(init.body);
      }
    } catch (e) {}
    return origFetch.call(this, input, init);
  };

  // ── URL Rewriter (for iframe src / eacquire) ──
  function rewriteUrl(val) {
    const s = String(val || "");
    if (!s.includes("/eacquire/multiline") || !currentTest) return val;
    try {
      const u = new URL(s, location.origin);
      const earStr = u.searchParams.get("ear");
      if (!earStr) return val;
      const ear = JSON.parse(earStr);
      if (Array.isArray(ear[8]) && Array.isArray(ear[8][5]) && ear[8][5].length > 0) subId = ear[8][5][0];

      const items = currentTest.full_items;
      if (Array.isArray(ear[13]) && Array.isArray(items)) ear[13][0] = items;
      if (Array.isArray(ear[4]) && typeof ear[4][0] === "string" && Array.isArray(items)) {
        try {
          const inner4 = JSON.parse(atob(ear[4][0]));
          if (Array.isArray(inner4) && inner4.length > 8) {
            inner4[8] = [items];
            ear[4][0] = btoa(JSON.stringify(inner4));
          }
        } catch (e4) {}
      }
      const mode = (currentTest.ear8 && currentTest.ear8[1]) || 5;
      if (currentTest.ear8) ear[8] = currentTest.ear8;
      else if (Array.isArray(ear[8]) && Array.isArray(ear[8][5]) && ear[8][5].length > 0) ear[8][1] = mode;
      else if (subId) ear[8] = [null, mode, null, null, null, [subId]];
      ear[24] = null;
      u.searchParams.set("ear", JSON.stringify(ear));
      return u.toString();
    } catch (e) {
      return val;
    }
  }

  if (window.TrustedTypePolicy && TrustedTypePolicy.prototype.createScriptURL) {
    const origCreate = TrustedTypePolicy.prototype.createScriptURL;
    TrustedTypePolicy.prototype.createScriptURL = function (input, ...args) {
      return origCreate.call(this, rewriteUrl(input), ...args);
    };
  }

  const srcDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "src");
  if (srcDesc && srcDesc.set) {
    Object.defineProperty(HTMLIFrameElement.prototype, "src", {
      ...srcDesc,
      set(v) {
        if (typeof v === "string") v = rewriteUrl(v);
        return srcDesc.set.call(this, v);
      }
    });
  }
  const origSetAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, val) {
    if (this instanceof HTMLIFrameElement && String(name).toLowerCase() === "src") val = rewriteUrl(String(val));
    return origSetAttr.call(this, name, val);
  };

  // ══════════════════════════════════════════════════════
  // MESSAGE HANDLING
  // ══════════════════════════════════════════════════════
  function applyCfg(presetId, includeYt, tokenOverride) {
    const cfg = makeCfg(presetId, includeYt, tokenOverride);
    currentTest = cfg;
    window.__G1_PK_STATE = { presetId: presetId || "", mounted: !!currentTest, includeYt: includeYt !== false };
    try {
      window.postMessage({ __g1pk: 1, type: "state", state: window.__G1_PK_STATE }, "*");
    } catch (e) {}
  }

  window.addEventListener("message", (ev) => {
    const d = ev.data;
    if (!d || d.__g1pk !== 1) return;
    if (d.type === "cfg") applyCfg(d.presetId, d.includeYt, d.token);
    // v4: Register dynamic token from content.js
    if (d.type === "registerToken") {
      registerToken(d.sku, d.period, d.token);
      window.postMessage({ __g1pk: 1, type: "tokenRegistered", sku: d.sku, period: d.period }, "*");
    }
    // v4: Inject for specific SKU using dynamic token
    if (d.type === "dynamicInject") {
      const token = getTokenForSku(d.sku, d.period);
      if (token) {
        const items = buildDynamicItems(d.sku, token);
        currentTest = { name: "g1pk_dynamic_" + d.sku, presetId: "dynamic", full_items: items, ear8: null, includeYt: true };
        window.__G1_PK_STATE = { presetId: "dynamic:" + d.sku, mounted: true, includeYt: true };
        window.postMessage({ __g1pk: 1, type: "state", state: window.__G1_PK_STATE }, "*");
        console.log(`[G1 ✓ DYNAMIC] Armed for ${d.sku} → $0.00`);
      } else {
        console.log(`[G1 ⚠️] No token for ${d.sku}. Extract with Frida first.`);
        window.postMessage({ __g1pk: 1, type: "noToken", sku: d.sku }, "*");
      }
    }
    // v4: Get token registry status
    if (d.type === "getRegistry") {
      const registry = {};
      for (const [sku, info] of Object.entries(SKU_REGISTRY)) {
        const token = getTokenForSku(sku);
        registry[sku] = {
          name: info.name,
          hasToken: !!token,
          source: info.hasBuiltinToken ? "builtin" : (token ? "extracted" : "none"),
          tokenPreview: token ? token.substring(0, 25) + "..." : null
        };
      }
      window.postMessage({ __g1pk: 1, type: "registryData", registry }, "*");
    }
    if (d.type === "ping") {
      try {
        window.postMessage({ __g1pk: 1, type: "state", state: window.__G1_PK_STATE || { presetId: "", mounted: false } }, "*");
      } catch (e) {}
    }
  });

  // Expose API for console usage
  window.G1_registerToken = registerToken;
  window.G1_getTokenForSku = getTokenForSku;
  window.G1_dynamicTokens = dynamicTokens;
  window.G1_SKU_REGISTRY = SKU_REGISTRY;

  const attr = document.documentElement.getAttribute("data-g1pk-preset");
  applyCfg(attr || "ultra20tb_12m", true, "");
})();
