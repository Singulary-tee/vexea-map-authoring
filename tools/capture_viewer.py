#!/usr/bin/env python3
"""Screenshot editor/viewer.html via playwright (codespace). Writes /tmp/facility-v3-shot.png."""
import sys
from playwright.sync_api import sync_playwright

url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8123/viewer.html"
out = sys.argv[2] if len(sys.argv) > 2 else "/tmp/facility-v3-shot.png"
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1400, "height": 900})
    pg.goto(url)
    pg.wait_for_function("window.__ready === true", timeout=20000)
    pg.wait_for_timeout(1500)  # let first frames settle
    pg.screenshot(path=out)
    b.close()
print("shot-ok", out)
