# Releasing (Chrome Web Store ZIP)

This repo includes `devtools/release.py` to bump the extension version and generate a clean `.zip` for upload.

## Commands

From `Chrome-Web-Store/Search-Console-16-Month-Backup/`:

- Bump patch version and build upload ZIP:
  - `python3 devtools/release.py --bump patch`
- Build upload ZIP for current version (do not change `manifest.json`):
  - `python3 devtools/release.py --zip-only`

## Output

- ZIP is written to `dist/` and named like `Search-Console-16-Month-Backup-v0.1.1.zip`.
- Packaging excludes:
  - `dist/`
  - `devtools/`
  - `*.md` (including `CHATLOG.md`)

## Working With This Chat

- Resume: say **“开工”** → I will read `CHATLOG.md` and continue.
- Finish: say **“收工”** (or “手工”) → I will append a short log entry to `CHATLOG.md`, bump version, and generate the ZIP.

