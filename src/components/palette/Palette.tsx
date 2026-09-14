import { productPresets, productSearchTerms } from "../../config/productIcons";
import { NodeIcon } from "../ui/NodeIcon";
import type { IconMode } from "../../model/diagram";
import { useMemo, useState, useRef } from "react";
import type { CSSProperties } from "react";
import { architectureCategories, tableTemplate } from "../../config/modules";
import type { DiagramKind } from "../../model/diagram";
import { nodeCategories } from "../../config/nodeTypes";

import type { NodeTemplate } from "../../model/diagram";
import { ChevronDown, Search, X, PanelLeftClose, Plus } from "../ui/Icon";
const mime = "application/automation-node";
export { mime as paletteMime };
export function Palette({
  kind = "workflow",
  iconMode, onIconMode,
  onAdd,
  onDrop,
  onClose,
}: {
  kind?: DiagramKind;
  iconMode: IconMode;
  onIconMode: (mode: IconMode) => void;
  onAdd: (template: NodeTemplate) => void;
  onDrop: (template: NodeTemplate, x: number, y: number) => void;
  onClose: () => void;
}) {
  const drag = useRef<{
      template: NodeTemplate;
      x: number;
      y: number;
      moved: boolean;
    } | null>(null),
    suppressClick = useRef(false);
  const [preview, setPreview] = useState<{
    template: NodeTemplate;
    x: number;
    y: number;
  } | null>(null);
  const [search, setSearch] = useState(""),
    [tab, setTab] = useState<"components" | "systems">("components"),
    [collapsed, setCollapsed] = useState<Set<string>>(
      () =>
        new Set([
          "Data",
          "Actors",
          "Physical",
          "Systems & resources",
          "Containers",
        ]),
    );
  const categories = useMemo(
    () =>
      (tab === "components" || kind === "data-model")
        ? kind === "architecture" ? architectureCategories : kind === "data-model" ? [{ name: "Data model", items: [tableTemplate] }] : nodeCategories
        : Array.from(new Set(productPresets.map((p) => p.category))).map(
            (name) => ({
              name,
              items: productPresets
                .filter((p) => p.category === name)
                .map(
                  (p) =>
                    ({
                      kind: "application",
                      label: p.name,
                      system: p.id,
                      icon: p.icon,
                      color: p.accentColor,
                    }) as NodeTemplate,
                ),
            }),
          ),
    [tab, kind],
  );
  const filtered = categories
    .map((c) => ({
      ...c,
      items: c.items.filter((i) =>
        `${i.label} ${i.kind} ${c.name} ${productSearchTerms(i.system)}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    }))
    .filter((c) => c.items.length);
  return (
    <aside className="palette panel" aria-label="Component palette">
      <div className="panel-heading">
        <span>Library</span>
        <button
          className="icon-button"
          title="Collapse library"
          onClick={onClose}
        >
          <PanelLeftClose size={16} />
        </button>
      </div>
      <div style={kind === "data-model" ? { display: "none" } : undefined} className="palette-tabs" role="tablist" aria-label="Library type">
        <button
          role="tab"
          aria-selected={tab === "components"}
          className={tab === "components" ? "active" : ""}
          onClick={() => setTab("components")}
        >
          Components
        </button>
        <button
          role="tab"
          aria-selected={tab === "systems"}
          className={tab === "systems" ? "active" : ""}
          onClick={() => setTab("systems")}
        >
          Systems <span>{productPresets.length}</span>
        </button>
      </div>
      {kind !== "data-model" && <div className="library-icon-mode"><div className="sizing-switch" role="group" aria-label="Library icon mode">{(["standard", "product"] as const).map(mode => <button key={mode} aria-pressed={iconMode === mode} className={iconMode === mode ? "active" : ""} onClick={() => onIconMode(mode)}>{mode === "standard" ? "Standard icons" : "Product icons"}</button>)}</div><small>Icon style for the library and new elements</small></div>}
      <div className="palette-search">
        <Search size={15} />
        <input
          aria-label="Search components"
          placeholder={
            tab === "systems" ? "Search systems…" : "Search components…"
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            className="icon-button"
            aria-label="Clear search"
            onClick={() => setSearch("")}
          >
            <X size={13} />
          </button>
        )}
      </div>
      <div className="palette-scroll">
        {filtered.map((c) => (
          <section className="palette-category" key={c.name}>
            <button
              className="category-heading"
              onClick={() =>
                setCollapsed((prev) => {
                  const next = new Set(prev);
                  next.has(c.name) ? next.delete(c.name) : next.add(c.name);
                  return next;
                })
              }
              aria-expanded={!!search || !collapsed.has(c.name)}
            >
              <ChevronDown
                size={13}
                className={!search && collapsed.has(c.name) ? "collapsed" : ""}
              />
              {c.name}
              <span>{c.items.length}</span>
            </button>
            {(search || !collapsed.has(c.name)) && (
              <div className="palette-items">
                {c.items.map((t) => (
                  <button
                    key={t.system ?? `${t.kind}-${t.subtype ?? ""}-${t.label}`}
                    className="palette-item"
                    draggable={false}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      suppressClick.current = false;
                      drag.current = {
                        template: t,
                        x: e.clientX,
                        y: e.clientY,
                        moved: false,
                      };
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      const start = drag.current;
                      if (!start) return;
                      if (
                        Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5
                      )
                        start.moved = true;
                      if (start.moved)
                        setPreview({ template: t, x: e.clientX, y: e.clientY });
                    }}
                    onPointerUp={(e) => {
                      const start = drag.current;
                      drag.current = null;
                      setPreview(null);
                      if (e.currentTarget.hasPointerCapture(e.pointerId))
                        e.currentTarget.releasePointerCapture(e.pointerId);
                      if (start?.moved) {
                        suppressClick.current = true;
                        onDrop(start.template, e.clientX, e.clientY);
                      }
                    }}
                    onPointerCancel={() => {
                      drag.current = null;
                      setPreview(null);
                      suppressClick.current = true;
                    }}
                    onClick={() => {
                      if (suppressClick.current) {
                        suppressClick.current = false;
                        return;
                      }
                      onAdd(t);
                    }}
                    title={`Drag ${t.label} to the canvas, or click to add`}
                    style={{ "--accent": t.color } as CSSProperties}
                  >
                    <span
                      className={`palette-icon ${t.kind === "gateway" ? "diamond-icon" : ""}`}
                    >
                      <NodeIcon data={{ ...t, iconMode }} size={17} />
                    </span>
                    <span>{t.label}</span>
                    <Plus className="palette-add" size={13} />
                  </button>
                ))}
              </div>
            )}
          </section>
        ))}
        {!filtered.length && (
          <div className="no-results">No matching components.</div>
        )}
      </div>
      <div className="palette-footer">
        <span className="drag-symbol">⠿</span>
        <span>
          Drag onto the canvas
          <br />
          <small>or click to place a component</small>
        </span>
      </div>
      {preview && (
        <div
          className="palette-drag-preview"
          style={
            {
              left: preview.x + 12,
              top: preview.y + 10,
              "--accent": preview.template.color,
            } as CSSProperties
          }
        >
          <NodeIcon data={{ ...preview.template, iconMode }} size={19} />
          <span>{preview.template.label}</span>
        </div>
      )}
    </aside>
  );
}
