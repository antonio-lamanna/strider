# STRIDER 1.3.1

## Supplied HTML mockup

- Apply the supplied warm light and near-black dark workspace palettes, Instrument Sans UI typography, compact header and rounded diagram tabs.
- Place existing library, inspector, new-diagram and help actions in a narrow workspace rail; retain the original Strider logo.
- Present the existing select/pan and zoom controls in one floating canvas dock. Style the library, inspector, inputs and all three editors consistently.
- Preserve the existing canvas type metrics, node dimensions and connection handles. Data models, routing, layout algorithms, history, icon modes, XML/JSON/SQL import and all export services are unchanged.
- Load workspace fonts from Google Fonts with system fallbacks. Diagram text keeps the existing font metrics.

# STRIDER 1.2.0

## Product icons and visual refinement

- Library Standard/Product switches the catalogue and the default for newly created compatible elements. It never restyles existing nodes. The preference is local, like the theme.
- Inspector → Appearance → Icon mode applies only to the selected element. Existing system IDs remain the identity; iconMode is optional and defaults to Standard for older files. XML, project XML, JSON and image exports preserve the selected presentation. Custom uploaded icons keep priority; unknown/unavailable products use the original generic symbol.
- 37 bundled product icons: 16 selected Simple Icons 16.30.0 imports and 21 unchanged official Microsoft SVG assets (Power Platform, Dynamics 365, Azure, Power BI and Fabric). Search supports product aliases and vendor/category terms. The existing 64 Standard presets and generic icon mappings are preserved.
- Icons & credits in Help includes source links, trademark notices and a local license/source inventory. Product images do not require runtime requests to vendor servers.
- Refined neutral light/dark surfaces, warm accent controls, panel inputs, tabs, cards, canvas breadcrumb and floating tools based on the supplied mockups. Original STRIDER logo, node geometry, navigation and connector semantics remain unchanged.
- Validation: 29 tests, TypeScript and production build; browser checks for mixed modes, legacy XML, undo/redo, dragging, resizing, zoom/pan, three designers, responsive panels and PNG export.

# STRIDER 1.1.0

## Diagram editing

- Set a connection's color in Inspector → Connection color; Reset restores its automatic color. Colors persist in XML and image exports.
- Footer credit: Created by Antonio Lamanna, linking to his LinkedIn profile.
- 40 additional system presets for Microsoft Azure, AWS, GCP, Power BI, Tableau, Alteryx, Microsoft Fabric, Copilot and other AI services. Icons follow STRIDER's existing pictogram style.
- Workflow Library → Containers → Lane adds a BPMN-style horizontal swimlane. Rename and resize lanes, drag components inside, and move their contents together using the existing container behavior.
- Architecture Inspector → Appearance → Display switches between Card and Icon only. Internal and external user presets start as icons; systems support either representation. Connections, labels, properties, custom images and XML/image exports remain available.

## Data models

- Auto arrange uses ELK Layered (Sugiyama) with crossing minimization, fixed column ports and orthogonal routes. It fits the result into view and supports Undo. Routes persist in XML and JSON, and are used in image exports. Moving or resizing tables invalidates the saved routes; run Auto arrange again to optimize the new layout. Crossings cannot be eliminated for every graph.
- Export → SQL generates MySQL CREATE TABLE statements followed by foreign key ALTER TABLE statements, including composite keys. N:N relationships require a junction table; referenced columns must form a primary or unique key. Dataverse types map to MySQL storage types, not Dataverse-specific application behavior. Text defaults must be quoted SQL expressions.
- Export → JSON saves the complete STRIDER data model, including fields, relations, layout and metadata; Open accepts this JSON again. XML remains supported.
- Open accepts MySQL `.sql` schema dumps and automatically lays them out. CREATE TABLE, inline and table primary/unique keys, composite foreign keys, AUTO_INCREMENT and referential actions are supported, as are ALTER TABLE ADD key constraints. SQL is parsed locally and never executed. Row data, session settings and dump housekeeping are ignored. Other statements, indexes and unrepresented options are reported in import notes; this is a schema visualization importer, not a complete database backup/restore utility. Missing referenced tables/fields or invalid table definitions stop import. Limit: 10 MB / 500 tables per SQL file.

## Verification

TypeScript validation, production build, existing regression suite and new MySQL/layout/persistence tests. Browser verification of automatic arrangement, connection routing and export controls.
