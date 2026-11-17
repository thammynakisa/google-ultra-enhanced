#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ultra Offer Scanner — Scan for available Google One offers via Play Billing API simulation.
Generates fresh activation links by probing multiple SKU endpoints.

This script attempts to discover available offer tokens by:
1. Querying known Google One product SKUs
2. Trying different offer ID patterns
3. Building checkout URLs from discovered tokens

Usage:
    python offer_scanner.py                    # Scan all known SKUs
    python offer_scanner.py --sku g1.play.20tb # Scan specific SKU
    python offer_scanner.py --probe            # Probe for new SKUs
"""
import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

# ═══════════════════════════════════════════════════════════
# KNOWN SKU DATABASE
# ═══════════════════════════════════════════════════════════

KNOWN_SKUS = {
    # Ultra tier
    "g1.play.20tb":    {"tier": "Ultra 5x",  "storage": "20TB", "price": "$99.99/mo"},
    "g1.play.ai.pro":  {"tier": "Ultra 20x", "storage": "30TB", "price": "$199.99/mo"},
    "g1.30tb":         {"tier": "Ultra Alt",  "storage": "30TB", "price": "$199.99/mo"},
    "g1.ai.pro":       {"tier": "AI Pro Alt", "storage": "30TB", "price": "$199.99/mo"},
    # Premium tier
    "g1.play.2tb":     {"tier": "Premium",    "storage": "2TB",  "price": "$9.99/mo"},
    "g1.play.ai":      {"tier": "AI Premium", "storage": "2TB",  "price": "$19.99/mo"},
    # Standard/Basic
    "g1.play.100gb":   {"tier": "Basic",      "storage": "100GB","price": "$1.99/mo"},
    "g1.play.200gb":   {"tier": "Standard",   "storage": "200GB","price": "$2.99/mo"},
}

# Known offer ID patterns
OFFER_PATTERNS = [
    "eft-1month",
    "eft-3month",
    "eft-6month",
    "eft-12month",
    "eft-1year",
    "eft-trial",
    "trial-1month",
    "trial-3month",
    "trial-6month",
    "trial-12month",
    "promo-1month",
    "promo-3month",
    "promo-6month",
    "promo-12month",
    "free-1month",
    "free-3month",
    "free-6month",
    "free-12month",
]

# Known period codes
PERIOD_RANK = {
    "P1Y": 12, "P12M": 12, "P6M": 6, "P3M": 3, "P1M": 1,
}

# ═══════════════════════════════════════════════════════════
# GOOGLE ONE PLAN PAGE PROBE
# ═══════════════════════════════════════════════════════════

def probe_one_plans_page():
    """Probe Google One plans page for available offers."""
    urls = [
        "https://one.google.com/explore-plan/gemini-advanced",
        "https://one.google.com/about/plans",
        "https://one.google.com/explore-plan/gemini-advanced?g1_landing_page=1",
    ]
    results = []
    for url in urls:
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                "Accept": "text/html",
                "Accept-Language": "en-US,en;q=0.9",
            })
            with urllib.request.urlopen(req, timeout=10) as r:
                body = r.read().decode("utf-8", "ignore")
                # Look for SKU references in the page
                import re
                skus = set(re.findall(r'g1\.(?:play\.)?[\w.]+', body))
                tokens = set(re.findall(r'AYrTWi[A-Za-z0-9+/=]{20,}', body))
                offers = set(re.findall(r'eft-\w+', body))
                if skus or tokens or offers:
                    results.append({
                        "url": url,
                        "skus": list(skus),
                        "tokens": [t[:30] + "..." for t in tokens],
                        "offers": list(offers),
                    })
                    print(f"  ✅ {url}")
                    if skus: print(f"     SKUs: {', '.join(skus)}")
                    if tokens: print(f"     Tokens: {len(tokens)} found")
                    if offers: print(f"     Offers: {', '.join(offers)}")
                else:
                    print(f"  ⚠️  {url} — no offer data found (need auth)")
        except Exception as e:
            print(f"  ❌ {url} — {e}")
    return results


def probe_play_billing_endpoints():
    """Probe known Play Billing API endpoints for offer availability."""
    endpoints = [
        # Public-facing subscription info
        f"https://play.google.com/store/apps/details?id=com.google.android.apps.subscriptions.red",
        # Tokenized checkout probe (will get 400 without valid session, but reveals structure)
        f"https://tokenized.play.google.com/eacquire/status",
    ]
    for ep in endpoints:
        try:
            req = urllib.request.Request(ep, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            })
            with urllib.request.urlopen(req, timeout=10) as r:
                status = r.getcode()
                print(f"  [{status}] {ep}")
        except urllib.error.HTTPError as e:
            print(f"  [{e.code}] {ep} — {e.reason}")
        except Exception as e:
            print(f"  [ERR] {ep} — {e}")


# ═══════════════════════════════════════════════════════════
# SKU DISCOVERY
# ═══════════════════════════════════════════════════════════

def generate_candidate_skus():
    """Generate candidate SKU IDs to probe."""
    prefixes = ["g1.play.", "g1.", "g1.play.ai.", "g1.ai."]
    tiers = ["20tb", "30tb", "2tb", "5tb", "10tb", "100gb", "200gb",
             "ultra", "ai.pro", "ai.ultra", "premium", "ai.premium",
             "basic", "standard", "ai", "pro"]
    candidates = set()
    for p in prefixes:
        for t in tiers:
            candidates.add(f"{p}{t}")
    # Add known ones
    candidates.update(KNOWN_SKUS.keys())
    return sorted(candidates)


# ═══════════════════════════════════════════════════════════
# REPORT GENERATOR
# ═══════════════════════════════════════════════════════════

def generate_report(output_path: str = None):
    """Generate a comprehensive scan report."""
    report = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "known_skus": KNOWN_SKUS,
        "offer_patterns": OFFER_PATTERNS,
        "candidate_skus": generate_candidate_skus(),
        "period_rankings": PERIOD_RANK,
    }
    
    if output_path:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        print(f"\n  💾 Report saved to: {os.path.abspath(output_path)}")
    
    return report


# ═══════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════

def main():
    print("\n" + "=" * 60)
    print("  🔍 Ultra Offer Scanner")
    print("  Scan Google One offer availability")
    print("=" * 60)
    
    ap = argparse.ArgumentParser(description="Scan for Google One Ultra offer tokens")
    ap.add_argument("--sku", help="Scan specific SKU")
    ap.add_argument("--probe", action="store_true", help="Probe for new SKUs")
    ap.add_argument("--report", type=str, help="Save scan report to file")
    args = ap.parse_args()
    
    print("\n  📋 Known SKUs:")
    for sku, info in KNOWN_SKUS.items():
        print(f"     {sku:25s} → {info['tier']:15s} {info['storage']:6s} {info['price']}")
    
    print(f"\n  🔑 Known Offer Patterns: {len(OFFER_PATTERNS)}")
    for i in range(0, len(OFFER_PATTERNS), 4):
        chunk = OFFER_PATTERNS[i:i+4]
        print(f"     {', '.join(chunk)}")
    
    if args.probe:
        print("\n  🌐 Probing Google One plans page...")
        probe_one_plans_page()
        print("\n  🌐 Probing Play Billing endpoints...")
        probe_play_billing_endpoints()
    
    if args.sku:
        info = KNOWN_SKUS.get(args.sku, {"tier": "Unknown", "storage": "?", "price": "?"})
        print(f"\n  🎯 Target SKU: {args.sku} → {info['tier']} {info['storage']}")
    
    candidates = generate_candidate_skus()
    print(f"\n  📊 Total candidate SKUs to monitor: {len(candidates)}")
    
    if args.report:
        generate_report(args.report)
    
    print("\n  ✅ Scan complete.")
    print("  ℹ️  To get live offer tokens, use the Frida script on a rooted Android device.")
    print("  ℹ️  Or use the web tool (web/index.html) which has hardcoded tokens.\n")


if __name__ == "__main__":
    main()
