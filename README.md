# Strider

A client-side editor for automation workflows, process architectures and system interactions. React, TypeScript, Vite, React Flow and Lucide. There is no application server, database, account system, telemetry, external font request or diagram autosave.

## Run locally

Use Node.js 20.19+ or Node.js 22 LTS.

```bash
npm install
npm run dev
```

Open the address printed by Vite (normally `http://localhost:4173`).

```bash
npm run build
npm run preview
npm test
```

`npm run build` type-checks the source and creates a self-contained static `dist/` directory. Deploy that directory on any static host. Vite serves the app during development; it is not a production backend. For a subdirectory deployment, set Vite's `base` to the corresponding path and adjust the favicon path in `index.html`.

## GitHub and Firebase Hosting

The source is portable and can be hosted in your own GitHub repository. `firebase.json` is already configured to publish `dist/` using Firebase Hosting. No Firebase SDK, database, application API key or authentication service is required. See [PUBBLICAZIONE.md](PUBBLICAZIONE.md) for the complete guide in Italian, including GitHub setup and Firebase deployment commands.

## Workflow editing

The existing workflow canvas retains its original compact nodes, system colors, drag/drop palette, orthogonal connections, labels, custom properties, auto/manual sizing, nested containers, multi-selection, copy/paste, duplication, undo/redo, context menus and light/dark themes. Use the inspector to edit selected objects; clear the selection to edit diagram settings. Shift-drag selects multiple elements. Scroll pans; Ctrl/Cmd+wheel or the canvas controls zoom. Keyboard shortcuts are listed in the help dialog.

## Strider 2 — application design workspace

Strider now includes three editors sharing the established canvas and visual style:

- **Workflow Designer** retains the original node families, editing gestures, groups, history and connections.
- **Data Model Designer** provides tables with stable field IDs, custom data types, PK/FK flags, nullability, uniqueness, defaults and descriptions. Drag from a field's right dot to another field's left dot to create a relationship. The target is marked FK. Select a relationship to name it and set `1:1`, `1:N`, `N:1` or `N:N`. Relations are conceptual: Strider does not execute SQL or enforce a database engine's type rules. Removing a field also removes its connected relationships in the same undo operation.
- **Architecture Designer** provides client/supplier networks, cloud/on-premise boundaries, servers, Citrix, VPN, firewall, workstations and tablets, plus the existing technology presets. Reuse the normal group membership and connection controls. Preset icons are generic, styled symbols, not official vendor logos.

### Projects and tabs

Use **New** to create a diagram in any module, or create a project. A project has a name and description, with any number of diagrams of each kind. Existing standalone diagrams can become a project through **Create project**. A new project created while another project is open starts a fresh workspace after the unsaved-work guard.

Each diagram has a browser-style tab. Its content, viewport, undo and redo history are independent. Clicking a tab never discards another diagram. Closing a project tab removes the diagram from the project, after confirmation; export it first to keep a standalone copy.

**Save XML** saves the active diagram. **Save project XML** saves every diagram together. `Ctrl/Cmd+S` saves the project when one is open, otherwise the active diagram. **Open** detects the document type and opens standalone diagrams as new tabs; a project replaces the current workspace after an unsaved-work check. Imported standalone diagrams join the current project when there is one. Imported duplicate diagram IDs receive a new workspace ID.

No content is sent to a server or stored in a database. Keep the XML files: closing the browser without saving loses the in-memory workspace. Only theme preferences are stored locally. Browser downloads are initiated by the app; the browser's download settings determine their final destination.

### File format and compatibility

The internal model remains TypeScript objects. XML remains the single editable interchange format; there is no additional JSON or SQL file format.

- Legacy `<automation-diagram version="1.0">` files still open. Old files without a diagram ID receive one on import.
- Workflow exports retain the `<automation-diagram>` root.
- Data models use `<data-model-diagram>`; tables have `<fields>` children and stable field handles.
- Architecture exports use `<architecture-diagram>`.
- Every diagram preserves positions, sizes, viewport, settings, properties, parent membership and connections. Custom icons are normalized to a small PNG and embedded as data URLs in `<custom-icon>` so files remain self-contained.
- Project exports use the structure below. `diagram-order` preserves tab ordering across the typed lists, and `active-diagram` preserves the active tab. Node IDs are scoped to their diagram; diagram IDs must be unique inside a project.

```xml
<Project version="1.0" id="project-id" name="Application design"
         active-diagram="diagram-id" diagram-order='["diagram-id"]'>
  <description>Project description</description>
  <workflows>
    <automation-diagram version="1.0" id="diagram-id" name="Process">
      <!-- metadata, description, viewport, settings, nodes, edges -->
    </automation-diagram>
  </workflows>
  <data-models />
  <architectures />
</Project>
```

Imports reject malformed XML, DTD/entity declarations, unsupported versions, invalid colors and dimensions, duplicate identifiers, missing nodes/ports, broken container references, invalid table fields and diagrams placed in the wrong project list. Limits: 10 MB per standalone diagram, 50 MB per project, 1,000 diagrams per project, 5,000 nodes/10,000 connections per diagram. Custom icon uploads accept PNG/JPEG/WebP up to 5 MB and normalize them to a maximum of 128 pixels. The original V1 application does not support the new project roots or data-model/architecture roots: open these in Strider 2.

### Exports and appearance

All three modules export PNG and SVG. **Transparent background** is selected by default in the Export menu; clear it to include the current light/dark canvas color. Grid dots and editor controls are excluded. Node surfaces and boundary fills remain part of the diagram. Uploaded icons are raster images embedded within otherwise vector SVG exports.

Data Model also exports a real `.xlsx` workbook with **Tables**, **Fields** and **Relationships** worksheets. It uses a small local OOXML/ZIP writer with explicit string cells, so field names/defaults beginning with `=` are not executed as formulas. Excel is a documentation export; use XML to reopen and edit a model.

The grid is slightly darker by default. Clear the selection and use **Inspector → Canvas → Grid color** to customize it per diagram. The Strider wordmark is slightly smaller. Regular workflow interactions and node rendering are preserved.

### New source modules

- `model/dataModel.ts`, `model/project.ts`: fields, ports, project metadata.
- `hooks/useWorkspace.ts`: document tabs, project membership, save tracking.
- `hooks/useDiagramHistory.ts`: independent per-diagram undo/redo sessions.
- `config/modules.ts`, `config/moduleExamples.ts`: module palettes and examples.
- `components/nodes/TableNode.tsx`, `components/properties/FieldEditor.tsx`: schema editing.
- `components/toolbar/WorkspaceBar.tsx`: project controls and diagram tabs.
- `services/projectXml.ts`: project serialization and file-type routing.
- `services/excelExport.ts`, `services/customIcon.ts`: Excel documentation and portable icon uploads.

Examples: `examples/workflow.xml`, `examples/data-model.xml`, `examples/architecture.xml`, and `examples/strider-project.xml`.

### Verification

Run `npm test` for legacy workflow regression tests, module/project XML round trips, corrupt-file rejection, custom-icon and transparent SVG exports, field link stability, and independent tab history. The Excel output was separately opened with an independent XLSX parser to verify sheets, key values and relationship endpoints. Browser interaction/visual QA of this release has not been performed in this session.


### Datatype selector and tabs update

Field types now use a native select with **Standard** and **Dataverse** optgroups. Dataverse selections are saved with a `Dataverse:` prefix so they stay distinct from standard SQL types in XML, diagram labels and Excel. Existing custom types remain selectable when reopening a saved model. The catalog follows [Microsoft Learn column types](https://learn.microsoft.com/en-us/power-apps/maker/data-platform/types-of-fields) and [Autonumber](https://learn.microsoft.com/en-us/power-apps/maker/data-platform/autonumber-fields). It is a modeling catalog, including system-managed Dataverse columns.

Diagram tabs explicitly reset browser button styles and use the shared light/dark surface, borders, text and accent tokens.

Additional properties are optional XML-preserved metadata for integrations and documentation. They do not execute business logic. Recognized properties such as AI agent model/memory/tools and data-model relationship cardinality also contribute to their visual labels.


### Workflow orientation and artwork (1.3)

Use Horizontal / Vertical under the canvas breadcrumb. Each orientation retains its own positions while the diagram topology is unchanged. Adding or removing nodes or connections triggers a fresh layout for the next orientation. Node content, IDs, connection semantics, group membership and manual component sizes are preserved. Undo restores the previous document; both layout views are stored in the optional `workflow-layout` XML element. Older XML files remain horizontal by default.

Product artwork now uses Simple Icons exclusively: current package marks plus the bundled archived 11.15 marks. In the inspector choose Product, then Choose from Simple Icons to search the full catalog. The chosen artwork is embedded in XML and SVG exports and remains independent of the palette preference and uploaded custom images. Products missing from Simple Icons retain a standard symbol with an explicit inspector notice; no substitute brand is assigned automatically. The complete icon catalog downloads only when the picker opens.
