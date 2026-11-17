/* G1 Ultra $0 Pro v4 — Presets & Tokens (Dynamic Registry) */
(() => {
  const SUB_PREFIX = "subs:com.google.android.apps.subscriptions.red:";
  const YT_SKU = "g1.youtube_premium_individual_add_on";

  // ═══════════════════════════════════════════════════════
  // TOKEN DATABASE — From Play Billing API (Frida extraction)
  // ═══════════════════════════════════════════════════════
  const TOKENS = {
    // 20TB Ultra (4 periods) — BUILT-IN
    ultra20tb_12m: "AYrTWi65Jbm3KRubLXLLA3Re29zKibSnRbvAJEPfxEIVs/d57w8vEhsU7hSkSAfGyjZH8B7/5aj5UTlidbsEwUH8aPN2RTA6pKiltA==",
    ultra20tb_6m: "AYrTWi6lMoHTB2cVb1VC+i3DHvfp1Q9VGblBeF9b1+O8e5+kNws87YdcgNEUJOuHJDp/mitKx1KmBCYurbXIubpM50o4AqgcBB3gMGk85mQ=",
    ultra20tb_3m: "AYrTWi6sldhCH+REVXA3inXWB+LuAvtnSPYHMvhbqKmv3TRdQPhoynS4ZTLxPEiaNGnaAmDTqliYzrLwJ3Aq49Vi9ktjNP+xcTF5R9Yn1MQ=",
    ultra20tb_1m: "AYrTWi5QWD5gc0ZxMJHAAUvXbYRFJgI6w5vnF9PKIFg1DFQML36iijrmN5Vum7u9ty2JnHvt9JFLgsfGKwScJcfZaKttqn0hSX4Fnpdn9No=",
    // 30TB Ultra (4 periods) — BUILT-IN
    ultra30tb_12m: "AYrTWi51Eo3HG0tq1J6SYr4u3FDCCxb6xSEEWHskaFwSA7Vn4y+Lfqlfy+Lbkx2T/xPi4uCRB71ZIn+weD0kHZsMgS6ogUiZ8hG9SA==",
    ultra30tb_6m: "AYrTWi5hXUkLGa1e7nBstxl4Z3cUcYWzHF38Xks304ClJj8yVxeFCwDg/pJg82w8w9xHsk8Wl5WNhYKk26LB9besC0kYJ6AvlXapJA==",
    ultra30tb_3m: "AYrTWi4iJ8AzqZkDL53g/dcS7g93mZgiEBJANI0lOucBiUITWEYqCiwLsIXY7P62rmMWb+wFR4WW9tQlFrskR67oCzzwVHghPSs29w==",
    ultra30tb_1m: "AYrTWi7nBQ2Zn0z4s+QJOwg9kQRwH3+z+HXpzRqw9IIU4/C48vPvjH32Bub8SHrWq3YX+yI4g1wJgviYiLCobJNqc9DqRd9WZnDdaQ==",
    // YouTube Premium
    YT_FREE_TOK: "AVbCH/eW4Nfp8KBl0zlm7x9PhaiCvpnqwUuL2D8NFPBQgmM9+HuYS1h2xH5lLWU/BsBj775LK5GqK8UHKqoSzhDDz+PqP3paNesqLU0r9i6XCrYa"
  };

  // ═══════════════════════════════════════════════════════
  // v4: ALL GOOGLE ONE SKUS — Full registry
  // ═══════════════════════════════════════════════════════
  const ALL_SKUS = {
    "g1.play.20tb":    { name: "Ultra 20TB",     chip: "20TB",  color: "#FFD700", builtin: true  },
    "g1.play.ai.pro":  { name: "AI Pro 30TB",    chip: "30TB",  color: "#FF6B35", builtin: true  },
    "g1.play.2tb":     { name: "AI Premium 2TB", chip: "2TB",   color: "#7C4DFF", builtin: false },
    "g1.play.200gb":   { name: "Premium 200GB",  chip: "200GB", color: "#2AABEE", builtin: false },
    "g1.play.100gb":   { name: "Standard 100GB", chip: "100GB", color: "#00BFA5", builtin: false },
    "g1.play.30gb":    { name: "Lite 30GB",      chip: "30GB",  color: "#78909C", builtin: false },
  };

  // ═══════════════════════════════════════════════════════
  // v4: Alternative activation methods
  // ═══════════════════════════════════════════════════════
  const ALT_METHODS = {
    playDeepLink: (sku, offerId, authuser = 0) =>
      `https://play.google.com/store/account/subscriptions?sku=${sku}&package=com.google.android.apps.subscriptions.red&offer=${offerId}&authuser=${authuser}`,
    geoOffer: (sku, geo = "hcm", authuser = 0) =>
      `https://play.google.com/store/account/subscriptions?sku=${sku}&package=com.google.android.apps.subscriptions.red&offer=eft-${geo}&authuser=${authuser}`,
    geminiPaths: {
      advanced: "https://one.google.com/explore-plan/gemini-advanced",
      ai: "https://one.google.com/ai",
      student: "https://one.google.com/explore-plan/ai-premium-student",
      aiStudent: "https://one.google.com/ai-student?plans=1,2",
      upgrade: "https://one.google.com/upgrade",
    },
    fiTrial: "https://fi.google.com/about/free-trial",
    ytPremium: "https://www.youtube.com/premium",
    launchProduct: (sku, authuser = 0) =>
      `https://play.google.com/store/apps/details?id=com.google.android.apps.subscriptions.red&launch_product=${sku}&authuser=${authuser}`,
    campaigns: {
      geminiQuota: "https://one.google.com/ai?utm_source=gemini&utm_campaign=gemini_out_of_quota_input",
      trial: "https://one.google.com/ai?trial=1",
      pixel: "https://one.google.com/ai?utm_source=pixel&utm_campaign=pixel_purchase_trial",
    }
  };

  const CFG = { includeYt: true, tokenOverrides: {}, sku: "20tb" };
  const ALIAS = { ultra20tb_1m_yt: "ultra20tb_1m", ultra30tb_1m_yt: "ultra30tb_1m" };

  function makeItem(skuShort, token) {
    return [[`${SUB_PREFIX}${skuShort}`, 21], null, null, null, 1, [token]];
  }

  function resolveToken(preset) {
    const override = CFG.tokenOverrides && CFG.tokenOverrides[preset.id];
    if (override && String(override).trim()) return String(override).trim();
    return preset._token();
  }

  function makePreset(spec) {
    const preset = {
      id: spec.id,
      chip: spec.chip,
      period: spec.period,
      sku: spec.sku,
      skuKey: spec.skuKey,
      offerId: spec.offerId || "",
      months: spec.months,
      _token: spec.token
    };
    Object.defineProperty(preset, "title", { get: () => `${spec.chip} · ${spec.period}` });
    Object.defineProperty(preset, "badge", { get: () => spec.period });
    Object.defineProperty(preset, "subtitle", { get: () => "+ YouTube" });
    Object.defineProperty(preset, "token", { get: () => resolveToken(preset) });
    Object.defineProperty(preset, "hasToken", { get: () => Boolean(resolveToken(preset)) });
    Object.defineProperty(preset, "full_items", {
      get: () => [
        makeItem(spec.sku, resolveToken(preset)),
        makeItem(YT_SKU, TOKENS.YT_FREE_TOK)
      ]
    });
    Object.defineProperty(preset, "altLinks", {
      get: () => ({
        playDeepLink: ALT_METHODS.playDeepLink(spec.sku, spec.offerId),
        geoHcm: ALT_METHODS.geoOffer(spec.sku, "hcm"),
        launchProduct: ALT_METHODS.launchProduct(spec.sku),
      })
    });
    return preset;
  }

  const PRESETS = [
    makePreset({ id: "ultra20tb_12m", chip: "20TB", period: "12mo", months: 12, skuKey: "20tb", offerId: "eft-12month", sku: "g1.play.20tb", token: () => TOKENS.ultra20tb_12m }),
    makePreset({ id: "ultra20tb_6m", chip: "20TB", period: "6mo", months: 6, skuKey: "20tb", offerId: "eft-6month", sku: "g1.play.20tb", token: () => TOKENS.ultra20tb_6m }),
    makePreset({ id: "ultra20tb_3m", chip: "20TB", period: "3mo", months: 3, skuKey: "20tb", offerId: "eft-3month", sku: "g1.play.20tb", token: () => TOKENS.ultra20tb_3m }),
    makePreset({ id: "ultra20tb_1m", chip: "20TB", period: "1mo", months: 1, skuKey: "20tb", offerId: "eft-1month", sku: "g1.play.20tb", token: () => TOKENS.ultra20tb_1m }),
    makePreset({ id: "ultra30tb_12m", chip: "30TB", period: "12mo", months: 12, skuKey: "30tb", offerId: "eft-12mo", sku: "g1.play.ai.pro", token: () => TOKENS.ultra30tb_12m }),
    makePreset({ id: "ultra30tb_6m", chip: "30TB", period: "6mo", months: 6, skuKey: "30tb", offerId: "eft-6mo", sku: "g1.play.ai.pro", token: () => TOKENS.ultra30tb_6m }),
    makePreset({ id: "ultra30tb_3m", chip: "30TB", period: "3mo", months: 3, skuKey: "30tb", offerId: "eft-3mo", sku: "g1.play.ai.pro", token: () => TOKENS.ultra30tb_3m }),
    makePreset({ id: "ultra30tb_1m", chip: "30TB", period: "1mo", months: 1, skuKey: "30tb", offerId: "eft-1mo", sku: "g1.play.ai.pro", token: () => TOKENS.ultra30tb_1m })
  ];

  window.G1_ZERO_COST_PRESETS = PRESETS;
  window.G1_ZERO_COST_TOKENS = TOKENS;
  window.G1_ZERO_COST_CFG = CFG;
  window.G1_ALT_METHODS = ALT_METHODS;
  window.G1_ALL_SKUS = ALL_SKUS;
  window.G1_PK_URL = "https://github.com/thammynakisa/google-ultra-enhanced";
  window.G1_PK_ALIAS = ALIAS;
})();
