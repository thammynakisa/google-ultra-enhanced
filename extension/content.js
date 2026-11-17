/* G1 Ultra $0 Pro v3 — Content Script (Enhanced) */
(() => {
  if (window.__G1_ZERO_COST_EXT_LOADED && document.getElementById("g1-zero-cost-floating-panel")) return;
  window.__G1_ZERO_COST_EXT_LOADED = true;

  const PRESETS = window.G1_ZERO_COST_PRESETS || [];
  const ALT_METHODS = window.G1_ALT_METHODS || {};
  const PK_URL = window.G1_PK_URL || "https://t.me/pk_oa";
  const ALIAS = window.G1_PK_ALIAS || {};
  const PERIODS = [12, 6, 3, 1];
  let activePreset = PRESETS.find((p) => p.id === "ultra20tb_12m") || PRESETS[0] || null;
  let darkMode = false;

  function findPreset(presetId) {
    const id = ALIAS[presetId] || presetId;
    return PRESETS.find((p) => p.id === id) || null;
  }

  function presetBy(skuKey, months) {
    return PRESETS.find((p) => p.skuKey === skuKey && p.months === months) || null;
  }

  const CFG = window.G1_ZERO_COST_CFG || { includeYt: true };
  const TOKEN_PREF_KEY = "g1ZcTokenOverrides";
  CFG.includeYt = true;

  /* ═══════════════════════════════════════════
     STYLES — Light + Dark mode support
     ═══════════════════════════════════════════ */
  const CSS = `
#g1-zero-cost-floating-panel{position:fixed;right:14px;bottom:14px;z-index:2147483646;width:290px;color:#1c2a3a;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;font-size:12px;border-radius:16px;overflow:hidden;background:linear-gradient(180deg,#ffffff 0%,#f3f8fd 100%);border:1px solid #d7e6f2;box-shadow:0 16px 36px rgba(32,64,96,.16);transition:background .2s,color .2s,border-color .2s}
#g1-zero-cost-floating-panel.g1-dark{background:linear-gradient(180deg,#1a1d23 0%,#12151a 100%);border-color:#2d3340;color:#d0d8e0}
#g1-zero-cost-floating-panel.g1-zc-min{width:196px}
#g1-zero-cost-floating-panel.g1-zc-dragging{user-select:none}
#g1-zc-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;background:#f7fbff;cursor:grab;user-select:none;touch-action:none;border-bottom:1px solid #e6eef6}
.g1-dark #g1-zc-header{background:#1e222a;border-color:#2d3340}
#g1-zero-cost-floating-panel.g1-zc-dragging #g1-zc-header{cursor:grabbing}
#g1-zc-brand{display:flex;align-items:center;gap:7px;min-width:0}
#g1-zc-logo{flex:0 0 auto;width:28px;height:28px;border-radius:8px;object-fit:cover;display:block;background:#eef8ff}
#g1-zc-titles{min-width:0}
#g1-zc-titles b{display:block;font-size:12px;line-height:1.15;color:#102033;font-weight:700;letter-spacing:.2px}
.g1-dark #g1-zc-titles b{color:#e8edf2}
#g1-zc-titles span{display:block;font-size:10px;color:#5f7388;margin-top:1px}
.g1-dark #g1-zc-titles span{color:#7a8a9e}
#g1-zc-toggle,#g1-zc-dark-toggle{background:transparent;border:0;color:#6b8094;font-size:16px;cursor:pointer;line-height:1;padding:0 2px;flex:0 0 auto}
.g1-dark #g1-zc-toggle,.g1-dark #g1-zc-dark-toggle{color:#8a9ab0}
#g1-zc-body{padding:8px 10px 9px;display:flex;flex-direction:column;gap:7px}
#g1-zc-status{padding:5px 8px;border-radius:8px;border:1px solid #c7e7f7;background:#eef8ff;color:#176a8f;font-size:11px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.g1-dark #g1-zc-status{background:#1a2530;border-color:#264050;color:#5cb8d8}
#g1-zc-sku-row{display:grid;grid-template-columns:1fr 1fr;gap:5px}
#g1-zc-period-row{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}
.g1-zc-chip{appearance:none;border:1px solid #d5e3ef;background:#fff;color:#1c2a3a;border-radius:10px;padding:7px 0;cursor:pointer;text-align:center;font-size:12px;font-weight:700;transition:border-color .15s,background .15s}
.g1-dark .g1-zc-chip{background:#1e222a;border-color:#2d3340;color:#c0cad4}
.g1-zc-chip:hover{border-color:#2AABEE;background:#f3faff}
.g1-dark .g1-zc-chip:hover{background:#1e2a35;border-color:#2AABEE}
.g1-zc-chip.is-on{border-color:#2AABEE;background:#e7f6ff;color:#0b6fa0;box-shadow:0 0 0 1px rgba(42,171,238,.18) inset}
.g1-dark .g1-zc-chip.is-on{background:#112535;color:#50b8e8;border-color:#2AABEE}
.g1-zc-adv{display:none}
#g1-zc-token-input{width:100%;height:28px;padding:0 8px;border-radius:8px;border:1px solid #d5e3ef;background:#fff;color:#1c2a3a;font-size:11px;outline:none}
.g1-dark #g1-zc-token-input{background:#1a1d23;border-color:#2d3340;color:#d0d8e0}
#g1-zc-token-input:focus{border-color:#2AABEE}
#g1-zc-foot{display:flex;gap:5px}
#g1-zc-foot button,#g1-zc-foot a{flex:1;height:28px;border-radius:8px;border:1px solid #d5e3ef;background:#fff;color:#33485c;font-size:11px;display:flex;align-items:center;justify-content:center;text-decoration:none;cursor:pointer}
.g1-dark #g1-zc-foot button,.g1-dark #g1-zc-foot a{background:#1e222a;border-color:#2d3340;color:#8a9ab0}
#g1-zc-pk{border-color:#b7e4f8!important;color:#1480b0!important;background:#f3fbff!important}
.g1-dark #g1-zc-pk{background:#112535!important;border-color:#1a4a65!important;color:#50b8e8!important}
#g1-zc-alt-section{border-top:1px solid #e6eef6;padding-top:7px;margin-top:2px}
.g1-dark #g1-zc-alt-section{border-color:#2d3340}
#g1-zc-alt-toggle{width:100%;background:transparent;border:1px solid #d5e3ef;color:#33485c;border-radius:8px;padding:5px 8px;cursor:pointer;font-size:11px;font-weight:600;text-align:left;display:flex;justify-content:space-between;align-items:center}
.g1-dark #g1-zc-alt-toggle{border-color:#2d3340;color:#8a9ab0}
#g1-zc-alt-toggle:hover{border-color:#2AABEE}
#g1-zc-alt-body{display:none;padding-top:6px;display:flex;flex-direction:column;gap:4px}
#g1-zc-alt-body.g1-alt-open{display:flex}
.g1-alt-btn{appearance:none;border:1px solid #d5e3ef;background:#fff;color:#1c2a3a;border-radius:8px;padding:6px 8px;cursor:pointer;font-size:11px;text-align:left;transition:border-color .15s,background .15s}
.g1-dark .g1-alt-btn{background:#1e222a;border-color:#2d3340;color:#c0cad4}
.g1-alt-btn:hover{border-color:#2AABEE;background:#f3faff}
.g1-dark .g1-alt-btn:hover{background:#1e2a35;border-color:#2AABEE}
#g1-zc-cancel-info{font-size:10px;color:#5f7388;padding:3px 0;text-align:center}
.g1-dark #g1-zc-cancel-info{color:#6a7a8e}
`;

  function injectStyles() {
    if (document.getElementById("g1-zc-style")) return;
    const style = document.createElement("style");
    style.id = "g1-zc-style";
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function refreshPresetUi() {
    const sku = (activePreset && activePreset.skuKey) || "20tb";
    const months = (activePreset && activePreset.months) || 12;
    document.querySelectorAll("#g1-zc-sku-row .g1-zc-chip").forEach((b) => {
      b.classList.toggle("is-on", b.dataset.sku === sku);
    });
    document.querySelectorAll("#g1-zc-period-row .g1-zc-chip").forEach((b) => {
      b.classList.toggle("is-on", Number(b.dataset.months) === months);
    });
    fillTokenInput();
    updateCancelInfo();
  }

  function fillTokenInput() {
    const tokenInput = document.getElementById("g1-zc-token-input");
    if (!tokenInput) return;
    const preset = activePreset;
    tokenInput.value = preset && preset.token ? preset.token : "";
    tokenInput.placeholder = preset && preset.months === 12 && !preset.hasToken ? `${preset.chip} paste token` : "Optional: override token";
  }

  function saveTokenOverride(presetId, raw) {
    const val = String(raw || "").trim();
    CFG.tokenOverrides = CFG.tokenOverrides || {};
    if (val) CFG.tokenOverrides[presetId] = val;
    else delete CFG.tokenOverrides[presetId];
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [TOKEN_PREF_KEY]: CFG.tokenOverrides });
      }
    } catch (_) {}
    refreshPresetUi();
  }

  function loadTokenOverrides() {
    try {
      if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) return;
      chrome.storage.local.get([TOKEN_PREF_KEY], (res) => {
        const v = res && res[TOKEN_PREF_KEY];
        if (v && typeof v === "object") {
          CFG.tokenOverrides = v;
          refreshPresetUi();
        }
      });
    } catch (_) {}
  }

  function setStatus(text, isSuccess = false, isError = false) {
    const node = document.getElementById("g1-zc-status");
    if (!node) return;
    node.textContent = text;
    node.title = text;
    if (darkMode) {
      node.style.background = isError ? "#2a1515" : isSuccess ? "#152a1a" : "#1a2530";
      node.style.borderColor = isError ? "#5a2020" : isSuccess ? "#1a5530" : "#264050";
      node.style.color = isError ? "#e06050" : isSuccess ? "#45c070" : "#5cb8d8";
    } else {
      node.style.background = isError ? "#fdecec" : isSuccess ? "#e8f8ef" : "#eef8ff";
      node.style.borderColor = isError ? "#f5b5b5" : isSuccess ? "#9ad7b5" : "#c7e7f7";
      node.style.color = isError ? "#b42318" : isSuccess ? "#157347" : "#176a8f";
    }
  }

  function pushCfg() {
    const preset = activePreset;
    const presetId = preset && preset.id;
    const includeYt = true;
    const token = preset && preset.token ? preset.token : "";
    try {
      document.documentElement.setAttribute("data-g1pk-preset", presetId || "");
    } catch (_) {}
    window.postMessage(
      { __g1pk: 1, type: "cfg", presetId, includeYt, token },
      "*"
    );
  }

  function selectPreset(presetId) {
    const preset = findPreset(presetId) || activePreset || PRESETS[0];
    if (!preset) return;
    activePreset = preset;
    refreshPresetUi();
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ g1ZcSelected: preset.id });
      }
    } catch (_) {}
    if (!preset.hasToken) {
      setStatus("No token for this plan", false, true);
      return;
    }
    pushCfg();
    setStatus(`Mounted ${preset.title} — open payment page`, true, false);
  }

  function fillUsTaxFreeAddress() {
    if (!location.hostname.includes("payments.google.com")) {
      window.open("https://payments.google.com/gp/w/home/settings", "_blank");
      return;
    }
    const inputs = Array.from(document.querySelectorAll("input:not([type='hidden'])")).filter(
      (i) => i.offsetWidth > 0 && i.offsetHeight > 0
    );
    const fillMap = [
      { match: /姓名|Name|持卡人|Cardholder/i, val: "CARD HOLDER" },
      { match: /地址第\s*1\s*行|Address line 1|街道地址|Street address/i, val: "700 Southwest 5th Avenue" },
      { match: /城市|City/i, val: "Portland" },
      { match: /邮编|邮政编码|ZIP|Postal/i, val: "97201" }
    ];
    let filledCount = 0;
    for (const inp of inputs) {
      const label =
        inp.getAttribute("aria-label") ||
        inp.getAttribute("placeholder") ||
        (inp.closest("label") ? inp.closest("label").innerText : "") ||
        "";
      for (const item of fillMap) {
        if (item.match.test(label)) {
          inp.focus();
          inp.value = item.val;
          inp.dispatchEvent(new Event("input", { bubbles: true }));
          inp.dispatchEvent(new Event("change", { bubbles: true }));
          filledCount += 1;
          break;
        }
      }
    }
    setStatus(filledCount > 0 ? `Filled OR 97201 · ${filledCount} fields` : "Open US payment form first", filledCount > 0, false);
  }

  /* ═══════ Cancel Timer ═══════ */
  function updateCancelInfo() {
    const el = document.getElementById("g1-zc-cancel-info");
    if (!el) return;
    try {
      chrome.storage.local.get(["g1ActivateDate"], (res) => {
        const d = res && res.g1ActivateDate;
        if (!d) { el.textContent = ""; return; }
        const activateDate = new Date(d);
        const now = new Date();
        const diffMs = activateDate.getTime() + 30 * 24 * 60 * 60 * 1000 - now.getTime();
        if (diffMs <= 0) {
          el.textContent = "⚠️ Cancel deadline passed!";
          el.style.color = "#e06050";
        } else {
          const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
          el.textContent = `⏰ ${days} days left to cancel (before billing)`;
        }
      });
    } catch (_) { el.textContent = ""; }
  }

  function markActivateNow() {
    try {
      chrome.storage.local.set({ g1ActivateDate: new Date().toISOString() });
      updateCancelInfo();
    } catch (_) {}
  }

  /* ═══════ Alt Methods ═══════ */
  function openAltMethod(methodKey) {
    let url = "";
    const preset = activePreset;
    const sku = preset ? preset.sku : "g1.play.20tb";
    const offerId = preset ? preset.offerId : "eft-12month";
    switch (methodKey) {
      case "playDeepLink":
        url = ALT_METHODS.playDeepLink ? ALT_METHODS.playDeepLink(sku, offerId) : "";
        break;
      case "geoHcm":
        url = ALT_METHODS.geoOffer ? ALT_METHODS.geoOffer(sku, "hcm") : "";
        break;
      case "geminiAdvanced":
        url = ALT_METHODS.geminiPaths ? ALT_METHODS.geminiPaths.advanced : "";
        break;
      case "geminiAi":
        url = ALT_METHODS.geminiPaths ? ALT_METHODS.geminiPaths.ai : "";
        break;
      case "geminiStudent":
        url = ALT_METHODS.geminiPaths ? ALT_METHODS.geminiPaths.student : "";
        break;
      case "geminiUpgrade":
        url = ALT_METHODS.geminiPaths ? ALT_METHODS.geminiPaths.upgrade : "";
        break;
      case "fiTrial":
        url = ALT_METHODS.fiTrial || "";
        break;
      case "ytPremium":
        url = ALT_METHODS.ytPremium || "";
        break;
      case "launchProduct":
        url = ALT_METHODS.launchProduct ? ALT_METHODS.launchProduct(sku) : "";
        break;
      case "campaignTrial":
        url = ALT_METHODS.campaigns ? ALT_METHODS.campaigns.trial : "";
        break;
      case "campaignPixel":
        url = ALT_METHODS.campaigns ? ALT_METHODS.campaigns.pixel : "";
        break;
      default:
        url = "";
    }
    if (url) {
      try {
        chrome.runtime.sendMessage({ action: "OPEN_ALT_METHOD", url }, () => {
          void chrome.runtime.lastError;
        });
      } catch (_) {
        window.open(url, "_blank");
      }
    }
  }

  /* ═══════ DOM Helpers ═══════ */
  function el(tag, cssText, text) {
    const node = document.createElement(tag);
    if (cssText) node.style.cssText = cssText;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  const POS_KEY = "g1ZcPanelPos";

  function clampPos(left, top, el) {
    const w = el.offsetWidth || 290;
    const h = el.offsetHeight || 160;
    const maxL = Math.max(8, window.innerWidth - w - 8);
    const maxT = Math.max(8, window.innerHeight - h - 8);
    return {
      left: Math.min(Math.max(8, left), maxL),
      top: Math.min(Math.max(8, top), maxT)
    };
  }

  function applyPos(el, pos) {
    el.style.right = "auto";
    el.style.bottom = "auto";
    el.style.left = pos.left + "px";
    el.style.top = pos.top + "px";
  }

  function savePos(pos) {
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [POS_KEY]: pos });
      }
    } catch (_) {}
  }

  function enableDrag(container, headerEl, toggleBtn) {
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([POS_KEY], (res) => {
          const p = res && res[POS_KEY];
          if (p && typeof p.left === "number" && typeof p.top === "number") {
            applyPos(container, clampPos(p.left, p.top, container));
          }
        });
      }
    } catch (_) {}

    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let origL = 0;
    let origT = 0;

    container.addEventListener("dragstart", (e) => e.preventDefault());

    headerEl.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      if (e.target === toggleBtn || (toggleBtn.contains && toggleBtn.contains(e.target))) return;
      const rect = container.getBoundingClientRect();
      applyPos(container, { left: rect.left, top: rect.top });
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      origL = rect.left;
      origT = rect.top;
      try {
        headerEl.setPointerCapture(e.pointerId);
      } catch (_) {}
      container.classList.add("g1-zc-dragging");
    });

    headerEl.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      applyPos(container, clampPos(origL + dx, origT + dy, container));
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      container.classList.remove("g1-zc-dragging");
      if (moved) {
        const rect = container.getBoundingClientRect();
        savePos({ left: rect.left, top: rect.top });
      }
    }

    headerEl.addEventListener("pointerup", endDrag);
    headerEl.addEventListener("pointercancel", endDrag);

    window.addEventListener("resize", () => {
      if (!container.style.left) return;
      const rect = container.getBoundingClientRect();
      const pos = clampPos(rect.left, rect.top, container);
      applyPos(container, pos);
      savePos(pos);
    });

    return () => {
      const v = moved;
      moved = false;
      return v;
    };
  }

  /* ═══════ MOUNT FLOATING PANEL ═══════ */
  function mountFloatingPanel() {
    if (!document.body || document.getElementById("g1-zero-cost-floating-panel")) return;
    injectStyles();

    const container = el("div");
    container.id = "g1-zero-cost-floating-panel";

    // Load dark mode preference
    try {
      chrome.storage.local.get(["g1DarkMode"], (res) => {
        if (res && res.g1DarkMode) {
          darkMode = true;
          container.classList.add("g1-dark");
        }
      });
    } catch (_) {}

    /* ─── Header ─── */
    const headerEl = el("div");
    headerEl.id = "g1-zc-header";
    const brand = el("div");
    brand.id = "g1-zc-brand";
    const logo = document.createElement("img");
    logo.id = "g1-zc-logo";
    logo.alt = "G1";
    try {
      logo.src = chrome.runtime.getURL("icons/icon48.png");
    } catch (_) {
      logo.src = "";
    }
    brand.appendChild(logo);
    const titles = el("div");
    titles.id = "g1-zc-titles";
    titles.appendChild(el("b", "", "G1 Ultra $0 Pro"));
    titles.appendChild(el("span", "", "v3.0 · 8-Method Engine"));
    brand.appendChild(titles);

    const headerBtns = el("div", "display:flex;gap:4px;align-items:center");
    const darkToggle = el("button", "", "🌙");
    darkToggle.id = "g1-zc-dark-toggle";
    darkToggle.title = "Toggle dark mode";
    darkToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      darkMode = !darkMode;
      container.classList.toggle("g1-dark", darkMode);
      darkToggle.textContent = darkMode ? "☀️" : "🌙";
      try { chrome.storage.local.set({ g1DarkMode: darkMode }); } catch (_) {}
      // Re-apply status colors
      const statusNode = document.getElementById("g1-zc-status");
      if (statusNode) setStatus(statusNode.textContent);
    });
    const toggleBtn = el("button", "", "−");
    toggleBtn.id = "g1-zc-toggle";
    toggleBtn.title = "Collapse";
    headerBtns.appendChild(darkToggle);
    headerBtns.appendChild(toggleBtn);
    headerEl.appendChild(brand);
    headerEl.appendChild(headerBtns);
    container.appendChild(headerEl);

    /* ─── Body ─── */
    const bodyEl = el("div");
    bodyEl.id = "g1-zc-body";

    const statusEl = el("div", "", "Select plan then open payment");
    statusEl.id = "g1-zc-status";
    bodyEl.appendChild(statusEl);

    /* SKU Row: 20TB, 30TB, 2TB AI */
    const skuRow = el("div");
    skuRow.id = "g1-zc-sku-row";
    [
      ["20tb", "⚡ 20TB $0"],
      ["30tb", "⚡ 30TB $0"]
    ].forEach(([key, label]) => {
      const b = el("button", "", label);
      b.className = "g1-zc-chip";
      b.dataset.sku = key;
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const months = (activePreset && activePreset.months) || 12;
        const next = presetBy(key, months) || presetBy(key, 12);
        if (next) selectPreset(next.id);
      });
      skuRow.appendChild(b);
    });
    bodyEl.appendChild(skuRow);

    /* Period Row */
    const periodRow = el("div");
    periodRow.id = "g1-zc-period-row";
    PERIODS.forEach((m) => {
      const b = el("button", "", m + "mo");
      b.className = "g1-zc-chip";
      b.dataset.months = String(m);
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const sku = (activePreset && activePreset.skuKey) || "20tb";
        const next = presetBy(sku, m);
        if (next) selectPreset(next.id);
      });
      periodRow.appendChild(b);
    });
    bodyEl.appendChild(periodRow);

    /* Token Input (hidden by default) */
    const tokenInput = document.createElement("input");
    tokenInput.type = "text";
    tokenInput.id = "g1-zc-token-input";
    tokenInput.className = "g1-zc-adv";
    tokenInput.spellcheck = false;
    tokenInput.addEventListener("change", () => saveTokenOverride(activePreset && activePreset.id, tokenInput.value));
    tokenInput.addEventListener("blur", () => saveTokenOverride(activePreset && activePreset.id, tokenInput.value));
    bodyEl.appendChild(tokenInput);

    /* ─── Alt Methods Section ─── */
    const altSection = el("div");
    altSection.id = "g1-zc-alt-section";
    const altToggle = el("button", "", "");
    altToggle.id = "g1-zc-alt-toggle";
    altToggle.innerHTML = "⚡ Alt Methods <span style='font-size:10px'>▼</span>";
    const altBody = el("div");
    altBody.id = "g1-zc-alt-body";
    let altOpen = false;
    altToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      altOpen = !altOpen;
      altBody.classList.toggle("g1-alt-open", altOpen);
      altBody.style.display = altOpen ? "flex" : "none";
      altToggle.innerHTML = altOpen
        ? "⚡ Alt Methods <span style='font-size:10px'>▲</span>"
        : "⚡ Alt Methods <span style='font-size:10px'>▼</span>";
    });

    const altButtons = [
      ["playDeepLink", "🔗 Play Deep Link + offer"],
      ["geoHcm", "🌍 Geo Offer (eft-hcm)"],
      ["geminiAdvanced", "🤖 Gemini Advanced"],
      ["geminiAi", "✨ Gemini AI"],
      ["geminiStudent", "🎓 Gemini Student"],
      ["geminiUpgrade", "⬆️ Google One Upgrade"],
      ["fiTrial", "📱 Google Fi Trial"],
      ["ytPremium", "🎬 YouTube Premium"],
      ["launchProduct", "🚀 Play launch_product"],
      ["campaignTrial", "🎁 Campaign Trial Link"],
      ["campaignPixel", "📲 Pixel Purchase Trial"],
    ];
    altButtons.forEach(([key, label]) => {
      const btn = el("button", "", label);
      btn.className = "g1-alt-btn";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openAltMethod(key);
        setStatus(`Opening: ${label.slice(2)}...`, true);
      });
      altBody.appendChild(btn);
    });

    altSection.appendChild(altToggle);
    altSection.appendChild(altBody);
    bodyEl.appendChild(altSection);

    /* Cancel Timer Info */
    const cancelInfo = el("div", "", "");
    cancelInfo.id = "g1-zc-cancel-info";
    bodyEl.appendChild(cancelInfo);

    /* ─── Footer ─── */
    const foot = el("div");
    foot.id = "g1-zc-foot";
    const usBtn = el("button", "", "🇺🇸 OR 97201");
    usBtn.id = "g1-zc-us-addr-btn";
    usBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      fillUsTaxFreeAddress();
    });
    const activateBtn = el("button", "", "✅ Activated");
    activateBtn.title = "Mark today as activation date (for cancel timer)";
    activateBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      markActivateNow();
      setStatus("Activation date saved — cancel timer started", true);
    });
    const pkLink = document.createElement("a");
    pkLink.id = "g1-zc-pk";
    pkLink.href = PK_URL;
    pkLink.target = "_blank";
    pkLink.rel = "noopener noreferrer";
    pkLink.textContent = "GitHub";
    pkLink.addEventListener("click", (e) => e.stopPropagation());
    foot.appendChild(usBtn);
    foot.appendChild(activateBtn);
    foot.appendChild(pkLink);
    bodyEl.appendChild(foot);

    container.appendChild(bodyEl);
    document.body.appendChild(container);
    refreshPresetUi();

    const wasMoved = enableDrag(container, headerEl, toggleBtn);

    let collapsed = false;
    function toggleCollapse() {
      collapsed = !collapsed;
      bodyEl.style.display = collapsed ? "none" : "flex";
      toggleBtn.textContent = collapsed ? "+" : "−";
      toggleBtn.title = collapsed ? "Expand" : "Collapse";
      container.classList.toggle("g1-zc-min", collapsed);
    }
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCollapse();
    });
    headerEl.addEventListener("click", () => {
      if (wasMoved()) return;
      toggleCollapse();
    });
  }

  function loadSelectedPreset() {
    try {
      if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) return;
      chrome.storage.local.get(["g1ZcSelected"], (res) => {
        const id = res && res.g1ZcSelected;
        const found = id && findPreset(id);
        if (found) {
          activePreset = found;
          refreshPresetUi();
        }
        pushCfg();
      });
    } catch (_) {}
  }

  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!msg || !msg.action) return;
      if (msg.action === "SELECT_PRESET" || msg.action === "OPEN_ZERO_COST_MODAL") {
        CFG.includeYt = true;
        const go = () => {
          mountFloatingPanel();
          selectPreset(msg.presetId);
          sendResponse({ ok: true });
        };
        try {
          if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get([TOKEN_PREF_KEY], (res) => {
              if (res && res[TOKEN_PREF_KEY] && typeof res[TOKEN_PREF_KEY] === "object") {
                CFG.tokenOverrides = res[TOKEN_PREF_KEY];
              }
              go();
            });
            return true;
          }
        } catch (_) {}
        go();
      } else if (msg.action === "GET_PAGE_STATUS") {
        sendResponse({ ok: true, url: location.href });
      } else if (msg.action === "FILL_US_ADDRESS") {
        fillUsTaxFreeAddress();
        sendResponse({ ok: true });
      }
      return true;
    });
  }

  loadTokenOverrides();
  loadSelectedPreset();
  window.__G1OpenZeroCostModal = selectPreset;
  window.addEventListener("message", (ev) => {
    const d = ev.data;
    if (d && d.__g1pk === 1 && d.type === "state" && d.state && d.state.mounted) {
      setStatus("Injector mounted ✓", true, false);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      mountFloatingPanel();
      pushCfg();
    });
  } else {
    mountFloatingPanel();
    pushCfg();
  }
  setTimeout(pushCfg, 800);
  setTimeout(pushCfg, 2500);
})();
