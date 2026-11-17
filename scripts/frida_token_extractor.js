/*
 * ═══════════════════════════════════════════════════════════
 * G1 Ultra $0 — Frida Token Extractor v2.0
 * ═══════════════════════════════════════════════════════════
 *
 * Trích xuất offer tokens từ Google Play Billing Library
 * trên thiết bị Android cho BẤT KỲ gói Google One nào.
 *
 * CÁCH DÙNG:
 * 1. Cài Frida trên PC: pip install frida-tools
 * 2. Cài frida-server trên Android (root): 
 *    adb push frida-server /data/local/tmp/
 *    adb shell "chmod 755 /data/local/tmp/frida-server"
 *    adb shell "/data/local/tmp/frida-server &"
 * 3. Mở app Google One trên điện thoại
 * 4. Chạy: frida -U -n "com.google.android.apps.subscriptions.red" -l frida_token_extractor.js
 * 5. Duyệt qua các gói trong app → tokens tự động được in ra
 * 6. Copy token → paste vào extension (Token Registry)
 *
 * KHÔNG CẦN ROOT (alternative):
 * - Dùng frida-gadget embed vào APK
 * - Hoặc dùng Objection: objection -g com.google.android.apps.subscriptions.red explore
 *
 * OUTPUT FORMAT:
 * [G1-EXTRACT] SKU: g1.play.100gb | Period: P1M | Token: AYrTWi...
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

// ══════════════════════════════════════════════════════
// 1. HOOK: BillingClient.queryProductDetailsAsync
//    Intercepts offer details including free trial tokens
// ══════════════════════════════════════════════════════
Java.perform(function() {
  console.log("[G1-EXTRACT] ═══════════════════════════════════");
  console.log("[G1-EXTRACT] Google One Token Extractor v2.0");
  console.log("[G1-EXTRACT] Hooking Play Billing Library...");
  console.log("[G1-EXTRACT] ═══════════════════════════════════");

  const extractedTokens = {};

  // ── Hook 1: BillingClientImpl.queryProductDetailsAsync ──
  // This is where Google Play returns product details with offer tokens
  try {
    const BillingClientImpl = Java.use("com.android.billingclient.api.BillingClientImpl");
    
    BillingClientImpl.queryProductDetailsAsync.implementation = function(params, listener) {
      console.log("\n[G1-EXTRACT] ▶ queryProductDetailsAsync called");
      
      // Create a wrapper listener to intercept the response
      const ProductDetailsResponseListener = Java.use("com.android.billingclient.api.ProductDetailsResponseListener");
      const originalListener = listener;
      
      const hookedListener = Java.registerClass({
        name: "com.g1extract.HookedPDListener",
        implements: [ProductDetailsResponseListener],
        methods: {
          onProductDetailsResponse: function(billingResult, productDetailsList) {
            console.log("[G1-EXTRACT] ◀ Product details received");
            
            try {
              const list = productDetailsList;
              const size = list.size();
              console.log(`[G1-EXTRACT] Found ${size} product(s)`);
              
              for (let i = 0; i < size; i++) {
                const pd = list.get(i);
                const productId = pd.getProductId();
                const title = pd.getTitle();
                const productType = pd.getProductType();
                
                console.log(`\n[G1-EXTRACT] ── Product ${i + 1} ──`);
                console.log(`[G1-EXTRACT] ID: ${productId}`);
                console.log(`[G1-EXTRACT] Title: ${title}`);
                console.log(`[G1-EXTRACT] Type: ${productType}`);
                
                // Get subscription offer details
                const subOfferDetails = pd.getSubscriptionOfferDetails();
                if (subOfferDetails !== null) {
                  const offerCount = subOfferDetails.size();
                  console.log(`[G1-EXTRACT] Offers: ${offerCount}`);
                  
                  for (let j = 0; j < offerCount; j++) {
                    const offer = subOfferDetails.get(j);
                    const offerId = offer.getOfferId();
                    const offerToken = offer.getOfferToken();
                    const basePlanId = offer.getBasePlanId();
                    
                    // Get pricing phases
                    const pricingPhases = offer.getPricingPhases();
                    const phaseList = pricingPhases.getPricingPhaseList();
                    let isFree = false;
                    let period = "";
                    
                    for (let k = 0; k < phaseList.size(); k++) {
                      const phase = phaseList.get(k);
                      const price = phase.getFormattedPrice();
                      const priceMicros = phase.getPriceAmountMicros();
                      const billingPeriod = phase.getBillingPeriod();
                      const recurrenceMode = phase.getRecurrenceMode();
                      
                      if (priceMicros === 0 || price.includes("0.00") || price.includes("Free")) {
                        isFree = true;
                      }
                      period = billingPeriod;
                      
                      console.log(`[G1-EXTRACT]   Phase ${k}: ${price} / ${billingPeriod} (mode: ${recurrenceMode}, micros: ${priceMicros})`);
                    }
                    
                    console.log(`[G1-EXTRACT]   Offer ID: ${offerId || "(base)"}`);
                    console.log(`[G1-EXTRACT]   Base Plan: ${basePlanId}`);
                    console.log(`[G1-EXTRACT]   Free Trial: ${isFree ? "YES ★" : "no"}`);
                    
                    if (offerToken) {
                      const tokenKey = `${productId}::${basePlanId || period}`;
                      extractedTokens[tokenKey] = offerToken;
                      
                      // ★ THIS IS THE GOLD — the offer token for $0 activation ★
                      if (isFree) {
                        console.log(`\n[G1-EXTRACT] ★★★ FREE OFFER TOKEN FOUND ★★★`);
                        console.log(`[G1-EXTRACT] SKU: ${productId} | Period: ${basePlanId || period} | OfferID: ${offerId || "base"}`);
                        console.log(`[G1-EXTRACT] TOKEN: ${offerToken}`);
                        console.log(`[G1-EXTRACT] ★★★ Copy this token to Chrome Extension ★★★\n`);
                      } else {
                        console.log(`[G1-EXTRACT]   Token: ${offerToken.substring(0, 40)}...`);
                      }
                    }
                  }
                }
                
                // Also check one-time purchase offer
                const otpDetails = pd.getOneTimePurchaseOfferDetails();
                if (otpDetails !== null) {
                  console.log(`[G1-EXTRACT]   OTP Price: ${otpDetails.getFormattedPrice()}`);
                }
              }
            } catch (e) {
              console.log("[G1-EXTRACT] Error parsing details: " + e);
            }
            
            // Forward to original listener
            originalListener.onProductDetailsResponse(billingResult, productDetailsList);
          }
        }
      });
      
      return this.queryProductDetailsAsync(params, hookedListener.$new());
    };
    
    console.log("[G1-EXTRACT] ✓ Hooked queryProductDetailsAsync");
  } catch (e) {
    console.log("[G1-EXTRACT] ✗ BillingClientImpl hook failed: " + e);
    console.log("[G1-EXTRACT] Trying alternative class names...");
    
    // Try Play Billing Library v5/v6/v7 class names
    try {
      const classes = [
        "com.android.billingclient.api.zzm",
        "com.android.billingclient.api.zzl", 
        "com.android.billingclient.api.zzn",
      ];
      for (const cls of classes) {
        try {
          Java.use(cls);
          console.log(`[G1-EXTRACT] Found obfuscated class: ${cls}`);
        } catch (_) {}
      }
    } catch (_) {}
  }

  // ── Hook 2: BillingClient.launchBillingFlow ──
  // Intercepts the actual purchase/subscribe flow
  try {
    const BillingClientImpl = Java.use("com.android.billingclient.api.BillingClientImpl");
    
    BillingClientImpl.launchBillingFlow.implementation = function(activity, params) {
      console.log("\n[G1-EXTRACT] ▶ launchBillingFlow called!");
      
      try {
        // Extract BillingFlowParams details
        const paramsClass = params.getClass();
        const fields = paramsClass.getDeclaredFields();
        
        for (let i = 0; i < fields.length; i++) {
          fields[i].setAccessible(true);
          const name = fields[i].getName();
          const val = fields[i].get(params);
          if (val !== null) {
            console.log(`[G1-EXTRACT]   ${name}: ${val}`);
          }
        }
        
        // Try to get the product details list from params
        const pdList = params.zzb(); // obfuscated getter
        if (pdList) {
          console.log(`[G1-EXTRACT]   Product details in flow: ${pdList}`);
        }
      } catch (e) {
        console.log("[G1-EXTRACT]   (Could not parse params: " + e + ")");
      }
      
      return this.launchBillingFlow(activity, params);
    };
    
    console.log("[G1-EXTRACT] ✓ Hooked launchBillingFlow");
  } catch (e) {
    console.log("[G1-EXTRACT] ✗ launchBillingFlow hook failed: " + e);
  }

  // ── Hook 3: Generic HTTP interceptor for Play Store API ──
  // Catches raw protobuf responses with offer data
  try {
    const URL = Java.use("java.net.URL");
    const HttpURLConnection = Java.use("java.net.HttpURLConnection");
    
    URL.openConnection.overload().implementation = function() {
      const conn = this.openConnection();
      const urlStr = this.toString();
      
      if (urlStr.includes("play.google.com") && 
          (urlStr.includes("purchase") || urlStr.includes("acquire") || 
           urlStr.includes("offer") || urlStr.includes("billing"))) {
        console.log(`[G1-EXTRACT] 🌐 Play API call: ${urlStr.substring(0, 120)}...`);
      }
      
      return conn;
    };
    
    console.log("[G1-EXTRACT] ✓ Hooked URL.openConnection");
  } catch (e) {
    console.log("[G1-EXTRACT] ✗ URL hook: " + e);
  }

  // ── Hook 4: OkHttp interceptor (Google uses OkHttp internally) ──
  try {
    const OkHttpClient = Java.use("okhttp3.OkHttpClient");
    const Interceptor = Java.use("okhttp3.Interceptor");
    
    console.log("[G1-EXTRACT] ✓ OkHttp detected");
    
    // Hook Response.body to read response content
    const ResponseBody = Java.use("okhttp3.ResponseBody");
    ResponseBody.string.implementation = function() {
      const body = this.string();
      const url = this.contentType() ? this.contentType().toString() : "";
      
      // Check for offer-related responses
      if (body && body.length < 50000) {
        // Look for offer token patterns in response
        const tokenPattern = /AYrTWi[A-Za-z0-9+\/=]{20,}/g;
        const matches = body.match(tokenPattern);
        if (matches) {
          console.log(`\n[G1-EXTRACT] ★ Found offer token(s) in HTTP response!`);
          matches.forEach((token, idx) => {
            console.log(`[G1-EXTRACT] Token ${idx + 1}: ${token}`);
          });
        }
        
        // Look for SKU names
        if (body.includes("g1.play.")) {
          const skuPattern = /g1\.play\.[a-z0-9.]+/g;
          const skuMatches = body.match(skuPattern);
          if (skuMatches) {
            console.log(`[G1-EXTRACT] SKUs in response: ${[...new Set(skuMatches)].join(", ")}`);
          }
        }
      }
      
      return body;
    };
    
    console.log("[G1-EXTRACT] ✓ Hooked OkHttp ResponseBody");
  } catch (e) {
    console.log("[G1-EXTRACT] ✗ OkHttp hook: " + e);
  }

  // ── Utility: Dump all extracted tokens on demand ──
  // Call from Frida console: rpc.exports.dumpTokens()
  rpc.exports = {
    dumpTokens: function() {
      console.log("\n[G1-EXTRACT] ═══ ALL EXTRACTED TOKENS ═══");
      for (const [key, token] of Object.entries(extractedTokens)) {
        console.log(`${key} → ${token}`);
      }
      console.log("[G1-EXTRACT] ═══════════════════════════\n");
      return extractedTokens;
    },
    getToken: function(sku) {
      for (const [key, token] of Object.entries(extractedTokens)) {
        if (key.startsWith(sku)) return token;
      }
      return null;
    }
  };

  console.log("\n[G1-EXTRACT] ═══════════════════════════════════");
  console.log("[G1-EXTRACT] Ready! Navigate Google One app");
  console.log("[G1-EXTRACT] Browse plans to trigger extraction");
  console.log("[G1-EXTRACT] ═══════════════════════════════════\n");
});
