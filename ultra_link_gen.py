#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ultra Link Generator Pro v3 — Pure Python, Zero Dependencies
Google One AI Ultra / Premium activation links ($0).

v3 New Methods (from deep endpoint probing):
  - METHOD 1: Tokenized Play Checkout (original, proven)
  - METHOD 2: Play Deep Link with offer= param (NEW)
  - METHOD 3: Geographic Offer codes eft-hcm (NEW)
  - METHOD 4: Gemini AI Premium explore-plan paths (NEW)
  - METHOD 5: Google Fi free trial bundle (NEW)
  - METHOD 6: Cross-SKU Token Injection (NEW)
  - METHOD 7: YouTube Premium bundle trial (NEW)
  - METHOD 8: Play Store launch_product deep link (NEW)

Usage:
    python ultra_link_gen.py                     # Interactive mode
    python ultra_link_gen.py --plan 20tb         # Tokenized checkout (Method 1)
    python ultra_link_gen.py --method all        # ALL 8 methods
    python ultra_link_gen.py --method gemini     # Gemini paths (Method 4)
    python ultra_link_gen.py --method deeplink   # Play deep links (Method 2,3,8)
    python ultra_link_gen.py --method bundle     # Fi + YT bundles (Method 5,7)
    python ultra_link_gen.py --method cross-sku  # Cross-SKU injection (Method 6)
    python ultra_link_gen.py --batch 10          # 10 authuser links
    python ultra_link_gen.py --all               # ALL plans × authusers
    python ultra_link_gen.py --json              # JSON output
    python ultra_link_gen.py --skus              # List all known SKUs
    python ultra_link_gen.py --timer 2026-11-17  # Cancel reminder
    python ultra_link_gen.py --serve             # Start local web server
    python ultra_link_gen.py --probe             # Run live endpoint probe
"""
import argparse, base64, hashlib, json, os, random, sys, time, urllib.parse
import http.server, threading
from datetime import datetime, timedelta
from pathlib import Path

# ═══════════════════════════════════════════════════════════
# OFFER DATABASE — from Play Billing queryProductDetailsAsync
# ═══════════════════════════════════════════════════════════

OFFERS = {
    "20tb": {
        "sku": "g1.play.20tb",
        "token": "AYrTWi65Jbm3KRubLXLLA3Re29zKibSnRbvAJEPfxEIVs/d57w8vEhsU7hSkSAfGyjZH8B7/5aj5UTlidbsEwUH8aPN2RTA6pKiltA==",
        "name": "Ultra 5x (20TB)",
        "trial": "12 months",
        "trial_months": 12,
        "after": "US$99.99/mo",
        "offer_id": "eft-12month",
        "period": "P1Y",
    },
    "30tb": {
        "sku": "g1.play.ai.pro",
        "token": "AYrTWi7nBQ2Zn0z4s+QJOwg9kQRwH3+z+HXpzRqw9IIU4/C48vPvjH32Bub8SHrWq3YX+yI4g1wJgviYiLCobJNqc9DqRd9WZnDdaQ==",
        "name": "Ultra 20x (30TB)",
        "trial": "1 month",
        "trial_months": 1,
        "after": "US$199.99/mo",
        "offer_id": "eft-1month",
        "period": "P1M",
    },
    "2tb": {
        "sku": "g1.play.2tb",
        "token": "AYrTWi65Jbm3KRubLXLLA3Re29zKibSnRbvAJEPfxEIVs/d57w8vEhsU7hSkSAfGyjZH8B7/5aj5UTlidbsEwUH8aPN2RTA6pKiltA==",
        "name": "Premium AI (2TB)",
        "trial": "3 months",
        "trial_months": 3,
        "after": "US$9.99/mo",
        "offer_id": "eft-3month",
        "period": "P3M",
    },
}

# Full SKU reference database (expanded with Phase 2/3 findings)
SKU_DATABASE = {
    # Tokenized (from Play Billing API — have offer tokens)
    "g1.play.20tb":      {"tier": "Ultra 5x",         "storage": "20TB",  "price": "$99.99/mo",  "has_token": True,  "source": "play-billing"},
    "g1.play.ai.pro":    {"tier": "Ultra 20x",        "storage": "30TB",  "price": "$199.99/mo", "has_token": True,  "source": "play-billing"},
    "g1.play.2tb":       {"tier": "Premium",           "storage": "2TB",   "price": "$9.99/mo",   "has_token": True,  "source": "play-billing"},
    # Public web (from one.google.com/about/plans HTML)
    "g1.100gb":          {"tier": "Basic",             "storage": "100GB", "price": "₫45,000/mo", "has_token": False, "source": "web-plans"},
    "g1.100gb.annual":   {"tier": "Basic Annual",      "storage": "100GB", "price": "₫459,000/yr","has_token": False, "source": "web-plans"},
    "g1.2tb.ai":         {"tier": "AI Premium",        "storage": "2TB",   "price": "₫489,000/mo","has_token": False, "source": "web-plans"},
    "g1.2tb.ai.annual":  {"tier": "AI Premium Annual", "storage": "2TB",   "price": "₫4.9M/yr",  "has_token": False, "source": "web-plans"},
    "g1.30gb":           {"tier": "Lite",              "storage": "30GB",  "price": "₫19,000/mo", "has_token": False, "source": "web-plans"},
    "g1.30gb.annual":    {"tier": "Lite Annual",       "storage": "30GB",  "price": "₫199,000/yr","has_token": False, "source": "web-plans"},
    # Play Billing alternate IDs
    "g1.play.ai":        {"tier": "AI Premium Play",   "storage": "2TB",   "price": "$19.99/mo",  "has_token": False, "source": "play-billing"},
    "g1.play.100gb":     {"tier": "Basic Play",        "storage": "100GB", "price": "$1.99/mo",   "has_token": False, "source": "play-billing"},
    "g1.play.200gb":     {"tier": "Standard Play",     "storage": "200GB", "price": "$2.99/mo",   "has_token": False, "source": "play-billing"},
}

# Offer patterns (expanded with Phase 3 findings)
OFFER_PATTERNS = {
    "duration": ["eft-1month", "eft-3month", "eft-6month", "eft-12month", "eft-1year"],
    "geographic": ["eft-hcm"],  # Ho Chi Minh City geo-targeted!
    "mechanism": ["eft-radius", "eft-spin"],  # CSS animation names, not offer codes
    "legacy": ["trial-1month", "trial-3month", "trial-6month", "trial-12month",
               "promo-1month", "promo-3month", "free-1month", "free-3month"],
}

# ═══════════════════════════════════════════════════════════
# FINGERPRINT TEMPLATES
# ═══════════════════════════════════════════════════════════

FP_WIN = "W1tudWxsLG51bGwsbnVsbCxbbnVsbCxbIlJzMi4wLjY6OjpzMTExLDIsMjZiNWUxOSwwLDc2OSxhMDYzZWJlOSwwLDRhMixlZGQ5OGJhYywwLDE4LDQ4NjNmZDM1LDAsNzY5LGNiMmQ1YzZmLDAsNDdlLDZhZDQ3YzZjLDAsNTNlLDdiZGI0OWY2LDAsNDI4LGI2NTQwMjAwLDAsNzY5LGVlYTgyMGI2LDAsNDdlLDFhYTQzMzEsMCxcIldpbjMyLGY1NDY4M2YyLDAsXCJHb29nbGUgSW5jLixhZjc5NDUxNSwwLFwiNS4wIDI4V2luZG93cyBOVCAxMC4wM2IgV2luNjQzYiB4NjQyOSBBcHBsZVdlYktpdDJmNTM3LjM2IDI4S0hUTUwyYyBsaWtlIEdlY2tvMjkgQ2hyb21lMmYxMjUuMC4wLjAgU2FmYXJpMmY1MzcuMzYsZDgxNzIzZDEsMCxcImVuMmRVUyw1Y2MzYWI1ZiwwLFwiTW96aWxsYTJmNS4wIDI4V2luZG93cyBOVCAxMC4wM2IgV2luNjQzYiB4NjQyOSBBcHBsZVdlYktpdDJmNTM3LjM2IDI4S0hUTUwyYyBsaWtlIEdlY2tvMjkgQ2hyb21lMmYxMjUuMC4wLjAgU2FmYXJpMmY1MzcuMzYsMjRhNjZkZjYsMCwxMmMsXCJXZWQgRGVjIDMxIDE5NjkgMTlhMDAzYTAwIEdNVDJkMDUwMCAyOEVhc3Rlcm4gU3RhbmRhcmQgVGltZTI5LDJjYTA1NTRmLFwiUERGIFZpZXdlciwwLFwiUG9ydGFibGUgRG9jdW1lbnQgRm9ybWF0LFwiQ2hyb21lIFBERiBWaWV3ZXIsMCxcIlBvcnRhYmxlIERvY3VtZW50IEZvcm1hdCxcIkNocm9taXVtIFBERiBWaWV3ZXIsMCxcIlBvcnRhYmxlIERvY3VtZW50IEZvcm1hdCxcIk1pY3Jvc29mdCBFZGdlIFBERiBWaWV3ZXIsMCxcIlBvcnRhYmxlIERvY3VtZW50IEZvcm1hdCxcIldlYktpdCBidWlsdDJkaW4gUERGLDAsXCJQb3J0YWJsZSBEb2N1bWVudCBGb3JtYXQsNmM4YjlkNWIsNzcwYzY3ZmMsMCwwOmEyMSwzLDFhMWRkYzkzMmQ0LDAsODQsMTphNDAsXCJmLDFhMWRkYzkzMmQ1Il0sIk1vemlsbGEvNS4wIChXaW5kb3dzIE5UIDEwLjA7IFdpbjY0OyB4NjQpIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS8xMjUuMC4wLjAgU2FmYXJpLzUzNy4zNiIsImh0dHBzOi8vcGF5bWVudHMuZ29vZ2xlLmNvbSJdLG51bGwsbnVsbCwiZW4iLDEsMV0sWyJodHRwczovL3BheW1lbnRzLmdvb2dsZS5jb20vcGF5bWVudHMvcmVkaXJlY3RfZm9ybV9sYW5kaW5nP3N1Y2Nlc3M9dHJ1ZSIsImh0dHBzOi8vcGF5bWVudHMuZ29vZ2xlLmNvbS9wYXltZW50cy9yZWRpcmVjdF9mb3JtX2xhbmRpbmc/c3VjY2Vzcz1mYWxzZSJdXQ=="

FP_MAC = "W1tudWxsLG51bGwsbnVsbCxbbnVsbCxbIlJzMi4wLjY6OjpzMTExLDIsMjZiNWUxOSwwLDc2OSxhMDYzZWJlOSwwLDRhMixlZGQ5OGJhYywwLDE4LDQ4NjNmZDM1LDAsNzY5LGNiMmQ1YzZmLDAsNDdlLDZhZDQ3YzZjLDAsNTNlLDdiZGI0OWY2LDAsNDI4LGI2NTQwMjAwLDAsNzY5LGVlYTgyMGI2LDAsNDdlLDFhYTQzMzEsMCxcIk1hY0ludGVsLGY1NDY4M2YyLDAsXCJHb29nbGUgSW5jLixhZjc5NDUxNSwwLFwiNS4wIDI4TWFjaW50b3NoM2IgSW50ZWwgTWFjIE9TIFggMTBfMTVfNzI5IEFwcGxlV2ViS2l0MmY1MzcuMzYgMjhLSFRNTDJjIGxpa2UgR2Vja28yOSBDaHJvbWUyZjEyNS4wLjAuMCBTYWZhcmkyZjUzNy4zNixkODE3MjNkMSwwLFwiZW4yZFVTLDVjYzNhYjVmLDAsXCJNb3ppbGxhMmY1LjAgMjhNYWNpbnRvc2gzYiBJbnRlbCBNYWMgT1MgWCAxMF8xNV83MjkgQXBwbGVXZWJLaXQyZjUzNy4zNiAyOEtIVE1MMmMgbGlrZSBHZWNrbzI5IENocm9tZTJmMTI1LjAuMC4wIFNhZmFyaTJmNTM3LjM2LDI0YTY2ZGY2LDAsMTJjLFwiV2VkIERlYyAzMSAxOTY5IDE2YTAwM2EwMCBHTVQyZDA4MDAgMjhQYWNpZmljIFN0YW5kYXJkIFRpbWUyOSwyY2EwNTU0ZixcIlBERiBWaWV3ZXIsMCxcIlBvcnRhYmxlIERvY3VtZW50IEZvcm1hdCxcIkNocm9tZSBQREYgVmlld2VyLDAsXCJQb3J0YWJsZSBEb2N1bWVudCBGb3JtYXQsXCJDaHJvbWl1bSBQREYgVmlld2VyLDAsXCJQb3J0YWJsZSBEb2N1bWVudCBGb3JtYXQsXCJNaWNyb3NvZnQgRWRnZSBQREYgVmlld2VyLDAsXCJQb3J0YWJsZSBEb2N1bWVudCBGb3JtYXQsXCJXZWJLaXQgYnVpbHQyZGluIFBERiwwLFwiUG9ydGFibGUgRG9jdW1lbnQgRm9ybWF0LDZjOGI5ZDViLDc3MGM2N2ZjLDAsMDphMjEsMywxYTFkZGM5MzJkNCwwLDg0LDE6YTQwLFwiZiwxYTFkZGM5MzJkNSJdLCJNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMF8xNV83KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvMTI1LjAuMC4wIFNhZmFyaS81MzcuMzYiLCJodHRwczovL3BheW1lbnRzLmdvb2dsZS5jb20iXSxudWxsLG51bGwsImVuIiwxLDFdLFsiaHR0cHM6Ly9wYXltZW50cy5nb29nbGUuY29tL3BheW1lbnRzL3JlZGlyZWN0X2Zvcm1fbGFuZGluZz9zdWNjZXNzPXRydWUiLCJodHRwczovL3BheW1lbnRzLmdvb2dsZS5jb20vcGF5bWVudHMvcmVkaXJlY3RfZm9ybV9sYW5kaW5nP3N1Y2Nlc3M9ZmFsc2UiXV0="

PATH = "/plans?g1_last_touchpoint=37&g1_landing_page=1&otzr=1"
PKG = "com.google.android.apps.subscriptions.red"

# ═══════════════════════════════════════════════════════════
# CORE ENGINE — 8 METHODS
# ═══════════════════════════════════════════════════════════

def build_tokenized_url(plan_key: str, authuser: int = 0, fp: str = None) -> str:
    """METHOD 1: Tokenized Play Checkout (original, proven)."""
    offer = OFFERS.get(plan_key)
    if not offer:
        raise ValueError(f"Unknown plan: {plan_key}. Available: {list(OFFERS.keys())}")
    if fp is None:
        fp = FP_WIN
    item = [
        [f"subs:{PKG}:{offer['sku']}", 21],
        None, None, None, 1, [offer["token"]]
    ]
    ear = [None] * 25
    ear[2] = [None, None, PATH]
    ear[4] = [fp]
    ear[13] = [[item]]
    ear[21] = 1

    ts = int(time.time() * 1000)
    gid = f"I0_{ts}"
    rpc = 1000000 + random.randint(0, 8000000)
    jsh = urllib.parse.quote("m;/_/scs/abc-static/_/js/k=gapi.lb.en.O/d=1/rs=AHpOoo/m=__features__")
    gapi = (f"&usegapi=1&id={gid}&_gfid={gid}"
            f"&parent=https%3A%2F%2Fone.google.com&pfname=&rpctoken={rpc}"
            f"&jsh={jsh}")
    return (f"https://tokenized.play.google.com/eacquire/multiline?authuser={authuser}"
            f"&ear={urllib.parse.quote(json.dumps(ear))}{gapi}")


def build_play_deeplink(sku: str, offer_id: str = None, authuser: int = 0) -> str:
    """METHOD 2: Play Deep Link with offer= param."""
    url = (f"https://play.google.com/store/account/subscriptions"
           f"?sku={sku}&package={PKG}&authuser={authuser}")
    if offer_id:
        url += f"&offer={offer_id}"
    return url


def build_geo_deeplink(sku: str, geo_code: str = "hcm", authuser: int = 0) -> str:
    """METHOD 3: Geographic offer deep link (eft-hcm)."""
    return (f"https://play.google.com/store/account/subscriptions"
            f"?sku={sku}&package={PKG}&offer=eft-{geo_code}&authuser={authuser}")


def build_gemini_path(variant: str = "advanced", authuser: int = 0) -> str:
    """METHOD 4: Gemini AI Premium explore-plan paths."""
    paths = {
        "advanced": "explore-plan/gemini-advanced",
        "ai": "ai",
        "student": "explore-plan/ai-premium-student",
        "ai-student": "ai-student?plans=1,2",
        "upgrade": "upgrade",
    }
    path = paths.get(variant, variant)
    sep = "&" if "?" in path else "?"
    return f"https://one.google.com/{path}{sep}authuser={authuser}"


def build_fi_trial() -> str:
    """METHOD 5: Google Fi free trial (includes Google One storage)."""
    return "https://fi.google.com/about/free-trial"


def build_cross_sku_url(target_sku: str, source_plan: str = "20tb",
                         authuser: int = 0, fp: str = None) -> str:
    """METHOD 6: Cross-SKU Token Injection."""
    offer = OFFERS.get(source_plan)
    if not offer:
        raise ValueError(f"Source plan not found: {source_plan}")
    if fp is None:
        fp = FP_WIN
    item = [
        [f"subs:{PKG}:{target_sku}", 21],
        None, None, None, 1, [offer["token"]]
    ]
    ear = [None] * 25
    ear[2] = [None, None, PATH]
    ear[4] = [fp]
    ear[13] = [[item]]
    ear[21] = 1

    ts = int(time.time() * 1000)
    gid = f"I0_{ts}"
    rpc = 1000000 + random.randint(0, 8000000)
    jsh = urllib.parse.quote("m;/_/scs/abc-static/_/js/k=gapi.lb.en.O/d=1/rs=AHpOoo/m=__features__")
    gapi = (f"&usegapi=1&id={gid}&_gfid={gid}"
            f"&parent=https%3A%2F%2Fone.google.com&pfname=&rpctoken={rpc}"
            f"&jsh={jsh}")
    return (f"https://tokenized.play.google.com/eacquire/multiline?authuser={authuser}"
            f"&ear={urllib.parse.quote(json.dumps(ear))}{gapi}")


def build_yt_premium_trial() -> str:
    """METHOD 7: YouTube Premium bundle trial (includes Google One)."""
    return "https://www.youtube.com/premium"


def build_launch_product(sku: str, authuser: int = 0) -> str:
    """METHOD 8: Play Store launch_product deep link."""
    return (f"https://play.google.com/store/apps/details"
            f"?id={PKG}&launch_product={sku}&authuser={authuser}")


# ═══════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════

C = {
    "R": "\033[0m", "B": "\033[1m", "G": "\033[32m", "Y": "\033[33m",
    "C": "\033[36m", "M": "\033[35m", "DIM": "\033[2m", "BG": "\033[42m",
    "RED": "\033[31m",
}

def pr(msg=""):
    print(f"  {msg}")

def header():
    print(f"\n  {C['B']}{'═' * 60}{C['R']}")
    print(f"  {C['B']}⚡ Ultra Link Generator Pro v3{C['R']}")
    print(f"  {C['DIM']}Google One AI Ultra — 8-Method Activation Engine{C['R']}")
    print(f"  {C['B']}{'═' * 60}{C['R']}")


def show_plans():
    pr(f"\n{C['B']}📋 Available Plans:{C['R']}")
    pr(f"{'─' * 56}")
    for key, o in OFFERS.items():
        star = "★" if key == "20tb" else " "
        pr(f"  {C['G']}{star}{C['R']} [{C['C']}{key:4s}{C['R']}] {C['B']}{o['name']:20s}{C['R']} "
           f"{C['G']}{o['trial']:12s}{C['R']} free → {C['DIM']}{o['after']}{C['R']}")
    pr(f"{'─' * 56}")


def show_all_methods(plan: str = "20tb", authuser: int = 0, fp: str = None):
    """Display ALL 8 activation methods."""
    offer = OFFERS[plan]
    pr(f"\n{C['B']}🎯 ALL 8 ACTIVATION METHODS — {offer['name']}{C['R']}")
    pr(f"{'═' * 65}")

    # Method 1
    url1 = build_tokenized_url(plan, authuser, fp)
    pr(f"\n  {C['G']}① TOKENIZED CHECKOUT{C['R']} {C['DIM']}(original, proven){C['R']}")
    pr(f"     {C['DIM']}Play Billing API → tokenized.play.google.com{C['R']}")
    pr(f"     {url1[:100]}...")

    # Method 2
    url2 = build_play_deeplink(offer["sku"], offer["offer_id"], authuser)
    pr(f"\n  {C['G']}② PLAY DEEP LINK + OFFER{C['R']} {C['DIM']}(params preserved through login){C['R']}")
    pr(f"     {url2}")

    # Method 3
    url3 = build_geo_deeplink(offer["sku"], "hcm", authuser)
    pr(f"\n  {C['G']}③ GEOGRAPHIC OFFER (eft-hcm){C['R']} {C['DIM']}(HCM geo-targeted){C['R']}")
    pr(f"     {url3}")

    # Method 4
    variants = ["advanced", "ai", "student", "ai-student", "upgrade"]
    pr(f"\n  {C['G']}④ GEMINI AI PREMIUM PATHS{C['R']} {C['DIM']}(5 explore-plan variants){C['R']}")
    for v in variants:
        url4 = build_gemini_path(v, authuser)
        pr(f"     {C['DIM']}[{v:12s}]{C['R']} {url4}")

    # Method 5
    pr(f"\n  {C['G']}⑤ GOOGLE FI FREE TRIAL{C['R']} {C['DIM']}(bundle includes Google One storage){C['R']}")
    pr(f"     {build_fi_trial()}")
    pr(f"     {C['DIM']}Also: https://fi.google.com/about/offers{C['R']}")
    pr(f"     {C['DIM']}Signup: https://fi.google.com/signup{C['R']}")

    # Method 6
    cross_skus = ["g1.2tb.ai", "g1.100gb", "g1.30gb"]
    pr(f"\n  {C['G']}⑥ CROSS-SKU TOKEN INJECTION{C['R']} {C['DIM']}(20TB token → different SKUs){C['R']}")
    for cs in cross_skus:
        url6 = build_cross_sku_url(cs, "20tb", authuser, fp)
        pr(f"     {C['DIM']}[{cs:18s}]{C['R']} {url6[:90]}...")

    # Method 7
    pr(f"\n  {C['G']}⑦ YOUTUBE PREMIUM TRIAL{C['R']} {C['DIM']}(bundle includes Google One storage){C['R']}")
    pr(f"     {build_yt_premium_trial()}")
    pr(f"     {C['DIM']}Also: https://www.youtube.com/paid_memberships{C['R']}")

    # Method 8
    url8 = build_launch_product(offer["sku"], authuser)
    pr(f"\n  {C['G']}⑧ PLAY STORE LAUNCH_PRODUCT{C['R']} {C['DIM']}(in-app purchase trigger){C['R']}")
    pr(f"     {url8}")

    pr(f"\n{'═' * 65}")
    pr(f"{C['B']}📌 Campaign-Enhanced Links (params preserved through login):{C['R']}")
    campaigns = [
        ("Gemini Quota", "utm_source=gemini&utm_campaign=gemini_out_of_quota_input"),
        ("YouTube",      "utm_source=youtube&utm_campaign=youtube_premium_trial"),
        ("Pixel",        "utm_source=pixel&utm_campaign=pixel_purchase_trial"),
        ("Trial Flag",   "trial=1"),
    ]
    for name, params in campaigns:
        pr(f"  {C['DIM']}[{name:14s}]{C['R']} https://one.google.com/ai?{params}")
    pr(f"{'═' * 65}")


def show_method(method: str, plan: str = "20tb", authuser: int = 0, fp: str = None):
    """Show links for a specific method category."""
    offer = OFFERS[plan]
    header()

    if method == "all":
        show_all_methods(plan, authuser, fp)
    elif method == "gemini":
        pr(f"\n{C['B']}④ GEMINI AI PREMIUM PATHS{C['R']}")
        for v in ["advanced", "ai", "student", "ai-student", "upgrade"]:
            pr(f"  {build_gemini_path(v, authuser)}")
    elif method == "deeplink":
        pr(f"\n{C['B']}② PLAY DEEP LINKS{C['R']}")
        pr(f"  With offer:    {build_play_deeplink(offer['sku'], offer['offer_id'], authuser)}")
        pr(f"  Geo (HCM):     {build_geo_deeplink(offer['sku'], 'hcm', authuser)}")
        pr(f"  launch_product: {build_launch_product(offer['sku'], authuser)}")
    elif method == "bundle":
        pr(f"\n{C['B']}⑤⑦ BUNDLE TRIALS{C['R']}")
        pr(f"  Google Fi:     {build_fi_trial()}")
        pr(f"  YouTube:       {build_yt_premium_trial()}")
    elif method == "cross-sku":
        pr(f"\n{C['B']}⑥ CROSS-SKU TOKEN INJECTION{C['R']}")
        for sku in ["g1.2tb.ai", "g1.100gb", "g1.30gb", "g1.2tb.ai.annual", "g1.100gb.annual"]:
            url = build_cross_sku_url(sku, plan, authuser, fp)
            pr(f"  [{sku:18s}] {url[:90]}...")
    else:
        pr(f"{C['Y']}Unknown method: {method}. Use: all, gemini, deeplink, bundle, cross-sku{C['R']}")


def gen_single(plan: str, authuser: int = 0, fp: str = None) -> str:
    offer = OFFERS[plan]
    url = build_tokenized_url(plan, authuser, fp)
    pr(f"\n{C['G']}✅ {offer['name']} — {offer['trial']} FREE{C['R']}")
    pr(f"   {C['DIM']}After trial: {offer['after']}{C['R']}")
    pr(f"   {C['DIM']}SKU: {offer['sku']} · Offer: {offer['offer_id']} · Period: {offer['period']}{C['R']}")
    pr(f"   {C['DIM']}authuser={authuser}{C['R']}")
    pr(f"\n{C['C']}🔗 Tokenized Checkout:{C['R']}")
    pr(f"   {url}")
    # Also show alternative methods
    pr(f"\n{C['C']}🔗 Alternative Links:{C['R']}")
    pr(f"   Play Deep Link:    {build_play_deeplink(offer['sku'], offer['offer_id'], authuser)}")
    pr(f"   Geo (HCM):         {build_geo_deeplink(offer['sku'], 'hcm', authuser)}")
    pr(f"   Gemini Advanced:   {build_gemini_path('advanced', authuser)}")
    pr(f"   launch_product:    {build_launch_product(offer['sku'], authuser)}")
    return url


def gen_batch(plan: str, count: int, fp: str = None) -> list:
    urls = []
    offer = OFFERS[plan]
    pr(f"\n{C['B']}📋 Batch: {count} links for {offer['name']}{C['R']}\n")
    for i in range(count):
        url = build_tokenized_url(plan, i, fp)
        urls.append(url)
        pr(f"  {C['DIM']}authuser={i:2d}{C['R']}: {url[:80]}...")
    return urls


def gen_all(fp: str = None) -> dict:
    all_links = {}
    for plan_key, offer in OFFERS.items():
        all_links[plan_key] = []
        pr(f"\n{C['B']}{'═' * 50}{C['R']}")
        pr(f"{C['B']}{offer['name']} — {offer['trial']} FREE{C['R']}")
        pr(f"{C['B']}{'═' * 50}{C['R']}")
        for au in range(5):
            url = build_tokenized_url(plan_key, au, fp)
            all_links[plan_key].append({"authuser": au, "url": url})
            pr(f"  {C['DIM']}[authuser={au}]{C['R']} {url[:80]}...")
        # Also show alternative links
        pr(f"\n  {C['DIM']}Alternative Methods:{C['R']}")
        pr(f"    Play Deep Link: {build_play_deeplink(offer['sku'], offer['offer_id'])}")
        pr(f"    Geo (HCM):      {build_geo_deeplink(offer['sku'], 'hcm')}")
        pr(f"    launch_product: {build_launch_product(offer['sku'])}")

    pr(f"\n{C['B']}📌 Gemini AI Premium Paths{C['R']}")
    pr(f"{'─' * 50}")
    for v in ["advanced", "ai", "student", "ai-student", "upgrade"]:
        pr(f"  [{v:12s}] {build_gemini_path(v)}")

    pr(f"\n{C['B']}📌 Bundle Trial Paths{C['R']}")
    pr(f"  Google Fi:     {build_fi_trial()}")
    pr(f"  YouTube:       {build_yt_premium_trial()}")

    return all_links


def show_skus():
    pr(f"\n{C['B']}🔍 Google One SKU Database (v3 — expanded){C['R']}")
    pr(f"{'─' * 80}")
    pr(f"  {'SKU ID':<25s} {'Tier':<20s} {'Storage':<8s} {'Price':<14s} {'Token'} {'Source'}")
    pr(f"{'─' * 80}")
    for sku, info in SKU_DATABASE.items():
        token_status = f"{C['G']}✅{C['R']}" if info["has_token"] else f"{C['Y']}❓{C['R']}"
        pr(f"  {sku:<25s} {info['tier']:<20s} {info['storage']:<8s} {info['price']:<14s} {token_status}  {C['DIM']}{info['source']}{C['R']}")
    pr(f"{'─' * 80}")
    pr(f"  {C['DIM']}Total: {len(SKU_DATABASE)} SKUs · {sum(1 for v in SKU_DATABASE.values() if v['has_token'])} with tokens{C['R']}")

    pr(f"\n{C['B']}🔑 Offer Patterns (categorized){C['R']}")
    for cat, patterns in OFFER_PATTERNS.items():
        pr(f"  {C['C']}{cat:12s}{C['R']}: {', '.join(patterns)}")

    pr(f"\n{C['B']}🌍 Geographic Offer Discovery{C['R']}")
    pr(f"  {C['G']}eft-hcm{C['R']}    — Ho Chi Minh City (confirmed on Play Store page)")
    pr(f"  {C['DIM']}eft-radius{C['R']} — CSS animation (mdc-circular-progress, NOT an offer)")
    pr(f"  {C['DIM']}eft-spin{C['R']}   — CSS animation (mdc-circular-progress, NOT an offer)")


def show_timer(activate_date_str: str):
    try:
        activate = datetime.strptime(activate_date_str, "%Y-%m-%d")
    except ValueError:
        pr(f"{C['Y']}⚠️  Invalid date format. Use YYYY-MM-DD{C['R']}")
        return
    pr(f"\n{C['B']}⏰ Cancel Reminders{C['R']}")
    pr(f"{'─' * 56}")
    for key, offer in OFFERS.items():
        months = offer["trial_months"]
        expiry = activate + timedelta(days=months * 30)
        remind = expiry - timedelta(days=7)
        days_left = (expiry - datetime.now()).days
        if days_left < 0:
            status = f"{C['Y']}⚠️  EXPIRED {abs(days_left)} days ago{C['R']}"
        elif days_left < 7:
            status = f"{C['RED']}🚨 CANCEL NOW! {days_left} days left{C['R']}"
        elif days_left < 30:
            status = f"{C['Y']}⏰ {days_left} days left{C['R']}"
        else:
            status = f"{C['G']}✅ {days_left} days left{C['R']}"
        pr(f"  {C['B']}{offer['name']:<24s}{C['R']}")
        pr(f"    Trial: {offer['trial']} · Expiry: {expiry.strftime('%Y-%m-%d')} · Remind: {remind.strftime('%Y-%m-%d')}")
        pr(f"    Status: {status}")
        pr(f"    Cancel: https://play.google.com/store/account/subscriptions")
        pr()


def save_links(links: dict, output_path: str):
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("# Ultra Activation Links — Pro v3 (8-Method Engine)\n")
        f.write(f"# Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")

        for plan_key, urls in links.items():
            offer = OFFERS[plan_key]
            f.write(f"## {offer['name']} — {offer['trial']} FREE\n")
            f.write(f"SKU: `{offer['sku']}` · Offer: `{offer['offer_id']}` · Period: `{offer['period']}`\n\n")
            f.write("### Method 1: Tokenized Checkout\n")
            for item in urls:
                f.write(f"#### authuser={item['authuser']}\n```\n{item['url']}\n```\n\n")
            f.write("### Method 2: Play Deep Link + Offer\n")
            f.write(f"```\n{build_play_deeplink(offer['sku'], offer['offer_id'])}\n```\n\n")
            f.write("### Method 3: Geographic (eft-hcm)\n")
            f.write(f"```\n{build_geo_deeplink(offer['sku'], 'hcm')}\n```\n\n")
            f.write("### Method 8: launch_product\n")
            f.write(f"```\n{build_launch_product(offer['sku'])}\n```\n\n")

        f.write("---\n\n## Method 4: Gemini AI Premium Paths\n\n")
        for v in ["advanced", "ai", "student", "ai-student", "upgrade"]:
            f.write(f"- [{v}]({build_gemini_path(v)})\n")

        f.write("\n## Method 5: Google Fi Bundle\n")
        f.write(f"- [Free Trial]({build_fi_trial()})\n")
        f.write("- [Offers](https://fi.google.com/about/offers)\n")

        f.write("\n## Method 7: YouTube Premium Bundle\n")
        f.write(f"- [YouTube Premium]({build_yt_premium_trial()})\n")
        f.write("- [Paid Memberships](https://www.youtube.com/paid_memberships)\n")

        f.write("\n## Campaign-Enhanced Links\n")
        for name, params in [("Gemini Quota", "utm_source=gemini&utm_campaign=gemini_out_of_quota_input"),
                              ("YouTube", "utm_source=youtube&utm_campaign=youtube_premium_trial"),
                              ("Pixel", "utm_source=pixel&utm_campaign=pixel_purchase_trial"),
                              ("Trial", "trial=1")]:
            f.write(f"- [{name}](https://one.google.com/ai?{params})\n")

        f.write("\n---\n\n## Useful Links\n\n")
        f.write("- [My Subscriptions](https://play.google.com/store/account/subscriptions)\n")
        f.write("- [Payment Methods](https://pay.google.com/gp/w/u/0/home/paymentmethods)\n")
        f.write("- [Google One Storage](https://one.google.com/storage)\n")
        f.write("- [Gemini AI](https://gemini.google.com/)\n")
    pr(f"\n{C['G']}💾 Saved to: {os.path.abspath(output_path)}{C['R']}")


def export_json(links: dict, output_path: str):
    data = {
        "generated": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "version": "pro-v3",
        "methods": {
            "1_tokenized": "tokenized.play.google.com/eacquire/multiline",
            "2_play_deeplink": "play.google.com/store/account/subscriptions?offer=",
            "3_geographic": "eft-hcm geo-targeted",
            "4_gemini_paths": "one.google.com/explore-plan/",
            "5_fi_trial": "fi.google.com/about/free-trial",
            "6_cross_sku": "tokenized checkout with mismatched SKU/token",
            "7_yt_premium": "youtube.com/premium bundle",
            "8_launch_product": "play.google.com/store/apps/details?launch_product=",
        },
        "plans": {}
    }
    for plan_key, urls in links.items():
        offer = OFFERS[plan_key]
        data["plans"][plan_key] = {
            "name": offer["name"], "sku": offer["sku"],
            "trial": offer["trial"], "after": offer["after"],
            "offer_id": offer["offer_id"], "period": offer["period"],
            "links": {
                "tokenized": urls,
                "play_deeplink": build_play_deeplink(offer["sku"], offer["offer_id"]),
                "geo_hcm": build_geo_deeplink(offer["sku"], "hcm"),
                "launch_product": build_launch_product(offer["sku"]),
            }
        }
    data["gemini_paths"] = {v: build_gemini_path(v) for v in ["advanced", "ai", "student", "ai-student", "upgrade"]}
    data["bundle_trials"] = {"fi": build_fi_trial(), "youtube": build_yt_premium_trial()}

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    pr(f"\n{C['G']}💾 JSON exported to: {os.path.abspath(output_path)}{C['R']}")


def start_server(port: int = 8888):
    web_dir = Path(__file__).parent / "web"
    if not web_dir.exists():
        pr(f"{C['Y']}❌ Web directory not found: {web_dir}{C['R']}")
        return
    os.chdir(web_dir)
    handler = http.server.SimpleHTTPRequestHandler
    server = http.server.HTTPServer(("127.0.0.1", port), handler)
    pr(f"\n{C['G']}🌐 Server started: http://127.0.0.1:{port}/{C['R']}")
    pr(f"{C['DIM']}📂 Serving: {web_dir}{C['R']}")
    pr(f"{C['DIM']}Press Ctrl+C to stop.{C['R']}\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()
        pr("\nServer stopped.")


def interactive_mode():
    header()
    show_plans()
    pr(f"\n{C['B']}Commands:{C['R']}")
    pr(f"  {C['C']}20tb{C['R']}       — Generate Ultra 20TB link (★ best)")
    pr(f"  {C['C']}30tb{C['R']}       — Generate Ultra 30TB link")
    pr(f"  {C['C']}2tb{C['R']}        — Generate Premium 2TB link")
    pr(f"  {C['C']}all{C['R']}        — Generate ALL links (all methods)")
    pr(f"  {C['C']}methods{C['R']}    — Show ALL 8 activation methods")
    pr(f"  {C['C']}gemini{C['R']}     — Gemini AI Premium paths")
    pr(f"  {C['C']}deeplink{C['R']}   — Play deep link variations")
    pr(f"  {C['C']}bundle{C['R']}     — Fi + YouTube bundle trials")
    pr(f"  {C['C']}cross-sku{C['R']}  — Cross-SKU token injection")
    pr(f"  {C['C']}save{C['R']}       — Generate & save to file")
    pr(f"  {C['C']}skus{C['R']}       — Show SKU database")
    pr(f"  {C['C']}serve{C['R']}      — Start web server")
    pr(f"  {C['C']}q{C['R']}          — Quit")

    while True:
        try:
            cmd = input(f"\n  {C['C']}❯{C['R']} ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            break
        if cmd in ("q", "quit", "exit"):
            break
        elif cmd == "methods":
            show_all_methods()
        elif cmd in ("gemini", "deeplink", "bundle", "cross-sku"):
            show_method(cmd)
        elif cmd == "all":
            gen_all()
        elif cmd == "save":
            links = {}
            for pk in OFFERS:
                links[pk] = [{"authuser": au, "url": build_tokenized_url(pk, au)} for au in range(5)]
            save_links(links, "ultra_links.md")
            export_json(links, "ultra_links.json")
        elif cmd == "skus":
            show_skus()
        elif cmd == "serve":
            start_server()
        elif cmd in OFFERS:
            gen_single(cmd)
        else:
            pr(f"{C['Y']}Unknown: {cmd}{C['R']}")


def main():
    ap = argparse.ArgumentParser(
        description="Ultra Link Generator Pro v3 — 8-Method Google One AI Ultra $0 Activation"
    )
    ap.add_argument("--plan", choices=list(OFFERS.keys()), help="Plan: 20tb, 30tb, 2tb")
    ap.add_argument("--authuser", type=int, default=0, help="authuser index (default: 0)")
    ap.add_argument("--batch", type=int, help="Generate N authuser links")
    ap.add_argument("--all", action="store_true", help="Generate ALL plans × authusers")
    ap.add_argument("--method", choices=["all", "gemini", "deeplink", "bundle", "cross-sku"],
                    help="Show specific method category")
    ap.add_argument("--save", nargs="?", const="ultra_links.md", help="Save links to file")
    ap.add_argument("--json", nargs="?", const="ultra_links.json", help="Export as JSON")
    ap.add_argument("--skus", action="store_true", help="Show SKU database")
    ap.add_argument("--timer", type=str, help="Cancel timer (YYYY-MM-DD activate date)")
    ap.add_argument("--fp", choices=["win", "mac"], default="win", help="Fingerprint: win or mac")
    ap.add_argument("--serve", action="store_true", help="Start local web server")
    ap.add_argument("--port", type=int, default=8888, help="Web server port")
    ap.add_argument("--open", action="store_true", help="Auto-open link in browser")
    args = ap.parse_args()

    fp = FP_WIN if args.fp == "win" else FP_MAC

    if args.serve:
        header()
        start_server(args.port)
        return
    if args.skus:
        header()
        show_skus()
        return
    if args.timer:
        header()
        show_timer(args.timer)
        return
    if args.method:
        header()
        show_method(args.method, args.plan or "20tb", args.authuser, fp)
        return

    if not any([args.plan, args.batch, args.all, args.save is not None, args.json is not None]):
        interactive_mode()
        return

    header()

    if args.all:
        all_links = gen_all(fp)
        if args.save:
            save_links(all_links, args.save)
        if args.json is not None:
            export_json(all_links, args.json)
        return

    plan = args.plan or "20tb"
    if args.batch:
        urls = gen_batch(plan, args.batch, fp)
        links = {plan: [{"authuser": i, "url": u} for i, u in enumerate(urls)]}
        if args.save:
            save_links(links, args.save)
        if args.json is not None:
            export_json(links, args.json)
    else:
        url = gen_single(plan, args.authuser, fp)
        if args.open:
            import webbrowser
            webbrowser.open(url)
        links = {plan: [{"authuser": args.authuser, "url": url}]}
        if args.save:
            save_links(links, args.save)
        if args.json is not None:
            export_json(links, args.json)


if __name__ == "__main__":
    main()
