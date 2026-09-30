<p align="center">
  <img src="landing/assets/logo-dark.png#gh-dark-mode-only" alt="Strider" width="240">
  <img src="landing/assets/logo-light.png#gh-light-mode-only" alt="Strider" width="240">
</p>

<p align="center">
  <strong>Visual system design workspace for architecture, data models and workflows.</strong>
</p>

<p align="center">
  Map systems. Shape data. Design work across humans, automation and AI — without accounts, backends or heavyweight modeling suites.
</p>

<p align="center">
  <a href="https://strider.antoniolamanna.com/">Website</a>
  ·
  <a href="https://strider.antoniolamanna.com/app/">Open Strider</a>
  ·
  <a href="#run-locally">Run locally</a>
</p>

<br>

<img src="landing/assets/workflow-dark-v4.png#gh-dark-mode-only" alt="Strider workflow workspace">
<img src="landing/assets/workflow-light-v4.png#gh-light-mode-only" alt="Strider workflow workspace">

## Why Strider

System design rarely lives in one view.

Architecture diagrams explain **where capabilities sit**. Data models explain **what persists and how it relates**. Workflow diagrams explain **how work moves across people, software, automation and AI**.

Strider brings those conversations into one lightweight workspace and one visual language, so a design can move from system context to execution logic without changing tools every time the question changes.

It is deliberately a **design workspace, not a runtime**: Strider helps you model, discuss, document and evolve systems. It does not execute workflows, run applications or require a hosted project backend.

## Three views. One design language.

### Architecture Designer

Map applications, infrastructure, cloud and on-premise environments, trust boundaries and integration paths. Use standard components or product-aware iconography to keep the system landscape readable without turning the diagram into a vendor slide.

<img src="landing/assets/architecture-dark-v4.png#gh-dark-mode-only" alt="Strider Architecture Designer">
<img src="landing/assets/architecture-light-v4.png#gh-light-mode-only" alt="Strider Architecture Designer">

### Data Model Designer

Model relational structures visually with tables, fields, primary and foreign keys, cardinalities and data types. Standard and Dataverse data types can coexist in the same model, while relationships remain visible in context.

<img src="landing/assets/data-model-dark-v4.png#gh-dark-mode-only" alt="Strider Data Model Designer">
<img src="landing/assets/data-model-light-v4.png#gh-light-mode-only" alt="Strider Data Model Designer">

### Workflow Designer

Design process logic across human tasks, automated tasks, events, gateways, scripts, systems and AI agents. Switch between horizontal and vertical layouts without changing the underlying workflow.

<img src="landing/assets/workflow-dark-v4.png#gh-dark-mode-only" alt="Strider Workflow Designer">
<img src="landing/assets/workflow-light-v4.png#gh-light-mode-only" alt="Strider Workflow Designer">

## Lightweight by design

| Principle | What it means in Strider |
| --- | --- |
| **Browser-native** | The application runs entirely client-side. |
| **Local workspace** | No account, application server, database or telemetry is required. |
| **Portable** | Save editable diagrams and projects as XML and reopen them later. |
| **Presentation-ready** | Export diagrams as PNG or SVG; data models can also be exported to XLSX. |
| **Flexible** | Use standalone diagrams or group workflow, data and architecture views inside a project. |
| **Focused** | The tool models systems; it does not try to become a workflow engine, database or collaboration platform. |

The editor includes drag-and-drop components, multi-selection, undo/redo, nested boundaries and containers, labelled connections, configurable arrow directions, diagram-level styling, light/dark themes, auto-arrange, product icons via Simple Icons, and an inspector for properties and graphics.

## Portable project files

XML is Strider's editable interchange format.

A project can contain multiple workflow, data-model and architecture diagrams while preserving positions, viewport, styles, properties, connections and diagram order. Standalone diagrams can also be saved and reopened independently.

This keeps the design artifact outside the application: the file is yours, versionable and portable.

Example files are available in [`examples/`](examples/).

## Run locally

Strider requires Node.js **20.19+** or **22 LTS**.

```bash
git clone https://github.com/antonio-lamanna/strider.git
cd strider
npm ci
npm run dev
```

Vite will start the development server, normally on `http://localhost:4173`.

Build, preview and test:

```bash
npm run build
npm run preview
npm test
```

The production build is a static `dist/` directory and can be hosted on any static web host.

## Built with

**React 19 · TypeScript · Vite · React Flow · ELK.js · Lucide · Simple Icons**

There is no application API, authentication layer or persistence service behind the editor. Diagram content stays in the browser workspace until you export it.

## License

Strider is released under the [MIT License](LICENSE).

Third-party notices and icon licensing information are available in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) and [`public/icon-licenses.txt`](public/icon-licenses.txt).

---

<p align="center">
  Created by <a href="https://antoniolamanna.com/">Antonio Lamanna</a>
  ·
  <a href="https://www.linkedin.com/in/antoniolamanna">LinkedIn</a>
</p>

<p align="center">
  Product names, trademarks and marks belong to their respective owners.
</p>
