#!/usr/bin/env python3
"""Derive a frustum-cullable player view from the identity-bound built GLB."""
import argparse
import copy
import json
import math
import struct
from pathlib import Path

TYPES = {
    5120: ("b", 1), 5121: ("B", 1), 5122: ("h", 2),
    5123: ("H", 2), 5125: ("I", 4), 5126: ("f", 4),
}
COMPONENTS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}
WORLD_X = -465.0
WORLD_Z = -325.0
TILE = 256.0


def read_glb(path):
    data = Path(path).read_bytes()
    if data[:4] != b"glTF":
        raise ValueError(f"not a GLB: {path}")
    cursor = 12
    document = None
    binary = None
    while cursor < len(data):
        length, kind = struct.unpack_from("<II", data, cursor)
        cursor += 8
        chunk = data[cursor:cursor + length]
        cursor += length
        if kind == 0x4E4F534A:
            document = json.loads(chunk)
        elif kind == 0x004E4942:
            binary = bytearray(chunk)
    if document is None or binary is None:
        raise ValueError("GLB is missing JSON or BIN chunks")
    return document, binary


def accessor_reader(document, binary, accessor_index):
    accessor = document["accessors"][accessor_index]
    view = document["bufferViews"][accessor["bufferView"]]
    fmt, component_size = TYPES[accessor["componentType"]]
    components = COMPONENTS[accessor["type"]]
    start = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    stride = view.get("byteStride", component_size * components)
    unpacker = struct.Struct("<" + fmt * components)

    def read(index):
        return unpacker.unpack_from(binary, start + index * stride)

    return accessor, read


def append_buffer(binary, views, payload, target=None):
    while len(binary) % 4:
        binary.append(0)
    offset = len(binary)
    binary.extend(payload)
    view = {"buffer": 0, "byteOffset": offset, "byteLength": len(payload)}
    if target is not None:
        view["target"] = target
    views.append(view)
    return len(views) - 1


def append_accessor(document, binary, values, source_accessor, target):
    component_type = source_accessor["componentType"]
    kind = source_accessor["type"]
    components = COMPONENTS[kind]
    fmt, _ = TYPES[component_type]
    payload = bytearray()
    packer = struct.Struct("<" + fmt * components)
    for i in range(0, len(values), components):
        payload.extend(packer.pack(*values[i:i + components]))
    view_index = append_buffer(binary, document["bufferViews"], payload, target)
    columns = [values[i::components] for i in range(components)]
    accessor = {key: copy.deepcopy(value) for key, value in source_accessor.items()
                if key not in {"bufferView", "byteOffset", "count", "min", "max"}}
    accessor.update({
        "bufferView": view_index,
        "count": len(values) // components,
        "min": [min(column) for column in columns],
        "max": [max(column) for column in columns],
    })
    document["accessors"].append(accessor)
    return len(document["accessors"]) - 1


def tile_chunks(source_document, source_binary, output_document, output_binary, primitive):
    position_accessor, read_position = accessor_reader(
        source_document, source_binary, primitive["attributes"]["POSITION"]
    )
    index_values = None
    if "indices" in primitive:
        index_accessor, read_index = accessor_reader(
            source_document, source_binary, primitive["indices"]
        )
        index_values = [read_index(i)[0] for i in range(index_accessor["count"])]
    else:
        index_values = list(range(position_accessor["count"]))

    buckets = {}
    for offset in range(0, len(index_values), 3):
        a, b, c = index_values[offset:offset + 3]
        pa, pb, pc = read_position(a), read_position(b), read_position(c)
        tile_x = math.floor(((pa[0] + pb[0] + pc[0]) / 3 - WORLD_X) / TILE)
        tile_z = math.floor(((pa[2] + pb[2] + pc[2]) / 3 - WORLD_Z) / TILE)
        buckets.setdefault((tile_x, tile_z), []).extend((a, b, c))

    chunks = []
    for (tile_x, tile_z), source_indices in sorted(buckets.items()):
        remap = {}
        local_indices = []
        attributes = {}
        readers = {}
        for name, accessor_index in primitive["attributes"].items():
            accessor, reader = accessor_reader(source_document, source_binary, accessor_index)
            readers[name] = (accessor, reader)
            attributes[name] = []
        for source_index in source_indices:
            target_index = remap.get(source_index)
            if target_index is None:
                target_index = len(remap)
                remap[source_index] = target_index
                for name, (accessor, reader) in readers.items():
                    attributes[name].extend(reader(source_index))
            local_indices.append(target_index)

        output_attributes = {}
        for name, values in attributes.items():
            accessor = readers[name][0]
            output_attributes[name] = append_accessor(
                output_document, output_binary, values, accessor, 34962
            )
        max_index = max(local_indices, default=0)
        index_type = 5123 if max_index < 65536 else 5125
        index_template = {"componentType": index_type, "type": "SCALAR"}
        index_accessor = append_accessor(
            output_document, output_binary, local_indices, index_template, 34963
        )
        output_primitive = copy.deepcopy(primitive)
        output_primitive["attributes"] = output_attributes
        output_primitive["indices"] = index_accessor
        chunks.append((tile_x, tile_z, {"primitives": [output_primitive]}))
    return chunks


def write_glb(path, document, binary):
    document["buffers"][0]["byteLength"] = len(binary)
    json_bytes = json.dumps(document, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    json_bytes += b" " * ((4 - len(json_bytes) % 4) % 4)
    binary_bytes = bytes(binary) + b"\0" * ((4 - len(binary) % 4) % 4)
    total = 12 + 8 + len(json_bytes) + 8 + len(binary_bytes)
    output = struct.pack("<4sII", b"glTF", 2, total)
    output += struct.pack("<II", len(json_bytes), 0x4E4F534A) + json_bytes
    output += struct.pack("<II", len(binary_bytes), 0x004E4942) + binary_bytes
    Path(path).write_bytes(output)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", nargs="?", default="editor/facility-built.glb")
    parser.add_argument("output", nargs="?", default="editor/facility-player.glb")
    args = parser.parse_args()
    source_document, source_binary = read_glb(args.source)
    original_meshes = source_document.get("meshes", [])

    # Keep authored materials/textures/images and lights, but discard the original
    # broad geometry buffers so the diagnostic remains comparable in file size.
    document = {
        key: copy.deepcopy(value)
        for key, value in source_document.items()
        if key not in {"accessors", "bufferViews", "buffers", "meshes", "nodes", "scenes", "scene"}
    }
    document["accessors"] = []
    document["bufferViews"] = []
    document["buffers"] = [copy.deepcopy(source_document.get("buffers", [{}])[0])]
    document["buffers"][0]["byteLength"] = 0
    binary = bytearray()

    source_views = source_document.get("bufferViews", [])
    for image in document.get("images", []):
        if "bufferView" not in image:
            continue
        source_view = source_views[image["bufferView"]]
        start = source_view.get("byteOffset", 0)
        end = start + source_view["byteLength"]
        image["bufferView"] = append_buffer(binary, document["bufferViews"], source_binary[start:end])

    player_meshes = []
    player_nodes = []
    chunk_count = 0
    for mesh_index, mesh in enumerate(original_meshes):
        for primitive_index, primitive in enumerate(mesh["primitives"]):
            for tile_x, tile_z, chunk in tile_chunks(
                source_document, source_binary, document, binary, primitive
            ):
                chunk["name"] = f"facility-player-{mesh_index}-{primitive_index}-{tile_x}-{tile_z}"
                player_meshes.append(chunk)
                player_nodes.append({"mesh": len(player_meshes) - 1, "name": chunk["name"]})
                chunk_count += 1

    source_scene = source_document.get("scenes", [])[source_document.get("scene", 0)]
    source_roots = set(source_scene.get("nodes", []))
    preserved_nodes = [
        copy.deepcopy(node)
        for index, node in enumerate(source_document.get("nodes", []))
        if index not in source_roots and "mesh" not in node
    ]
    if any("children" in node for node in preserved_nodes):
        raise ValueError("unsupported non-mesh child node in source scene")
    preserved_start = len(player_nodes) + 1
    root_index = len(player_nodes)
    player_nodes.append({
        "name": "facility-player-v1",
        "children": list(range(root_index)) + list(range(preserved_start, preserved_start + len(preserved_nodes))),
    })
    player_nodes.extend(preserved_nodes)
    document["meshes"] = player_meshes
    document["nodes"] = player_nodes
    document["scenes"] = [{"nodes": [root_index], "name": "facility-player-v1"}]
    document["scene"] = 0
    for key in ("cameras", "animations", "skins"):
        document.pop(key, None)
    write_glb(args.output, document, binary)
    print(f"PLAYER GLB: {chunk_count} spatial meshes, {Path(args.output).stat().st_size} bytes")


if __name__ == "__main__":
    main()
