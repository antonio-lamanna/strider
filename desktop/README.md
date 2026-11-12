# Strider Desktop — MORIA UI (first implementation)

This is a **separate Electron edition** of Strider, built from the same React application and XML models as the web release. Nothing in the public Strider web UI is changed by these files. MORIA's compact Windows dark workspace/rail/panels and blue-accent conventions are applied through a desktop-only stylesheet. The existing Strider editors, file import/export, undo/redo, palette and inspector remain Strider components.

## Build on Windows (Node.js 20.19+)

From the repository root:

```powershell
npm ci
npm run build
cd desktop
npm install
npm run dist
```

The **portable Windows executable** will be written under `release/strider-desktop/`. For an unpackaged desktop development test, build the web app, then use `cd desktop; npm install; npm start`.

## Scope and limitations

- Current deliverable is an **initial desktop shell and style migration**, not yet a pixel-perfect clone of MORIA 0.11.0. An accurate comparison still requires visual QA against the MORIA application itself.
- Strider XML projects and the three original designers remain unchanged.
- The app opens bundled HTML locally; it does not embed or call the public Strider website.
- The existing browser-based XML export flow is preserved. Native Open/Save dialogs and persistent recent-project lists are not yet implemented.
- Electron uses context isolation, sandboxing, disabled Node integration and blocked navigation.
- Build needs dependencies locally; the finished Windows portable executable does not require a Node installation.
- No changes have been pushed to `main`.
