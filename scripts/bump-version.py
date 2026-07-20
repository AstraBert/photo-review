#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = []
# ///
import json
import sys

TAURI_CONF = "src-tauri/tauri.conf.json"
PACKAGE_JSON = "package.json"
VERSION_FIELD = "version"

def bump_version(new_version: str) -> str | None:
    old_version = None
    for f in (TAURI_CONF, PACKAGE_JSON):
        with open(f) as file:
            data = json.load(file)
            if old_version is None:
                old_version = data[VERSION_FIELD]
            data[VERSION_FIELD] = new_version
        with open(f, "w") as file:
            json.dump(data, file, indent=2)
    return old_version

def main() -> None:
    argv = sys.argv
    if len(argv) < 2:
        print("Please provide a version to bump the app to")
        sys.exit(1)
    old_version = bump_version(argv[1])
    print(f"Bumped version {old_version or 'none'} -> {argv[1]}")

if __name__ == "__main__":
    main()
