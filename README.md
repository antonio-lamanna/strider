# Automation Canvas

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

## Use the editor

- Every new session starts with an empty diagram. **Load example** opens an optional user-onboarding workflow.
- Drag a component from **Library**, or click it to add it near the canvas center. **Systems** contains 24 presets and is searchable. Pointer-based dragging works with a mouse, pen or touch.
- Drag nodes to position them. Use the **hand tool**, scroll, or the middle mouse button to pan. Pinch to zoom, or use the bottom zoom controls. **1** fits the diagram.
- Drag from a right/bottom output to a left/top input. Click the connection line to change its label, endpoints, semantic type and line style. Data defaults to dashed; exception defaults to dotted. Routing uses rounded orthogonal paths.
- Click or double-click a component to edit its label, description, type, preset, icon, accent and custom properties. Properties update as you edit. The JSON editor has an explicit **Apply properties** action so temporarily invalid JSON does not overwrite good data.
- Rectangular nodes size to their content by default. Their preferred width ranges from 150 to 420 px, and text wraps to increase height. AI agents include a capability row. Drag the selected node's resize handles or enter dimensions to switch to manual size. **Reset to content size** restores auto sizing. In manual mode, small dimensions intentionally clip overflowing content; enlarge or reset the node to show it all.
- Gateways and events use compact symbols with labels below. Rectangular nodes and containers are manually resizable; event/gateway symbols keep their intrinsic shape.
- Drag on the canvas to select several elements, or use Shift-drag / Ctrl or Cmd-click. Use **Group selection** or **Ctrl/Cmd+G** to wrap selected nodes in a container. Move a node completely inside a container to attach it; move it out to detach. The **Belongs to** field provides explicit membership. Container positions are relative to their parent, with nesting supported.
- **Fit container to contents** tightens a group without moving its children on the canvas. **Ungroup contents** removes the boundary and keeps its children. Deleting a container deletes its descendants and incident connections; undo restores them.
- Use the right-click menus for copy, duplication, size reset, layering and deletion.
- **Save XML** downloads the complete editable document. **Open** accepts that file later. Dropping an XML file on the canvas also opens it. New, Open and Load example protect unsaved work with a Save / Discard / Cancel dialog.
- **Export** downloads the entire diagram as PNG or SVG, with whitespace around its bounds and no application chrome. The current light/dark appearance is used. SVG contains vector text, shapes, icons and paths, without bitmap screenshots or `foreignObject`. PNG renders the same SVG at 2x where the browser's image budget permits.

The toolbar's saved indicator means the XML download was initiated or a file was opened. Browsers do not expose confirmation that a downloaded file was actually kept on disk. Keep the XML file before closing your tab. Only the theme preference is stored in `localStorage`; diagram contents and the internal clipboard exist in memory only. Clipboard shortcuts copy within the current editor session, not between browser tabs or unrelated applications.

## Keyboard shortcuts

| Action             | Windows / Linux       | macOS              |
| ------------------ | --------------------- | ------------------ |
| Copy / paste       | Ctrl+C / Ctrl+V       | Cmd+C / Cmd+V      |
| Duplicate          | Ctrl+D                | Cmd+D              |
| Undo               | Ctrl+Z                | Cmd+Z              |
| Redo               | Ctrl+Shift+Z / Ctrl+Y | Cmd+Shift+Z        |
| Select all         | Ctrl+A                | Cmd+A              |
| Group selection    | Ctrl+G                | Cmd+G              |
| Save XML           | Ctrl+S                | Cmd+S              |
| Delete selected    | Delete / Backspace    | Delete / Backspace |
| Select / pan tool  | V / H                 | V / H              |
| Fit view           | 1                     | 1                  |
| Clear selection    | Escape                | Escape             |
| Shortcut reference | ?                     | ?                  |

Text inputs retain native editing shortcuts. Save works while editing a field. Arrow-key movement is provided by React Flow when a node is keyboard-focused.

## Architecture

| Module                                          | Responsibility                                                                     |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/model/diagram.ts`                          | Typed diagram, node data, ports, edges, factories and canonical document cleaning  |
| `src/config/nodeTypes.ts`                       | Component families and default visual configuration                                |
| `src/config/systemPresets.ts`                   | One central registry of application presets                                        |
| `src/components/nodes/WorkflowNode.tsx`         | Memoized custom rectangles, events, gateways and containers                        |
| `src/components/edges/OrthogonalEdge.tsx`       | Orthogonal paths, arrowheads and connection labels                                 |
| `src/components/palette/Palette.tsx`            | Search, categories, click and pointer drag placement                               |
| `src/components/properties/PropertiesPanel.tsx` | Diagram, node and edge editing                                                     |
| `src/components/toolbar/Toolbar.tsx`            | Document actions, export, history and theme                                        |
| `src/hooks/useDiagramHistory.ts`                | Bounded history, grouped gestures, coalesced text edits and dirty tracking         |
| `src/hooks/useClipboard.ts`                     | Internal clipboard with ID remapping and nested-group preservation                 |
| `src/hooks/useKeyboardShortcuts.ts`             | Shortcuts that respect native text editing and dialogs                             |
| `src/utils/geometry.ts`                         | Shared content measurement, wrapping, parent coordinates, edge geometry and bounds |
| `src/services/xmlSerializer.ts`                 | Native DOM creation and XMLSerializer output                                       |
| `src/services/xmlParser.ts`                     | Native DOMParser, document validation and graph integrity checks                   |
| `src/services/exportService.ts`                 | Pure SVG vectors, browser Canvas PNG rasterization and downloads                   |
| `src/App.tsx`                                   | Canvas orchestration, document actions, selection and group mutations              |

The internal state uses typed JavaScript objects, not XML. React Flow's measured sizes, dragging flags, selections and other transient fields are excluded from persistence and history. A transaction records one undo step for a full move or resize; successive edits to one property are coalesced for 700 ms. History retains up to 80 snapshots. Node and edge renderers are memoized; their type registries and action context are stable. The requested 200 nodes / 300 edges are covered by the persistence/export test fixture.

## XML 1.0 contract

This is a custom diagram format, not BPMN XML. Positions and manual dimensions are in canvas pixels. Viewport translation uses canvas-screen coordinates and `zoom` is a scale factor. Child positions are relative to the parent node's top-left corner.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<automation-diagram version="1.0" name="Invoice processing">
  <metadata created-at="2026-09-09T00:00:00.000Z" updated-at="2026-09-09T00:00:00.000Z"/>
  <description>Document processing and storage</description>
  <viewport x="80" y="100" zoom="1"/>
  <settings grid="true" snap="true" gridSize="20"/>
  <nodes>
    <node id="agent-1" type="ai-agent" label="Invoice agent"
          icon="bot" color="#8370ca" system="openai"
          x="80" y="100" sizeMode="auto">
      <description>Extract the invoice information.</description>
      <properties>
        <property name="model" encoding="json">"GPT-5"</property>
        <property name="tools" encoding="json">["extract", "validate"]</property>
      </properties>
      <ports>
        <port id="out" direction="output" side="right" semantic="control"/>
      </ports>
    </node>
    <node id="app-1" type="application" label="Store invoice"
          icon="files" color="#2d938e" system="sharepoint"
          x="520" y="100" sizeMode="manual" width="240" height="110">
      <description/>
      <properties/>
      <ports>
        <port id="in" direction="input" side="left" semantic="control"/>
      </ports>
    </node>
  </nodes>
  <edges>
    <edge id="connection-1" source="agent-1" sourceHandle="out"
          target="app-1" targetHandle="in" type="data"
          label="Invoice data" lineStyle="auto">
      <properties/>
    </edge>
  </edges>
</automation-diagram>
```

All node kinds are defined in `NodeKind`. Gateways use `type="gateway"` plus `subtype="xor|and|or"`. Containers use `type="group|system-boundary|team-boundary"`; a child uses `parent="container-id"`. Node layering uses `zIndex`. Optional `subtype`, `system` and `parent` attributes are omitted when unused. Manual nodes store explicit `width` and `height`; auto-sized nodes derive their dimensions from the content and shared rendering metrics.

Custom properties are JSON-encoded inside XML text nodes, preserving strings, numbers, booleans, null, arrays and nested objects. XMLSerializer escapes text and attribute values. Property order and port order are preserved. The parser also accepts the brief's simple `<property name="..." value="..."/>` form as strings. Missing port declarations receive default ports; explicitly empty `<ports/>` remains empty. Ports already have direction, side and a semantic category to support future typed-port interaction.

The parser rejects malformed XML, DTD/entity declarations, unsupported format versions, duplicate IDs, missing endpoints, invalid ports, circular/invalid container membership, invalid coordinates, invalid size modes and invalid colors. A failed import leaves the current document unchanged. It supports files up to 10 MB and rejects imports above 5,000 nodes or 10,000 connections. These are input limits, not a performance guarantee at that scale.

## Extend the palette

Add a single entry to `src/config/systemPresets.ts`:

```ts
{
  id: 'new-system',
  name: 'New System',
  icon: 'cloud',
  accentColor: '#507faa',
  category: 'Enterprise',
}
```

The palette and inspector update automatically. Icon names refer to the generic Lucide registry in `src/components/ui/Icon.tsx`. Presets intentionally use clean generic equivalents rather than implying official vendor logos. Brand names identify the corresponding systems.

New component kinds belong in `NodeKind` and `nodeTypes.ts`. Most rectangular variants then render without component changes. New shapes should update both the node renderer and vector exporter, using `geometry.ts` for shared sizing and port locations.

## Verification and boundaries

`npm test` covers exact XML round trips, all node families, nested groups, typed properties, escaping, prototype-safe property names, invalid graph rejection, automatic/manual sizing, non-jumping reparenting, valid vector SVG generation and the 200-node/300-edge fixture. `npm run build` includes strict TypeScript checking.

This editor designs diagrams; it does not execute workflows. SmoothStep routing is orthogonal but is not an obstacle-avoidance router: place components to keep paths clear. PNG is capped at 16,384 pixels per side and 32 megapixels, reducing its scale for large diagrams; SVG remains unrestricted by that raster budget. The desktop layout is primary; side panels collapse or overlay on smaller displays. No application-owned authentication is included. A private preview provided by a hosting platform is separate from the app's portable static build.

## Dependency acknowledgements

React, Vite, React Flow and Lucide are used under their respective open-source licenses. React Flow's attribution link remains visible. Official library documentation: [React Flow](https://reactflow.dev/), [Vite](https://vite.dev/), [Lucide](https://lucide.dev/).
