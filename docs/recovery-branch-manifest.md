# Recovery branch manifest

Branch: `hoplite/sestos-fdc06629`

Base: `b12c0af8c30b989fa709c95c2e7f1fd92b17c1ae`

## Tracked delivery inputs

- `blockout/blockout-full-v1.json` — authored source, unchanged.
- `editor/facility-built.glb` — authoritative runtime artifact, SHA-256
  `1015ab60aa94d195567c052fd3b2178c4c160dba37e3dd8283aabd0790b466db`.
- `editor/blockout-full.glb` — blockout reference layer used by the viewer.
- `editor/blockout-viewer.html` and `editor/blockout-render-worker.js` — viewer
  and worker runtime.
- `tools/` recovery auditors, survey capture, PNG analysis, map generation,
  and viewer checks.
- `.context/ab/director-macro-cycle-4/v32/` — retained v32 generator chain,
  candidate GLB, 21-view survey, direct-readback integrity, PNG analysis,
  comparison board, structural audit, visual review, and evidence manifest.
- `docs/REMEDIATION-PLAN.md` and
  `references/inspiration/user-supplied-industrial-campus-board.png` — tracked
  source material required to rerun and review the recovery package.

## Merge state

The retained candidate is technically audited but remains fail-closed:
visual approval is `FAIL`, user map approval is `PENDING`, historical
authoritative identity reconciliation is `UNRESOLVED`, and performance work
is deferred. This branch is mergeable as recovery tooling and evidence, not
as `FINAL MAP` promotion.

Large prior iterations and temporary runtime files remain local scratch under
`.context/`; they are intentionally excluded from the merge package.
