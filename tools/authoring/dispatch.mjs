import * as ops from './ops.mjs';

export function opsCommand(command, args) {
  const map = {
    init: () => ops.initState(),
    create_object: () => ops.createObject(args),
    author_object: () => ops.authorObject(args),
    integrate_object: () => ops.integrateObject(args),
    move_object: () => ops.moveObject(args),
    rotate_object: () => ops.rotateObject(args),
    resize_object: () => ops.resizeObject(args),
    rebind_instance: () => ops.rebindInstance(args),
    install_opening: () => ops.installOpening(args),
    move_opening: () => ops.moveOpening(args),
    remove_instance: () => ops.removeInstance(args),
    walls_list: () => ops.wallsList(),
    place_relative: () => ops.placeRelative(args),
    inspect_object: () => ops.inspectObject(args),
    inspect_region: () => ops.inspectRegion(args),
    relationships: () => ops.getRelationships(args),
    validate_world: () => ops.validateWorldOp(),
    undo: () => ops.undo(args),
    checkpoint: () => ops.checkpoint(args),
    restore: () => ops.restore(args),
    diff_since: () => ops.diffSince(args),
  };
  const fn = map[command];
  if (!fn) return { ok: false, error: { code: 'unknown_command', message: `Unknown command ${command}. Run help.` } };
  try {
    return fn();
  } catch (e) {
    return { ok: false, error: { code: e.code || 'internal_error', message: String(e.message) } };
  }
}
