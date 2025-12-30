#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "manifest.json"
DIST_DIR = ROOT / "dist"


def _load_manifest() -> dict:
    if not MANIFEST_PATH.exists():
        raise FileNotFoundError(f"manifest not found: {MANIFEST_PATH}")
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def _write_manifest(manifest: dict) -> None:
    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


SEMVER_RE = re.compile(r"^(?P<maj>0|[1-9]\d*)\.(?P<min>0|[1-9]\d*)\.(?P<pat>0|[1-9]\d*)$")


def _bump_patch(version: str) -> str:
    m = SEMVER_RE.match(version)
    if not m:
        raise ValueError(f"version is not x.y.z: {version}")
    maj = int(m.group("maj"))
    minor = int(m.group("min"))
    patch = int(m.group("pat"))
    return f"{maj}.{minor}.{patch + 1}"


def _validate_version(version: str) -> str:
    if not SEMVER_RE.match(version):
        raise ValueError(f"version is not x.y.z: {version}")
    return version


DEFAULT_EXCLUDES = (
    ".git/",
    "dist/",
    "devtools/",
)


def _should_exclude(rel_posix: str) -> bool:
    if rel_posix == "CHATLOG.md":
        return True
    if rel_posix.endswith(".zip"):
        return True
    if rel_posix.endswith(".md"):
        return True
    for prefix in DEFAULT_EXCLUDES:
        if rel_posix.startswith(prefix):
            return True
    return False


def _iter_files_to_package() -> list[Path]:
    files: list[Path] = []
    for path in ROOT.rglob("*"):
        if path.is_dir():
            continue
        rel = path.relative_to(ROOT).as_posix()
        if _should_exclude(rel):
            continue
        files.append(path)
    return sorted(files)


def _make_zip(version: str) -> Path:
    DIST_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = DIST_DIR / f"Search-Console-16-Month-Backup-v{version}.zip"
    if zip_path.exists():
        zip_path.unlink()

    files = _iter_files_to_package()
    with ZipFile(zip_path, "w", compression=ZIP_DEFLATED) as zf:
        for path in files:
            arcname = path.relative_to(ROOT).as_posix()
            zf.write(path, arcname)
    return zip_path


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description="Bump extension version and build a clean .zip for Chrome Web Store."
    )
    group = parser.add_mutually_exclusive_group(required=False)
    group.add_argument(
        "--bump",
        choices=["patch"],
        help="Bump semver component (only patch for now).",
    )
    group.add_argument("--set", dest="set_version", help="Set version explicitly.")
    parser.add_argument(
        "--zip-only",
        action="store_true",
        help="Do not modify manifest.json; only build zip for current version.",
    )
    args = parser.parse_args(argv)

    manifest = _load_manifest()
    current = str(manifest.get("version", ""))
    if not current:
        raise ValueError("manifest.json missing 'version'")

    if args.zip_only:
        version = current
    else:
        if not args.set_version and not args.bump:
            raise ValueError("must pass --bump patch or --set X.Y.Z (or use --zip-only)")
        if args.set_version:
            version = _validate_version(args.set_version)
        else:
            version = _bump_patch(current)
        manifest["version"] = version
        _write_manifest(manifest)

    zip_path = _make_zip(version)
    print(f"Version: {current} -> {version}" if version != current else f"Version: {version}")
    print(f"ZIP: {zip_path}")
    print(f"Built at: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        raise
