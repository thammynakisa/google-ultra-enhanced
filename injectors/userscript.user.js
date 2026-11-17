// ==UserScript==
// @name         G1 Ultra $0 — Token Injection
// @namespace    https://github.com/thammynakisa/google-ultra-enhanced
// @version      3.0
// @description  Inject offer tokens into Google One checkout for $0.00 activation
// @match        https://one.google.com/*
// @match        https://play.google.com/store/account/subscriptions*
// @run-at       document-start
// @grant        none
// ==/UserScript==

/* ═══════════════════════════════════════════════════════════════════
   INJECTION VECTOR #3: Tampermonkey/Violentmonkey/Greasemonkey Userscript
   ═══════════════════════════════════════════════════════════════════
   
   INSTALL:
   1. Install Tampermonkey (Chrome) or Violentmonkey (Firefox/Chrome)
   2. Click "Create new script"
   3. Paste this entire file
   4. Save (Ctrl+S)
   5. Open https://one.google.com/about/plans
   6. Click Subscribe → $0.00
   
   Works on: Chrome, Firefox, Edge, Brave, Opera, Vivaldi
   ═══════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';
  if (window.__G1_USERSCRIPT_INJECTED) return;
  window.__G1_USERSCRIPT_INJECTED = true;

  const TOKENS = {
    ultra20tb_12m: "AYrTWi65Jbm3KRubLXLLA3Re29zKibSnRbvAJEPfxEIVs/d57w8vEhsU7hSkSAfGyjZH8B7/5aj5UTlidbsEwUH8aPN2RTA6pKiltA==",
    ultra20tb_6m: "AYrTWi6lMoHTB2cVb1VC+i3DHvfp1Q9VGblBeF9b1+O8e5+kNws87YdcgNEUJOuHJDp/mitKx1KmBCYurbXIubpM50o4AqgcBB3gMGk85mQ=",
    ultra20tb_3m: "AYrTWi6sldhCH+REVXA3inXWB+LuAvtnSPYHMvhbqKmv3TRdQPhoynS4ZTLxPEiaNGnaAmDTqliYzrLwJ3Aq49Vi9ktjNP+xcTF5R9Yn1MQ=",
    ultra20tb_1m: "AYrTWi5QWD5gc0ZxMJHAAUvXbYRFJgI6w5vnF9PKIFg1DFQML36iijrmN5Vum7u9ty2JnHvt9JFLgsfGKwScJcfZaKttqn0hSX4Fnpdn9No=",
    ultra30tb_12m: "AYrTWi51Eo3HG0tq1J6SYr4u3FDCCxb6xSEEWHskaFwSA7Vn4y+Lfqlfy+Lbkx2T/xPi4uCRB71ZIn+weD0kHZsMgS6ogUiZ8hG9SA==",
    ultra30tb_6m: "AYrTWi5hXUkLGa1e7nBstxl4Z3cUcYWzHF38Xks304ClJj8yVxeFCwDg/pJg82w8w9xHsk8Wl5WNhYKk26LB9besC0kYJ6AvlXapJA==",
    ultra30tb_3m: "AYrTWi4iJ8AzqZkDL53g/dcS7g93mZgiEBJANI0lOucBiUITWEYqCiwLsIXY7P62rmMWb+wFR4WW9tQlFrskR67oCzzwVHghPSs29w==",
    ultra30tb_1m: "AYrTWi7nBQ2Zn0z4s+QJOwg9kQRwH3+z+HXpzRqw9IIU4/C48vPvjH32Bub8SHrWq3YX+yI4g1wJgviYiLCobJNqc9DqRd9WZnDdaQ==",
    YT_FREE: "AVbCH/eW4Nfp8KBl0zlm7x9PhaiCvpnqwUuL2D8NFPBQgmM9+HuYS1h2xH5lLWU/BsBj775LK5GqK8UHKqoSzhDDz+PqP3paNesqLU0r9i6XCrYa"
  };

  // ── Configurable: Change plan here ──
  const PLAN = "ultra20tb_12m"; // Options: ultra20tb_12m/6m/3m/1m, ultra30tb_12m/6m/3m/1m
  const SKU_MAP = {
    ultra20tb: "g1.play.20tb",
    ultra30tb: "g1.play.ai.pro"
  };
  const skuBase = PLAN.startsWith("ultra30") ? "ultra30tb" : "ultra20tb";
  const SKU_FULL = `subs:com.google.android.apps.subscriptions.red:${SKU_MAP[skuBase]}`;
  const YT_SKU = "subs:com.google.android.apps.subscriptions.red:g1.youtube_premium_individual_add_on";
  const ACTIVE_TOKEN = TOKENS[PLAN];

  function makeItem(sku, token) {
    return [[sku, 21], null, null, null, 1, [token]];
  }

  const full_items = [
    makeItem(SKU_FULL, ACTIVE_TOKEN),
    makeItem(YT_SKU, TOKENS.YT_FREE)
  ];

  // ── HOOK XHR ──
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(body) {
    if (typeof body === "string" && body.includes("Ngbm")) {
      try {
        const params = new URLSearchParams(body);
        let freq = params.get("f.req");
        if (freq) {
          const parsed = JSON.parse(freq);
          for (const outer of parsed) {
            if (!Array.isArray(outer)) continue;
            for (const item of outer) {
              if (!Array.isArray(item) || item[0] !== "Ngbm") continue;
              try {
                const inner = JSON.parse(item[1]);
                if (Array.isArray(inner) && inner.length > 12) {
                  inner[12] = full_items;
                  item[1] = JSON.stringify(inner);
                  console.log(`[G1 Userscript ✓] Ngbm patched → ${PLAN}`);
                }
              } catch (_) {}
            }
          }
          params.set("f.req", JSON.stringify(parsed));
          body = params.toString();
        }
      } catch (_) {}
    }
    return origSend.call(this, body);
  };

  // ── HOOK iframe.src ──
  const origSrcDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "src");
  if (origSrcDesc && origSrcDesc.set) {
    Object.defineProperty(HTMLIFrameElement.prototype, "src", {
      set: function(val) {
        if (typeof val === "string" && val.includes("/eacquire/multiline")) {
          try {
            const u = new URL(val);
            const ears = u.searchParams.getAll("ear[]");
            if (ears.length > 13) {
              ears[13] = JSON.stringify(full_items);
              u.searchParams.delete("ear[]");
              ears.forEach(e => u.searchParams.append("ear[]", e));
              val = u.toString();
              console.log("[G1 Userscript ✓] eacquire URL rewritten");
            }
          } catch (_) {}
        }
        origSrcDesc.set.call(this, val);
      },
      get: origSrcDesc.get,
      configurable: true
    });
  }

  // ── HOOK setAttribute ──
  const origSetAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    if (name === "src" && typeof value === "string" && value.includes("/eacquire/multiline")) {
      try {
        const u = new URL(value);
        const ears = u.searchParams.getAll("ear[]");
        if (ears.length > 13) {
          ears[13] = JSON.stringify(full_items);
          u.searchParams.delete("ear[]");
          ears.forEach(e => u.searchParams.append("ear[]", e));
          value = u.toString();
        }
      } catch (_) {}
    }
    return origSetAttr.call(this, name, value);
  };

  // ── HOOK fetch ──
  const origFetch = window.fetch;
  window.fetch = function(input, init) {
    if (init && init.body && typeof init.body === "string" && init.body.includes("Ngbm")) {
      try {
        const params = new URLSearchParams(init.body);
        let freq = params.get("f.req");
        if (freq) {
          const parsed = JSON.parse(freq);
          for (const outer of parsed) {
            if (!Array.isArray(outer)) continue;
            for (const item of outer) {
              if (!Array.isArray(item) || item[0] !== "Ngbm") continue;
              try {
                const inner = JSON.parse(item[1]);
                if (Array.isArray(inner) && inner.length > 12) {
                  inner[12] = full_items;
                  item[1] = JSON.stringify(inner);
                }
              } catch (_) {}
            }
          }
          params.set("f.req", JSON.stringify(parsed));
          init.body = params.toString();
        }
      } catch (_) {}
    }
    return origFetch.call(this, input, init);
  };

  console.log(`[G1 Ultra $0 Userscript] Active — Plan: ${PLAN} + YouTube Premium`);
})();
