#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════
G1 Ultra $0 — ADB Token Sniffer v1.0
═══════════════════════════════════════════════════════════

Extract Google One offer tokens WITHOUT rooting device.
Uses ADB logcat to capture Play Billing API responses.

REQUIREMENTS:
  - ADB installed (Android SDK Platform Tools)
  - USB debugging enabled on Android device
  - Device connected via USB or WiFi ADB

USAGE:
  python adb_token_sniffer.py
  python adb_token_sniffer.py --output tokens.json

HOW IT WORKS:
  1. Clears logcat buffer
  2. Sets Play Billing Library to verbose logging
  3. Monitors logcat for offer token patterns
  4. User opens Google One app and browses plans
  5. Tokens are captured and saved

═══════════════════════════════════════════════════════════
"""

import subprocess
import re
import json
import sys
import time
import signal
from pathlib import Path

# Token patterns
TOKEN_PATTERN = re.compile(r'(AYrTWi[A-Za-z0-9+/=]{20,}|AVbCH[A-Za-z0-9+/=]{20,})')
SKU_PATTERN = re.compile(r'(g1\.play\.[a-z0-9.]+)')
PRICE_PATTERN = re.compile(r'(\$[\d,.]+|US\$[\d,.]+|₫[\d,.]+|Free|0\.00)')

extracted = {}
running = True

def signal_handler(sig, frame):
    global running
    running = False
    print("\n[SNIFFER] Stopping...")

signal.signal(signal.SIGINT, signal_handler)

def run_adb(args, timeout=10):
    try:
        result = subprocess.run(
            ["adb"] + args,
            capture_output=True, text=True, timeout=timeout
        )
        return result.stdout.strip(), result.returncode
    except subprocess.TimeoutExpired:
        return "", 1
    except FileNotFoundError:
        print("[ERROR] ADB not found. Install Android SDK Platform Tools.")
        sys.exit(1)

def check_device():
    out, code = run_adb(["devices"])
    lines = [l for l in out.split("\n") if "\tdevice" in l]
    if not lines:
        print("[ERROR] No Android device connected.")
        print("  1. Enable USB debugging in Developer Options")
        print("  2. Connect device via USB")
        print("  3. Accept USB debugging prompt on device")
        sys.exit(1)
    device_id = lines[0].split("\t")[0]
    print(f"[SNIFFER] Device: {device_id}")
    return device_id

def enable_billing_logging():
    """Enable verbose logging for Play Billing Library"""
    cmds = [
        ["shell", "setprop", "log.tag.BillingClient", "VERBOSE"],
        ["shell", "setprop", "log.tag.PlayBilling", "VERBOSE"],
        ["shell", "setprop", "log.tag.BillingFlowParams", "VERBOSE"],
    ]
    for cmd in cmds:
        run_adb(cmd, timeout=5)

def clear_logcat():
    run_adb(["logcat", "-c"], timeout=5)

def start_monitoring(output_file):
    global running
    
    print("\n" + "═" * 60)
    print("  G1 Ultra $0 — ADB Token Sniffer")
    print("═" * 60)
    print()
    print("  INSTRUCTIONS:")
    print("  1. Open Google One app on your phone")
    print("  2. Browse through ALL available plans")
    print("  3. Click on each plan to view details")
    print("  4. Tokens will appear here automatically")
    print("  5. Press Ctrl+C when done")
    print()
    print("═" * 60 + "\n")
    
    # Start logcat with filters
    proc = subprocess.Popen(
        ["adb", "logcat", "-v", "time",
         "BillingClient:V", "PlayBilling:V", "BillingFlowParams:V",
         "GooglePlayBilling:V", "IabHelper:V",
         "OkHttp:V", "NetworkResponse:V",
         "*:S"],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, bufsize=1
    )
    
    # Also run a broader logcat for token pattern matching
    proc2 = subprocess.Popen(
        ["adb", "logcat", "-v", "time", "*:V"],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, bufsize=1
    )
    
    token_count = 0
    seen_lines = set()
    
    try:
        while running:
            # Read from both processes
            for p in [proc, proc2]:
                if p.stdout.readable():
                    try:
                        import select
                        # Non-blocking read attempt
                        line = p.stdout.readline()
                        if not line:
                            continue
                        
                        line = line.strip()
                        if line in seen_lines:
                            continue
                        seen_lines.add(line)
                        if len(seen_lines) > 10000:
                            seen_lines.clear()
                        
                        # Search for tokens
                        tokens = TOKEN_PATTERN.findall(line)
                        skus = SKU_PATTERN.findall(line)
                        
                        if tokens:
                            for token in tokens:
                                sku = skus[0] if skus else "unknown"
                                key = f"{sku}::{token[:20]}"
                                if key not in extracted:
                                    extracted[key] = {
                                        "sku": sku,
                                        "token": token,
                                        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                                        "logline": line[:200]
                                    }
                                    token_count += 1
                                    print(f"\n[★ TOKEN #{token_count}]")
                                    print(f"  SKU:   {sku}")
                                    print(f"  Token: {token}")
                                    print(f"  Time:  {time.strftime('%H:%M:%S')}")
                                    print()
                        
                        # Also look for offer/pricing info
                        if "offer" in line.lower() and "g1.play" in line:
                            print(f"[OFFER] {line[:150]}")
                        
                    except Exception:
                        time.sleep(0.1)
            
            time.sleep(0.05)
    
    except KeyboardInterrupt:
        pass
    finally:
        proc.terminate()
        proc2.terminate()
    
    # Save results
    if extracted:
        result = {
            "extracted_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "device": check_device() if False else "unknown",
            "tokens": list(extracted.values())
        }
        
        output = Path(output_file)
        output.write_text(json.dumps(result, indent=2, ensure_ascii=False))
        
        print(f"\n{'═' * 60}")
        print(f"  RESULTS: {token_count} token(s) extracted")
        print(f"  Saved to: {output}")
        print(f"{'═' * 60}")
        
        print("\n  NEXT STEPS:")
        print("  1. Open Chrome Extension")
        print("  2. Click 'Token Registry'")
        print("  3. Paste tokens for each SKU")
        print("  4. Select the plan → checkout at $0.00")
        print()
        
        # Print copy-paste format
        print("  TOKENS FOR EXTENSION:")
        for entry in extracted.values():
            print(f"    {entry['sku']} → {entry['token']}")
    else:
        print("\n[SNIFFER] No tokens captured.")
        print("  Tips:")
        print("  - Make sure Google One app is open")
        print("  - Browse through plan selection screens")
        print("  - Try clicking 'Subscribe' on different plans")
        print("  - Some plans may not have free trial offers")

def main():
    output_file = "extracted_tokens.json"
    if "--output" in sys.argv:
        idx = sys.argv.index("--output")
        if idx + 1 < len(sys.argv):
            output_file = sys.argv[idx + 1]
    
    check_device()
    enable_billing_logging()
    clear_logcat()
    start_monitoring(output_file)

if __name__ == "__main__":
    main()
