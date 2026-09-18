#!/usr/bin/env python3
"""Compare one isolated candidate survey against the identical authoritative packet."""
import json
import hashlib
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from analyze_shot import read_png

BASELINE = Path(sys.argv[1] if len(sys.argv) > 1 else "artifacts")
CANDIDATE = Path(sys.argv[2] if len(sys.argv) > 2 else ".context/ab/transfer-network/captures")
OUT = Path(sys.argv[3] if len(sys.argv) > 3 else ".context/ab/transfer-network/full-survey-audit.json")
BASELINE_ARTIFACT = Path(os.environ.get("BASELINE_ARTIFACT_PATH", "editor/facility-built.glb"))
CANDIDATE_ARTIFACT = Path(os.environ.get("CANDIDATE_ARTIFACT_PATH", ".context/ab/transfer-network/facility-built-transfer-network.glb"))
BASELINE_MANIFEST = Path(os.environ.get("BASELINE_MANIFEST_PATH", "out/visual-survey.json"))
CANDIDATE_MANIFEST = Path(os.environ.get("CANDIDATE_MANIFEST_PATH", ".context/ab/transfer-network/visual-survey.json"))
STRATEGY = os.environ.get("SURVEY_STRATEGY", "elevated-interior-transfer-network-v1")
VIEWS = [
    "top", "orbit", "xray", "zone-spawn", "zone-courtyard", "zone-warehouse", "zone-plant", "zone-bridge",
    "zone-tunnels", "zone-core", "zone-boundary", "route-main-surface", "route-covered", "route-rear-alley",
    "route-north-ring", "route-south-retreat", "route-flank-backdoor", "objective-core", "cover-courtyard",
    "tunnel-portal", "vertical-connector",
]

def metrics(path):
    width, height, pixels = read_png(str(path))
    total = width * height
    sky = dark = mass = 0
    low = 999
    high = -1
    for index in range(0, len(pixels), 3):
        r, g, b = pixels[index:index + 3]
        luminance = (r * 299 + g * 587 + b * 114) // 1000
        low = min(low, luminance)
        high = max(high, luminance)
        if b > r + 15 and b > 120 and b > 150 and r > 100:
            sky += 1
        else:
            mass += 1
            if luminance < 70:
                dark += 1
    contrast = high - low
    return {
        "width": width, "height": height, "sky": sky / total, "mass": mass / total,
        "dark": dark / total, "contrast": contrast,
        "renderGate": (sky / total <= 0.995 and mass / total >= 0.05 and dark / total >= 0.01 and contrast >= 120),
    }, pixels

def file_binding(path):
    data = path.read_bytes()
    return {"path": str(path), "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)}

def manifest_binding(path):
    binding = file_binding(path)
    manifest = json.loads(path.read_text())
    binding["sourceCommit"] = manifest.get("sourceCommit")
    binding["sourceSha256"] = manifest.get("sourceSha256")
    binding["generatorSha256"] = manifest.get("generatorSha256")
    binding["artifact"] = manifest.get("artifact")
    binding["views"] = len(manifest.get("views", []))
    return binding

def compare(base_path, candidate_path):
    base, base_pixels = metrics(base_path)
    candidate, candidate_pixels = metrics(candidate_path)
    if len(base_pixels) != len(candidate_pixels):
        raise ValueError(f"dimension mismatch {base_path} {candidate_path}")
    channel_deltas = [abs(a - b) for a, b in zip(base_pixels, candidate_pixels)]
    changed5 = sum(value > 5 for value in channel_deltas[::3]) / (len(base_pixels) / 3)
    changed2 = sum(value > 2 for value in channel_deltas[::3]) / (len(base_pixels) / 3)
    mean_delta = sum(channel_deltas) / len(channel_deltas) / 255
    return {
        "baseline": base,
        "candidate": candidate,
        "meanRgbDelta": mean_delta,
        "changedPixelsAt5": changed5,
        "changedPixelsAt2": changed2,
        "maxChannelDelta": max(channel_deltas),
    }

views = []
missing = []
for view_id in VIEWS:
    baseline_path = BASELINE / f"canonical-{view_id}.png"
    candidate_path = CANDIDATE / f"canonical-{view_id}.png"
    if not baseline_path.exists() or not candidate_path.exists():
        missing.append(view_id)
        continue
    result = compare(baseline_path, candidate_path)
    result.update({"id": view_id, "baselinePath": str(baseline_path), "candidatePath": str(candidate_path)})
    if view_id == "xray":
        result["renderGate"] = "QUARANTINED_KNOWN_XRAY_HARNESS"
    else:
        result["renderGate"] = "PASS" if result["candidate"]["renderGate"] else "FAIL"
    result["materiallyChanged"] = result["meanRgbDelta"] >= 0.0005 or result["changedPixelsAt5"] >= 0.005
    views.append(result)

by_id = {view["id"]: view for view in views}
valid = [view for view in views if view["id"] != "xray"]
render_failures = [view["id"] for view in valid if view["renderGate"] != "PASS"]
regressions = [view["id"] for view in valid if view["baseline"]["renderGate"] and not view["candidate"]["renderGate"]]
macro_ids = ["top", "orbit", "zone-courtyard", "zone-core"]
macro_changed = [view_id for view_id in macro_ids if by_id.get(view_id, {}).get("materiallyChanged")]
macro_view_changed = bool(set(macro_changed) & {"top", "orbit"})
zone_view_changed = bool(set(macro_changed) & {"zone-courtyard", "zone-core"})
classification = "REJECTED_INCOMPLETE_SURVEY" if missing else (
    "REJECTED_RENDER_OR_REGRESSION" if render_failures or regressions else
    "GLOBAL_MACRO_IMPROVEMENT" if len(macro_changed) >= 2 and macro_view_changed and zone_view_changed else
    "REJECTED_LOCAL_ONLY"
)
result = {
    "schemaVersion": 1,
    "strategy": STRATEGY,
    "classification": classification,
    "globalVisualGate": "FAIL",
    "reason": "A/B evidence is a recovery measurement; it does not replace independent global visual acceptance or sustained visible performance.",
    "baselineArtifact": file_binding(BASELINE_ARTIFACT),
    "candidateArtifact": file_binding(CANDIDATE_ARTIFACT),
    "baselineSurveyManifest": manifest_binding(BASELINE_MANIFEST),
    "candidateSurveyManifest": manifest_binding(CANDIDATE_MANIFEST),
    "summary": {
        "requestedViews": len(VIEWS), "capturedViews": len(views), "missingViews": missing,
        "validViews": len(valid), "renderFailures": render_failures, "regressions": regressions,
        "macroChangedViews": macro_changed, "macroViewChanged": macro_view_changed, "zoneViewChanged": zone_view_changed,
        "materialThreshold": {"meanRgbDelta": 0.0005, "changedPixelsAt5": 0.005},
    },
    "xrayNote": "Candidate X-ray remains quarantined because the known capture harness produces an all-black frame; the preserved valid authoritative X-ray is not substituted into candidate evidence.",
    "views": views,
}
binding_errors = []
for label, manifest, artifact in (("baseline", result["baselineSurveyManifest"], result["baselineArtifact"]), ("candidate", result["candidateSurveyManifest"], result["candidateArtifact"])):
    manifest_artifact = manifest.get("artifact") or {}
    if manifest_artifact.get("sha256") != artifact["sha256"]:
        binding_errors.append(f"{label} survey manifest artifact hash does not match artifact")
    if manifest_artifact.get("bytes") != artifact["bytes"]:
        binding_errors.append(f"{label} survey manifest artifact size does not match artifact")
result["binding"] = {"status": "PASS" if not binding_errors else "FAIL", "errors": binding_errors}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result["summary"], indent=2))
print(f"SURVEY AUDIT: {classification}")
if missing or render_failures or regressions or binding_errors:
    raise SystemExit(1)
