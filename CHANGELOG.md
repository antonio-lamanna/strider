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
