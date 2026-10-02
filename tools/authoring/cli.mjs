#!/usr/bin/env node
// VEXEA authoring substrate — CLI. Every result is JSON the LLM can act on.
// Usage: node tools/authoring/cli.mjs <command> [--json '<args-json>'] [k=v ...]
import { opsCommand } from './dispatch.mjs';

const [command, ...rest] = process.argv.slice(2);
if (!command || command === 'help') {
  console.log(`commands:
  init
  create_object          type=window name="..." 
  author_object          object_id=...            (promotes draft -> authored; fails loud)
  integrate_object       object_id=... pos=x,y,z rotY=deg expected_revision=N [operation_id=...]
  move_object            instance_id=... pos=x,y,z expected_revision=N [operation_id=...]
  rotate_object          instance_id=... rotY=deg expected_revision=N
  resize_object          instance_id=... size=w,h,d expected_revision=N
  place_relative         instance_id=... target_segment|target_instance=... relation=... [offset=x,y,z] expected_revision=N
  inspect_object         object_id=... [include_relationships=1]
  inspect_region         bounds=minX,minZ,maxX,maxZ [limit=N] [cursor=N]
  relationships          instance_id=...
  validate_world
  undo / checkpoint name=... / restore name=... / diff_since revision=N
Every mutation requires expected_revision (optimistic concurrency) and accepts operation_id (idempotent replay).`);
  process.exit(command ? 0 : 2);
}

const jsonIndex = rest.indexOf('--json');
const jsonArg = jsonIndex >= 0 ? JSON.parse(rest[jsonIndex + 1]) : {};

const args = { ...jsonArg };
for (const kv of rest) {
  // skip the --json flag and its payload only when the flag is actually present
  if (jsonIndex >= 0 && (kv === '--json' || kv === rest[jsonIndex + 1])) continue;
  const m = kv.match(/^([a-z_]+)=(.*)$/);
  if (m) args[m[1]] = parseScalar(m[2]);
}

function parseScalar(v) {
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?[\d.]+,-?[\d.]+(,-?[\d.]+)*$/.test(v)) return v.split(',').map(Number);
  return v.replace(/^"|"$/g, '');
}

const result = opsCommand(command, args);
console.log(JSON.stringify(result, null, 2));
process.exit(result && result.ok === false && !result.replayed ? 1 : 0);
