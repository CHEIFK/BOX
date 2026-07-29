# AGY Studio

Desktop UI for AGY, built with Tauri + React + TypeScript.

## Phase 1 — Foundation

- Native desktop window titled "AGY Studio"
- Dark modern UI with welcome screen
- React + TypeScript (strict mode) + Vite
- Tauri v2 backend (no custom commands yet)
- AppImage + .deb bundle targets on Linux

## Development

```bash
npm install
npm run tauri dev
```

## Production Build

```bash
npm run tauri build
```

Outputs are in `src-tauri/target/release/bundle/`.

## Project Structure

```
src/                  # React frontend
  components/         # Reusable UI components
  pages/              # Page-level components
  styles/             # Global CSS
  assets/             # Static assets
  hooks/              # Custom React hooks
  utils/              # Utility functions
src-tauri/            # Tauri (Rust) backend
  src/                # Rust source
```
