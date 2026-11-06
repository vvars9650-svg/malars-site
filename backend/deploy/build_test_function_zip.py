"""Build the TEST Cloud Function source archive from the current backend."""
from __future__ import annotations

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / ".local-artifacts" / "malars-test-function.zip"
FILES = ("app.py", "function.py", "reference_data.py", "requirements.txt")


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(OUTPUT, "w", ZIP_DEFLATED) as archive:
        for name in FILES:
            archive.write(ROOT / "backend" / name, arcname=name)
    print(f"Built {OUTPUT} ({OUTPUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
