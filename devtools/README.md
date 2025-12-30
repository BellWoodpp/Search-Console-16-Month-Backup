# devtools

Not part of the production extension package.

## Build upload ZIP

From `Chrome-Web-Store/Search-Console-16-Month-Backup/`:

- Bump patch version + build ZIP:
  - `python3 devtools/release.py --bump patch`
- Build ZIP only (do not change `manifest.json`):
  - `python3 devtools/release.py --zip-only`

ZIP output goes to `dist/` and excludes `dist/`, `devtools/`, and `*.md`.
