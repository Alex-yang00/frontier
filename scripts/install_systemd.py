"""Render Frontier user units for this checkout without enabling them."""
from __future__ import annotations

import argparse
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
SOURCE = REPO_ROOT / "deploy" / "systemd"
DEFAULT_TARGET = Path.home() / ".config" / "systemd" / "user"


def render_units(target: Path, repo_root: Path = REPO_ROOT) -> list[Path]:
    target.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    for source in sorted(SOURCE.iterdir()):
        if source.suffix == ".in":
            destination = target / source.name.removesuffix(".in")
            text = source.read_text(encoding="utf-8").replace("@REPO_ROOT@", str(repo_root.resolve()))
        elif source.suffix == ".timer":
            destination = target / source.name
            text = source.read_text(encoding="utf-8")
        else:
            continue
        destination.write_text(text, encoding="utf-8")
        written.append(destination)
    return written


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target", type=Path, default=DEFAULT_TARGET)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    target = args.target.expanduser().resolve()
    if args.dry_run:
        for source in sorted(SOURCE.iterdir()):
            if source.suffix in {".in", ".timer"}:
                print(target / source.name.removesuffix(".in"))
        return
    for path in render_units(target):
        print(path)


if __name__ == "__main__":
    main()
