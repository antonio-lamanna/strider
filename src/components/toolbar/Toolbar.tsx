import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  FolderOpen,
  Plus,
  Save,
  Undo2,
  Redo2,
  Sun,
  Moon,
  HelpCircle,
  Icon,
} from "../ui/Icon";
interface Props {
  name: string;
  dirty: boolean;
  onName: (v: string) => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onExport: (type: "svg" | "png") => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  dark: boolean;
  onTheme: () => void;
  onHelp: () => void;
  hasNodes: boolean;
  exporting: boolean;
}
export function Toolbar(p: Props) {
  const [exportMenu, setExportMenu] = useState(false),
    menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!exportMenu) return;
    const close = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node)) setExportMenu(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExportMenu(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", key);
    };
  }, [exportMenu]);
  return (
    <header className="top-toolbar">
      <a
        className="brand"
        href="#"
        onClick={(e) => e.preventDefault()}
        title="Automation Canvas"
      >
        <span className="brand-mark">
          <Icon name="workflow" size={22} />
        </span>
        <span>
          Automation<span className="brand-light">Canvas</span>
        </span>
      </a>
      <span className="toolbar-divider name-divider" />
      <div className="diagram-title">
        <input
          value={p.name}
          aria-label="Diagram name"
          onChange={(e) => p.onName(e.target.value)}
          onBlur={() => {
            if (!p.name.trim()) p.onName("Untitled diagram");
          }}
        />
        <span className={`save-state ${p.dirty ? "dirty" : ""}`}>
          {p.dirty ? "Unsaved changes" : "All changes saved"}
        </span>
      </div>
      <div className="toolbar-actions">
        <div className="history-actions">
          <button
            className="icon-button"
            title="Undo · Ctrl/⌘ Z"
            aria-label="Undo"
            onClick={p.undo}
            disabled={!p.canUndo}
          >
            <Undo2 size={17} />
          </button>
          <button
            className="icon-button"
            title="Redo · Ctrl/⌘ Shift Z"
            aria-label="Redo"
            onClick={p.redo}
            disabled={!p.canRedo}
          >
            <Redo2 size={17} />
          </button>
        </div>
        <span className="toolbar-divider" />
        <button className="text-button" onClick={p.onNew} title="New diagram">
          <Plus size={16} />
          <span>New</span>
        </button>
        <button className="text-button" onClick={p.onOpen} title="Open XML">
          <FolderOpen size={16} />
          <span>Open</span>
        </button>
        <button
          className="text-button"
          onClick={p.onSave}
          title="Save XML · Ctrl/⌘ S"
        >
          <Save size={16} />
          <span>Save XML</span>
        </button>
        <div className="export-control" ref={menu}>
          <button
            className="primary-button"
            disabled={!p.hasNodes || p.exporting}
            onClick={() => setExportMenu((v) => !v)}
            aria-expanded={exportMenu}
          >
            <Download size={15} />
            {p.exporting ? "Exporting…" : "Export"}
            <ChevronDown size={13} />
          </button>
          {exportMenu && (
            <div className="dropdown export-menu">
              <button
                onClick={() => {
                  p.onExport("png");
                  setExportMenu(false);
                }}
              >
                <Icon name="file" size={16} />
                <span>
                  Export PNG<small>High-resolution image</small>
                </span>
              </button>
              <button
                onClick={() => {
                  p.onExport("svg");
                  setExportMenu(false);
                }}
              >
                <Icon name="code" size={16} />
                <span>
                  Export SVG<small>Editable vector graphics</small>
                </span>
              </button>
            </div>
          )}
        </div>
        <span className="toolbar-divider" />
        <button
          className="icon-button"
          title={p.dark ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle theme"
          onClick={p.onTheme}
        >
          {p.dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          className="icon-button help-top"
          title="Keyboard shortcuts"
          aria-label="Keyboard shortcuts"
          onClick={p.onHelp}
        >
          <HelpCircle size={18} />
        </button>
      </div>
    </header>
  );
}
