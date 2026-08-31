#!/usr/bin/env python3
"""Pixel-analysis review gate for render screenshots. No eyes needed — numbers only.
Scores: not-blank, sky fraction, building mass fraction, shadow presence, contrast.
Usage: analyze_shot.py <png> [--min-building 0.05]"""
import sys, struct, zlib

def read_png(path):
    d = open(path, 'rb').read()
    assert d[:8] == b'\x89PNG\r\n\x1a\n', 'not a png'
    pos, w, h, rows = 8, 0, 0, []
    idat = b''
    while pos < len(d):
        ln = struct.unpack('>I', d[pos:pos+4])[0]
        typ = d[pos+4:pos+8]
        chunk = d[pos+8:pos+8+ln]
        if typ == b'IHDR':
            w, h, bd, ct = struct.unpack('>IIBB', chunk[:10])
            assert bd == 8 and ct in (2, 6), f'unsupported {bd}bit ct{ct}'
        elif typ == b'IDAT':
            idat += chunk
        elif typ == b'IEND':
            break
        pos += 12 + ln
    raw = zlib.decompress(idat)
    bpp = 3 if struct.unpack('>B', b'2') or True else 4
    # reconstruct scanlines (filter types 0-4), ct2=RGB ct6=RGBA
    nch = 3
    stride = w * nch
    out = bytearray(h * stride)
    prev = bytearray(stride)
    p = 0
    for y in range(h):
        f = raw[p]; p += 1
        line = bytearray(raw[p:p+stride]); p += stride
        if f == 1:
            for i in range(nch, stride): line[i] = (line[i] + line[i-nch]) & 255
        elif f == 2:
            for i in range(stride): line[i] = (line[i] + prev[i]) & 255
        elif f == 3:
            for i in range(stride):
                a = line[i-nch] if i >= nch else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif f == 4:
            for i in range(stride):
                a = line[i-nch] if i >= nch else 0
                b = prev[i]
                c = prev[i-nch] if i >= nch else 0
                pp = a + b - c
                pa, pb, pc = abs(pp-a), abs(pp-b), abs(pp-c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        out[y*stride:(y+1)*stride] = line
        prev = line
    return w, h, out

def main():
    path = sys.argv[1]
    min_b = 0.05
    if '--min-building' in sys.argv:
        min_b = float(sys.argv[sys.argv.index('--min-building')+1])
    w, h, px = read_png(path)
    n = w * h
    # classify pixels
    sky = green = water = shadow = mass = 0
    lum_min, lum_max = 999, -1
    for i in range(0, len(px), 3):
        r, g, b = px[i], px[i+1], px[i+2]
        lum = (r*299 + g*587 + b*114) // 1000
        lum_min = min(lum_min, lum); lum_max = max(lum_max, lum)
        if b > r + 15 and b > 120:  # sky blue / water
            if b > 150 and r > 100: sky += 1
            else: water += 1
        elif g > r + 10 and g > b + 10: green += 1
        elif lum < 70: shadow += 1
        else: mass += 1
    fr = lambda c: c / n
    print(f'size {w}x{h}')
    print(f'sky {fr(sky):.3f}  water {fr(water):.3f}  green {fr(green):.3f}  mass {fr(mass):.3f}  dark {fr(shadow):.3f}')
    print(f'luma range {lum_min}-{lum_max}  contrast {lum_max-lum_min}')
    fails = []
    if n == 0 or (fr(sky) > 0.995): fails.append('BLANK/sky-only frame — render did not draw geometry')
    if fr(mass) < min_b: fails.append(f'building mass {fr(mass):.3f} < {min_b}')
    if fr(shadow) < 0.01: fails.append('no shadow/dark pixels — lighting flat or shadows culled')
    if (lum_max - lum_min) < 120: fails.append('low contrast — likely washed out')
    for f in fails: print('FAIL', f)
    print('PASS: render gate green' if not fails else f'FAIL: {len(fails)} issue(s)')
    sys.exit(1 if fails else 0)

main()
