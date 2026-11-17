/* G1 Ultra $0 Pro v3 — Popup Script */
(() => {
  const PRESETS = window.G1_ZERO_COST_PRESETS || [];
  const ALT_METHODS = window.G1_ALT_METHODS || {};
  const ALIAS = window.G1_PK_ALIAS || {};
  const statusEl = document.getElementById("popup-status");
  const usBtn = document.getElementById("popup-us-btn");
  const activateBtn = document.getElementById("popup-activate-btn");
  let skuKey = "20tb";
  let months = 12;

  function setPopupStatus(text, isOk = false, isErr = false) {
    statusEl.textContent = text;
    statusEl.title = text;
    statusEl.style.background = isErr ? "#fdecec" : isOk ? "#e8f8ef" : "#eef8ff";
    statusEl.style.borderColor = isErr ? "#f5b5b5" : isOk ? "#9ad7b5" : "#c7e7f7";
    statusEl.style.color = isErr ? "#b42318" : isOk ? "#157347" : "#176a8f";
  }

  function findPreset(id) {
    const real = ALIAS[id] || id;
    return PRESETS.find((p) => p.id === real) || null;
  }

  function currentPreset() {
    return PRESETS.find((p) => p.skuKey === skuKey && p.months === months) || PRESETS[0];
  }

  function paint() {
    document.querySelectorAll("#sku-row .chip").forEach((b) => b.classList.toggle("is-on", b.dataset.sku === skuKey));
    document.querySelectorAll("#period-row .chip").forEach((b) => b.classList.toggle("is-on", Number(b.dataset.months) === months));
  }

  function selectCurrent() {
    const p = currentPreset();
    if (!p) return;
    chrome.storage.local.set({ g1ZcSelected: p.id });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (tab && tab.id && (tab.url || "").includes("one.google.com")) {
        chrome.tabs.sendMessage(tab.id, { action: "SELECT_PRESET", presetId: p.id }, () => {
          void chrome.runtime.lastError;
          setPopupStatus("Mounted " + p.title, true);
        });
      } else {
        setPopupStatus("Saved " + p.title, true);
      }
    });
    paint();
  }

  /* ─── SKU chips ─── */
  document.querySelectorAll("#sku-row .chip").forEach((b) => {
    b.addEventListener("click", () => {
      skuKey = b.dataset.sku;
      selectCurrent();
    });
  });

  /* ─── Period chips ─── */
  document.querySelectorAll("#period-row .chip").forEach((b) => {
    b.addEventListener("click", () => {
      months = Number(b.dataset.months);
      selectCurrent();
    });
  });

  /* ─── Quick method links ─── */
  function openMethod(methodKey) {
    let url = "";
    const p = currentPreset();
    const sku = p ? p.sku : "g1.play.20tb";
    const offerId = p ? p.offerId : "eft-12month";
    switch (methodKey) {
      case "geminiAdvanced": url = ALT_METHODS.geminiPaths ? ALT_METHODS.geminiPaths.advanced : ""; break;
      case "geminiAi": url = ALT_METHODS.geminiPaths ? ALT_METHODS.geminiPaths.ai : ""; break;
      case "geminiStudent": url = ALT_METHODS.geminiPaths ? ALT_METHODS.geminiPaths.student : ""; break;
      case "geminiUpgrade": url = ALT_METHODS.geminiPaths ? ALT_METHODS.geminiPaths.upgrade : ""; break;
      case "fiTrial": url = ALT_METHODS.fiTrial || ""; break;
      case "ytPremium": url = ALT_METHODS.ytPremium || ""; break;
      case "campaignTrial": url = ALT_METHODS.campaigns ? ALT_METHODS.campaigns.trial : ""; break;
      case "playDeepLink": url = ALT_METHODS.playDeepLink ? ALT_METHODS.playDeepLink(sku, offerId) : ""; break;
      case "geoHcm": url = ALT_METHODS.geoOffer ? ALT_METHODS.geoOffer(sku, "hcm") : ""; break;
      case "launchProduct": url = ALT_METHODS.launchProduct ? ALT_METHODS.launchProduct(sku) : ""; break;
      default: url = "";
    }
    if (url) {
      chrome.tabs.create({ url, active: true });
      setPopupStatus("Opening: " + methodKey, true);
      window.close();
    }
  }

  document.querySelectorAll(".qlink").forEach((btn) => {
    btn.addEventListener("click", () => {
      openMethod(btn.dataset.method);
    });
  });

  /* ─── US Address button ─── */
  usBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (tab && tab.id && (tab.url || "").includes("payments.google.com")) {
        chrome.tabs.sendMessage(tab.id, { action: "FILL_US_ADDRESS" });
        setPopupStatus("Filled OR 97201", true);
      } else {
        chrome.tabs.create({ url: "https://payments.google.com/gp/w/home/settings" });
        window.close();
      }
    });
  });

  /* ─── Activate button (cancel timer) ─── */
  if (activateBtn) {
    activateBtn.addEventListener("click", () => {
      chrome.storage.local.set({ g1ActivateDate: new Date().toISOString() });
      setPopupStatus("Activation date saved — cancel timer started", true);
    });
  }

  /* ─── Load saved preset ─── */
  chrome.storage.local.get(["g1ZcSelected"], (res) => {
    const saved = findPreset(res && res.g1ZcSelected);
    if (saved) {
      skuKey = saved.skuKey;
      months = saved.months;
    }
    paint();
  });
})();
