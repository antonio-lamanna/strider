import { reconcileRelationship } from "./model/relationships";
import release from "../public/version.json";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  ConnectionLineType,
  SelectionMode,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  useViewport,
} from "@xyflow/react";
import type { Connection, NodeChange, EdgeChange } from "@xyflow/react";
import type {
  Diagram,
  DiagramNode,
  DiagramEdge,
  NodeTemplate,
  WorkflowNodeData,
  WorkflowEdgeData,
} from "./model/diagram";
import {
  createDiagram,
  createNode,
  defaultPorts,
  isContainer,
} from "./model/diagram";
import { newId } from "./utils/id";
import { nodeTemplates } from "./config/nodeTypes";
import { moduleExample } from "./config/moduleExamples";
import { modules, tableTemplate } from "./config/modules";
import { useWorkspace } from "./hooks/useWorkspace";
import { WorkspaceBar } from "./components/toolbar/WorkspaceBar";
import { parseFile, serializeProject } from "./services/projectXml";
import { cleanDiagram, fingerprint } from "./model/diagram";
import { exportExcel } from "./services/excelExport";
import { createField, withFields, } from "./model/dataModel";
import type { DataField, DiagramKind } from "./model/diagram";
import {
  absolutePosition,
  containingGroup,
  descendants,
  nodeLayout,
  reparentNode,
  sortParentsFirst,
} from "./utils/geometry";
import { serializeDiagram } from "./services/xmlSerializer";

import {
  downloadBlob,
  exportDiagram,
  safeFilename,
} from "./services/exportService";
import { useDiagramHistory } from "./hooks/useDiagramHistory";
import { useClipboard } from "./hooks/useClipboard";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { EditorContext } from "./components/canvas/EditorContext";
import { WorkflowNode } from "./components/nodes/WorkflowNode";
import { OrthogonalEdge } from "./components/edges/OrthogonalEdge";
import { Palette, paletteMime } from "./components/palette/Palette";
import { PropertiesPanel } from "./components/properties/PropertiesPanel";
import { Toolbar } from "./components/toolbar/Toolbar";
import { Modal } from "./components/ui/Modal";
import {
  Icon,
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Grid2X2,
  Hand,
  HelpCircle,
  Magnet,
  Maximize,
  MousePointer2,
  PanelLeftClose,
  PanelRightClose,
  Plus,
  RotateCcw,
  Trash2,
  Unlink,
  X,
  ZoomIn,
  ZoomOut,
} from "./components/ui/Icon";

const nodeTypes = { workflow: WorkflowNode, container: WorkflowNode };
const edgeTypes = { orthogonal: OrthogonalEdge };
type ContextMenu = {
  x: number;
  y: number;
  nodeId?: string;
  point: { x: number; y: number };
};
type PendingAction = {
  title: string;
  body: string;
  label: string;
  action: () => void;
  saveAction?: () => boolean;
};
import { loadIconMode, newNodeIconMode, saveIconMode } from "./config/productIcons";
import { IconCredits } from "./components/ui/IconCredits";

function loadTheme() {
  try {
    return localStorage.getItem("automation-canvas-theme") === "dark";
  } catch {
    return false;
  }
}

export default function App() {
  const history = useDiagramHistory(),
    { diagram: d, ref, commit, replace, begin, end } = history;
  const workspace = useWorkspace(history);
  const [iconMode, setIconMode] = useState(loadIconMode);
  useEffect(() => saveIconMode(iconMode), [iconMode]);
  const [newDialog, setNewDialog] = useState(false);
  const [projectDialog, setProjectDialog] = useState(false);
  const [projectMode, setProjectMode] = useState<'create' | 'edit'>('create');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [transparent, setTransparent] = useState(true);
  const flow = useReactFlow<DiagramNode, DiagramEdge>(),
    viewport = useViewport(),
    clipboard = useClipboard();
  const [dark, setDark] = useState(loadTheme),
    [leftOpen, setLeftOpen] = useState(() => window.innerWidth >= 760),
    [rightOpen, setRightOpen] = useState(() => window.innerWidth >= 1150),
    [tool, setTool] = useState<"select" | "pan">("select");
  const [context, setContext] = useState<ContextMenu | null>(null),
    [pending, setPending] = useState<PendingAction | null>(null),
    [help, setHelp] = useState(false),
    [toast, setToast] = useState<{ text: string; error?: boolean } | null>(
      null,
    ),
    [exporting, setExporting] = useState(false),
    [dragOver, setDragOver] = useState(false),
    [error, setError] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null),
    fileRef = useRef<HTMLInputElement>(null),
    menuRef = useRef<HTMLDivElement>(null),
    toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const selectedNodes = useMemo(
    () => d.nodes.filter((n) => n.selected),
    [d.nodes],
  );
  const selectedEdge = d.edges.find((e) => e.selected);
  const notify = useCallback((text: string, isError = false) => {
    clearTimeout(toastTimer.current);
    setToast({ text, error: isError });
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    try {
      localStorage.setItem("automation-canvas-theme", dark ? "dark" : "light");
    } catch {
      /* Preferences are optional. */
    }
  }, [dark]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (workspace.dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [workspace.dirty]);
  useEffect(() => {
    document.title = `${d.name || "Untitled diagram"} · Strider`;
  }, [d.name]);
  useEffect(() => {
    if (!context) return;
    menuRef.current?.querySelector("button")?.focus();
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setContext(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [context]);

  function guard(action: () => void, label: string) {
    if (workspace.dirtyDiagram(d.id))
      setPending({
        title: "Keep your current diagram?",
        body: "You have unsaved changes. Save an XML copy before replacing this diagram.",
        label,
        action,
      });
    else action();
  }
  function loadDiagram(next: Diagram, saved = true, fit = false) {
    history.load({ ...next, id: ref.current.id }, saved);
    setContext(null);
    void flow.setViewport(next.viewport);
    if (fit)
      requestAnimationFrame(() =>
        requestAnimationFrame(
          () =>
            void flow.fitView({ padding: 0.2, duration: 250, maxZoom: 1.15 }),
        ),
      );
  }
  function save() {
    const next = {
      ...ref.current,
      name: ref.current.name.trim() || "Untitled diagram",
      viewport: flow.getViewport(),
    };
    let xml: string;
    try { xml = serializeDiagram(next); parseFile(xml); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save diagram.'); return false; }
    downloadBlob(
      new Blob([xml], {
        type: "application/xml;charset=utf-8",
      }),
      safeFilename(next.name) + ".xml",
    );
    workspace.markDiagramSaved(next);
    notify("XML saved. Reopen it any time to continue.");
    return true;
  }
  function saveProject() {
    const project = workspace.getProject();
    if (!project) return false;
    try {
      const xml = serializeProject(project);
      parseFile(xml);
      downloadBlob(new Blob([xml], { type: "application/xml;charset=utf-8" }), safeFilename(project.name) + ".xml");
      workspace.markProjectSaved();
      notify("Project saved with all diagrams.");
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save project."); return false; }
  }
  function saveWorkspaceBackup() {
    if (workspace.project) return saveProject();
    if (workspace.docs.length === 1) return save();
    try {
      const backup = { id: newId(), name: "Strider workspace", description: "Workspace backup", diagrams: workspace.docs, activeDiagramId: d.id };
      const xml = serializeProject(backup); parseFile(xml);
      downloadBlob(new Blob([xml], { type: "application/xml;charset=utf-8" }), "strider-workspace.xml");
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save workspace."); return false; }
  }
  function saveTabCopy(id: string) {
    const diagram = workspace.docs.find(d => d.id === id);
    if (!diagram) return false;
    try {
      const xml = serializeDiagram(diagram); parseFile(xml);
      downloadBlob(new Blob([xml], { type: 'application/xml;charset=utf-8' }), safeFilename(diagram.name) + '.xml');
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save diagram.'); return false; }
  }
  function openProjectSettings(edit = !!workspace.project) {
    setProjectMode(edit ? 'edit' : 'create');
    setProjectName(edit ? workspace.project?.name ?? 'New project' : 'New project');
    setProjectDescription(edit ? workspace.project?.description ?? '' : '');
    setProjectDialog(true);
  }
  function createTab(kind: DiagramKind) {
    const next = createDiagram(kind);
    workspace.add(next);
    void flow.setViewport(next.viewport);
    setContext(null); setNewDialog(false);
  }
  function selectTab(id: string) {
    if (id === ref.current.id) return;
    const next = workspace.docs.find(d => d.id === id);
    workspace.activate(id);
    if (next) void flow.setViewport(next.viewport);
    setContext(null);
  }
  function closeTab(id: string) {
    const action = () => {
      const wasActive = ref.current.id === id;
      const next = workspace.docs.find(d => d.id !== id);
      workspace.remove(id);
      if (wasActive) void flow.setViewport(next?.viewport ?? { x: 0, y: 0, zoom: 1 });
    };
    if (workspace.project || workspace.dirtyDiagram(id)) setPending({
      title: workspace.project ? "Remove diagram from project?" : "Close unsaved diagram?",
      body: "Export this diagram first if you want to keep a separate copy. Other diagrams will stay open.",
      label: workspace.project ? "Remove diagram" : "Close diagram", action, saveAction: () => saveTabCopy(id),
    }); else action();
  }
  const [arranging, setArranging] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  async function arrange() {
    const before = ref.current; const original = fingerprint(before); setArranging(true);
    try { const { arrangeDataModel } = await import("./services/dataLayout"); const next = await arrangeDataModel(before);
      if (fingerprint(ref.current) !== original) { notify("Diagram changed. Run Auto arrange again."); return; }
      commit(() => next); requestAnimationFrame(() => requestAnimationFrame(() => void flow.fitView({ padding: 0.2, duration: 300 })));
      notify("Tables arranged. Undo restores the previous layout.");
    } catch (e) { setError(e instanceof Error ? e.message : "Layout failed."); } finally { setArranging(false); }
  }
  async function exportData(format: "sql" | "json") {
    try { const content = format === "json" ? JSON.stringify(cleanDiagram(ref.current), null, 2) : (await import("./services/dataSql")).exportMySql(ref.current);
      downloadBlob(new Blob([content], { type: format === "json" ? "application/json" : "application/sql" }), safeFilename(ref.current.name) + "." + format);
      notify(format.toUpperCase() + " exported");
    } catch (e) { setError(e instanceof Error ? e.message : "Export failed."); }
  }
  async function openFile(file: File) {
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Import supports files up to 10 MB. Export a schema without data for large SQL databases.");
      if (/\.sql$/i.test(file.name)) {
        const { importMySql } = await import("./services/dataSql");
        const { arrangeDataModel } = await import("./services/dataLayout");
        const imported = importMySql(await file.text(), file.name.replace(/\.sql$/i, ""));
        const next = await arrangeDataModel(imported.diagram); workspace.add(next, false);
        requestAnimationFrame(() => requestAnimationFrame(() => void flow.fitView({ padding: 0.2 })));
        setImportWarnings(imported.warnings); notify("MySQL schema imported"); return;
      }
      if (/\.json$/i.test(file.name)) {
        const raw = JSON.parse(await file.text());
        if (raw.kind !== "data-model" || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) throw new Error("Open a STRIDER data model JSON file.");
        const result = parseFile(serializeDiagram(raw));
        if (result.type === "diagram") { workspace.add(result.diagram, true); void flow.setViewport(result.diagram.viewport); }
        return;
      }
      const result = parseFile(await file.text());
      if (result.type === "project") {
        const action = () => {
          workspace.loadProject(result.project);
          const next = result.project.diagrams.find(d => d.id === result.project.activeDiagramId) ?? result.project.diagrams[0];
          void flow.setViewport(next?.viewport ?? { x: 0, y: 0, zoom: 1 });
          notify(`Opened project: ${result.project.name}`);
        };
        if (workspace.dirty) setPending({ title: "Open another project?", body: "Save your current diagrams or project before replacing this workspace.", label: "Open project", action, saveAction: saveWorkspaceBackup });
        else action();
      } else {
        workspace.add(result.diagram, true);
        void flow.setViewport(result.diagram.viewport);
        notify(`Opened ${modules.find(m => m.kind === result.diagram.kind)?.name}: ${result.diagram.name}`);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to open this file."); }
  }
  async function exportFile(format: "svg" | "png") {
    setExporting(true);
    try {
      await exportDiagram(ref.current, format, dark, transparent);
      notify(`${format.toUpperCase()} exported`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  const patchData = useCallback(
    (id: string, data: Partial<WorkflowNodeData>) =>
      commit(
        (d) => ({
          ...d,
          nodes: d.nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...data } } : n,
          ),
        }),
        `node:${id}:${Object.keys(data).join(",")}`,
      ),
    [commit],
  );
  function patchFields(id: string, fields: DataField[]) {
    commit(d => {
      const ports = new Set(fields.flatMap(f => [`${f.id}:in`, `${f.id}:out`]));
      return { ...d, nodes: d.nodes.map(n => n.id === id ? withFields(n, fields) : n), edges: d.edges.filter(e => !(e.source === id && !ports.has(e.sourceHandle ?? '')) && !(e.target === id && !ports.has(e.targetHandle ?? ''))) };
    }, `fields:${id}`);
  }
  function patchDiagram(patch: Partial<Diagram>) {
    commit(
      (d) => ({ ...d, ...patch }),
      `diagram:${Object.keys(patch).join(",")}`,
    );
  }
  function patchEdge(
    id: string,
    patch: Partial<DiagramEdge>,
    data?: Partial<WorkflowEdgeData>,
  ) {
    commit(
      (d) => reconcileRelationship({
        ...d,
        edges: d.edges.map((e) =>
          e.id === id
            ? {
                ...e,
                ...patch,
                data: {
                  semantic: "control",
                  lineStyle: "auto",
                  properties: {},
                  ...e.data,
                  ...data,
                },
              }
            : e,
        ),
      }, data?.properties?.cardinality ? id : ""),
      `edge:${id}:${Object.keys(patch).join(",")}:${Object.keys(data ?? {}).join(",")}`,
    );
  }
  function changeType(id: string, t: NodeTemplate) {
    commit((d) => {
      const old = d.nodes.find((n) => n.id === id)!;
      const ports = isContainer(old)
        ? []
        : defaultPorts().filter((p) =>
            t.kind === "start"
              ? p.direction === "output"
              : t.kind === "end"
                ? p.direction === "input"
                : true,
          );
      return {
        ...d,
        nodes: d.nodes.map((n) =>
          n.id === id
            ? {
                ...n,
                ...(isContainer(old)
                  ? {}
                  : {
                      width: undefined,
                      height: undefined,
                      measured: undefined,
                    }),
                data: {
                  ...n.data,
                  kind: t.kind,
                  subtype: t.subtype,
                  icon: t.icon,
                  color: t.color,
                  sizeMode: isContainer(old) ? "manual" : "auto",
                  ports,
                },
              }
            : n,
        ),
        edges: d.edges.filter(
          (e) =>
            (e.source !== id ||
              ports.some(
                (p) =>
                  p.id === (e.sourceHandle ?? "out") &&
                  p.direction === "output",
              )) &&
            (e.target !== id ||
              ports.some(
                (p) =>
                  p.id === (e.targetHandle ?? "in") && p.direction === "input",
              )),
        ),
      };
    });
  }
  function setSize(id: string, width: number, height: number) {
    commit(
      (d) => ({
        ...d,
        nodes: d.nodes.map((n) =>
          n.id === id
            ? {
                ...n,
                width: Math.min(
                  20000,
                  Math.max(isContainer(n) ? 220 : n.data.displayMode === "icon" ? 40 : 150, width),
                ),
                height: Math.min(
                  20000,
                  Math.max(
                    isContainer(n) ? 140 : n.data.displayMode === "icon" ? 40 : n.data.kind === "ai-agent" ? 96 : 62,
                    height,
                  ),
                ),
                data: { ...n.data, sizeMode: "manual" },
              }
            : n,
        ),
      }),
      `size:${id}`,
    );
  }
  function resetSize(id: string) {
    commit((d) => {
      const n = d.nodes.find((n) => n.id === id);
      if (!n) return d;
      if (isContainer(n)) {
        const kids = d.nodes.filter((child) => child.parentId === id);
        if (!kids.length)
          return {
            ...d,
            nodes: d.nodes.map((node) =>
              node.id === id ? { ...node, width: 520, height: 300 } : node,
            ),
          };
        const minX = Math.min(...kids.map((k) => k.position.x)) - 28,
          minY = Math.min(...kids.map((k) => k.position.y)) - 56;
        const width =
            Math.max(...kids.map((k) => k.position.x + nodeLayout(k).width)) -
            minX +
            28,
          height =
            Math.max(...kids.map((k) => k.position.y + nodeLayout(k).height)) -
            minY +
            28;
        return {
          ...d,
          nodes: d.nodes.map((node) =>
            node.id === id
              ? {
                  ...node,
                  position: {
                    x: node.position.x + minX,
                    y: node.position.y + minY,
                  },
                  width: Math.max(220, width),
                  height: Math.max(140, height),
                }
              : node.parentId === id
                ? {
                    ...node,
                    position: {
                      x: node.position.x - minX,
                      y: node.position.y - minY,
                    },
                  }
                : node,
          ),
        };
      }
      return {
        ...d,
        nodes: d.nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                width: undefined,
                height: undefined,
                measured: undefined,
                resizing: false,
                style: undefined,
                data: { ...node.data, sizeMode: "auto" },
              }
            : node,
        ),
      };
    });
  }
  function parentNode(id: string, parentId?: string) {
    commit((d) => {
      const n = d.nodes.find((n) => n.id === id);
      if (!n || n.parentId === parentId) return d;
      return {
        ...d,
        nodes: sortParentsFirst(
          d.nodes.map((node) =>
            node.id === id ? reparentNode(node, parentId, d.nodes) : node,
          ),
        ),
      };
    });
  }
  function selectOnly(id: string) {
    replace((d) => ({
      ...d,
      nodes: d.nodes.map((n) =>
        n.selected === (n.id === id) ? n : { ...n, selected: n.id === id },
      ),
      edges: d.edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
    }));
  }
  const editNode = useCallback(
    (id: string) => {
      replace((d) => ({
        ...d,
        nodes: d.nodes.map((n) => ({ ...n, selected: n.id === id })),
        edges: d.edges.map((e) => ({ ...e, selected: false })),
      }));
      setRightOpen(true);
      requestAnimationFrame(() =>
        document.getElementById("node-label-input")?.focus(),
      );
    },
    [replace],
  );
  function add(template: NodeTemplate, point?: { x: number; y: number }) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const position =
      point ??
      flow.screenToFlowPosition({
        x: rect.left + rect.width / 2 - 90 + Math.random() * 30,
        y: rect.top + rect.height / 2 - 35 + Math.random() * 30,
      });
    if (ref.current.settings.snap) {
      const grid = ref.current.settings.gridSize;
      position.x = Math.round(position.x / grid) * grid;
      position.y = Math.round(position.y / grid) * grid;
    }
    let n = createNode(newNodeIconMode(template, iconMode), position);
    if (template.kind === "table") {
      const id = { ...createField("id"), dataType: "UUID", primaryKey: true, nullable: false };
      n = withFields(n, [id]);
      let count = ref.current.nodes.filter(n => n.data.kind === "table").length + 1;
      while (ref.current.nodes.some(n => n.data.label === `Table_${count}`)) count++;
      n.data.label = `Table_${count}`;
    }
    n.selected = true;
    const parent = containingGroup(n, ref.current.nodes);
    if (parent) n = reparentNode(n, parent.id, [...ref.current.nodes, n]);
    commit((d) => ({
      ...d,
      nodes: sortParentsFirst([
        ...d.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
        n,
      ]),
      edges: d.edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
    }));
  }
  function removeSelection() {
    commit((d) => {
      const ids = descendants(
        new Set(d.nodes.filter((n) => n.selected).map((n) => n.id)),
        d.nodes,
      );
      return {
        ...d,
        nodes: d.nodes.filter((n) => !ids.has(n.id)),
        edges: d.edges.filter(
          (e) => !e.selected && !ids.has(e.source) && !ids.has(e.target),
        ),
      };
    });
    setContext(null);
  }
  function copy() {
    if (clipboard.copy(ref.current)) notify("Selection copied");
  }
  function paste(point?: { x: number; y: number }) {
    if (clipboard.hasContent()) commit((d) => clipboard.paste(d, point));
    else notify("Copy a component first.");
    setContext(null);
  }
  function duplicate() {
    if (clipboard.copy(ref.current)) commit((d) => clipboard.paste(d));
    setContext(null);
  }
  function selectAll() {
    replace((d) => ({
      ...d,
      nodes: d.nodes.map((n) => ({ ...n, selected: true })),
      edges: d.edges.map((e) => ({ ...e, selected: true })),
    }));
  }
  function clearSelection() {
    replace((d) => ({
      ...d,
      nodes: d.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
      edges: d.edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
    }));
    setContext(null);
  }
  function groupSelection() {
    commit((d) => {
      const selected = new Set(
        d.nodes.filter((n) => n.selected).map((n) => n.id),
      );
      const roots = d.nodes.filter(
        (n) =>
          selected.has(n.id) &&
          !d.nodes.some(
            (p) =>
              selected.has(p.id) &&
              p.id !== n.id &&
              descendants(new Set([p.id]), d.nodes).has(n.id),
          ),
      );
      if (!roots.length) return d;
      const coords = roots.map((n) => ({
          ...absolutePosition(n, d.nodes),
          ...nodeLayout(n),
        })),
        x = Math.min(...coords.map((n) => n.x)) - 28,
        y = Math.min(...coords.map((n) => n.y)) - 56;
      const group = createNode(nodeTemplates.find((t) => t.kind === "group")!, {
        x,
        y,
      });
      group.width = Math.max(
        240,
        Math.max(...coords.map((n) => n.x + n.width)) - x + 28,
      );
      group.height = Math.max(
        160,
        Math.max(...coords.map((n) => n.y + n.height)) - y + 28,
      );
      group.selected = true;
      const ids = new Set(roots.map((n) => n.id));
      const nodes = d.nodes.map((n) => {
        if (!ids.has(n.id)) return { ...n, selected: false };
        const at = absolutePosition(n, d.nodes);
        return {
          ...n,
          parentId: group.id,
          position: { x: at.x - x, y: at.y - y },
          selected: false,
        };
      });
      return {
        ...d,
        nodes: sortParentsFirst([group, ...nodes]),
        edges: d.edges.map((e) => ({ ...e, selected: false })),
      };
    });
  }
  function ungroup(id: string) {
    commit((d) => {
      const group = d.nodes.find((n) => n.id === id);
      if (!group) return d;
      return {
        ...d,
        nodes: sortParentsFirst(
          d.nodes
            .filter((n) => n.id !== id)
            .map((n) =>
              n.parentId === id
                ? {
                    ...reparentNode(n, group.parentId, d.nodes),
                    selected: true,
                  }
                : n,
            ),
        ),
        edges: d.edges.filter((e) => e.source !== id && e.target !== id),
      };
    });
    setContext(null);
  }
  function reorder(id: string, front: boolean) {
    commit((d) => {
      const n = d.nodes.find((n) => n.id === id)!;
      const family = d.nodes
        .filter(
          (other) => isContainer(other) === isContainer(n) && other.id !== id,
        )
        .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
      front ? family.push(n) : family.unshift(n);
      const positions = new Map(
        family.map((n, i) => [
          n.id,
          isContainer(n) ? i - family.length - 1 : i + 1,
        ]),
      );
      return {
        ...d,
        nodes: d.nodes.map((n) =>
          positions.has(n.id) ? { ...n, zIndex: positions.get(n.id) } : n,
        ),
      };
    });
    setContext(null);
  }

  const onNodesChange = useCallback(
    (changes: NodeChange<DiagramNode>[]) => {
      const update = (d: Diagram) => ({
        ...d,
        nodes: applyNodeChanges(changes, d.nodes).map((n) => {
          const dimension = changes.find(
            (c) => c.type === "dimensions" && c.id === n.id && c.setAttributes,
          );
          return dimension && n.data.sizeMode !== "manual"
            ? { ...n, data: { ...n.data, sizeMode: "manual" as const } }
            : n;
        }),
      });
      if (
        changes.some(
          (c) =>
            c.type === "remove" ||
            (c.type === "position" && c.dragging === undefined),
        )
      )
        commit(update, "keyboard-position");
      else replace(update);
    },
    [commit, replace],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<DiagramEdge>[]) => {
      const update = (d: Diagram) => ({
        ...d,
        edges: applyEdgeChanges(changes, d.edges),
      });
      if (changes.some((c) => c.type === "remove")) commit(update);
      else replace(update);
    },
    [commit, replace],
  );
  const connect = useCallback(
    (connection: Connection) =>
      commit((d) => {
        if (
          !connection.source ||
          !connection.target ||
          (connection.source === connection.target && d.kind !== "data-model")
        )
          return d;
        if (
          d.edges.some(
            (e) =>
              e.source === connection.source &&
              e.target === connection.target &&
              e.sourceHandle === connection.sourceHandle &&
              e.targetHandle === connection.targetHandle,
          )
        )
          return d;
        const e: DiagramEdge = {
          ...connection,
          id: newId(),
          type: "orthogonal",
          label: "",
          data: d.kind === "data-model" ? { semantic: "data", lineStyle: "solid", properties: { cardinality: "1:N" } } : { semantic: "control", lineStyle: "auto", properties: {} },
        };
        return reconcileRelationship({ ...d, edges: [...d.edges, e] }, e.id);
      }),
    [commit],
  );
  const dragStop = useCallback(
    (_event: unknown, node: DiagramNode, moved: DiagramNode[]) => {
      commit((d) => {
        const ids = new Set((moved.length ? moved : [node]).map((n) => n.id));
        let nodes = d.nodes;
        for (const id of ids) {
          const n = nodes.find((n) => n.id === id);
          if (!n || (n.parentId && ids.has(n.parentId))) continue;
          const target = containingGroup(n, nodes);
          if (n.parentId !== target?.id)
            nodes = nodes.map((item) =>
              item.id === id ? reparentNode(item, target?.id, nodes) : item,
            );
        }
        return { ...d, nodes: sortParentsFirst(nodes) };
      });
      end();
    },
    [commit, end],
  );
  const editorActions = useMemo(
    () => ({
      editNode,
      beginResize: (id: string) => {
        begin();
        replace((d) => ({
          ...d,
          nodes: d.nodes.map((n) => {
            if (n.id !== id) return n;
            const s = nodeLayout(n);
            return {
              ...n,
              width: s.width,
              height: s.height,
              data: { ...n.data, sizeMode: "manual" },
            };
          }),
        }));
      },
      endResize: () => requestAnimationFrame(end),
    }),
    [editNode, begin, replace, end],
  );
  function contextMenu(
    event: React.MouseEvent | MouseEvent,
    node?: DiagramNode,
  ) {
    event.preventDefault();
    if (node && !node.selected) selectOnly(node.id);
    setContext({
      x: Math.min(event.clientX, window.innerWidth - 226),
      y: Math.min(event.clientY, window.innerHeight - (node ? 344 : 160)),
      nodeId: node?.id,
      point: flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }),
    });
  }
  const fit = () =>
    void flow.fitView({ padding: 0.22, duration: 250, maxZoom: 1.2 });
  useKeyboardShortcuts(
    {
      delete: removeSelection,
      backspace: removeSelection,
      "mod+c": copy,
      "mod+v": () => paste(),
      "mod+d": duplicate,
      "mod+z": history.undo,
      "mod+shift+z": history.redo,
      "mod+y": history.redo,
      "mod+a": selectAll,
      "mod+s": () => workspace.project ? saveProject() : save(),
      "mod+g": groupSelection,
      escape: clearSelection,
      "1": fit,
      v: () => setTool("select"),
      h: () => setTool("pan"),
      "?": () => setHelp(true),
    },
    !!pending || help || !!error || newDialog || projectDialog,
  );

  return (
    <EditorContext.Provider value={editorActions}>
      <div
        className={`app-shell ${leftOpen ? "has-left" : ""} ${rightOpen ? "has-right" : ""}`}
      >
        <Toolbar
          name={d.name}
          dirty={workspace.dirtyDiagram(d.id)}
          onName={(name) => patchDiagram({ name })}
          onNew={() => setNewDialog(true)}
          onOpen={() => fileRef.current?.click()}
          onSave={save}
          onExport={exportFile}
          undo={history.undo}
          redo={history.redo}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          dark={dark}
          onTheme={() => setDark((v) => !v)}
          onHelp={() => setHelp(true)}
          hasNodes={!!d.nodes.length}
          exporting={exporting}
          transparent={transparent}
          onTransparent={setTransparent}
          onSQL={d.kind === "data-model" ? () => void exportData("sql") : undefined}
          onJSON={d.kind === "data-model" ? () => void exportData("json") : undefined}
          onArrange={d.kind === "data-model" ? () => void arrange() : undefined}
          arranging={arranging}
          onExcel={d.kind === 'data-model' ? () => exportExcel(d) : undefined}
        />
        <WorkspaceBar docs={workspace.docs} active={d.id} project={workspace.project} dirty={workspace.dirty} dirtyDiagram={workspace.dirtyDiagram} onSelect={selectTab} onRemove={closeTab} onNew={() => setNewDialog(true)} onProject={() => openProjectSettings()} onSaveProject={saveProject}/>
        <input
          className="visually-hidden"
          type="file"
          accept=".xml,.sql,.json,application/xml,text/xml,application/json,application/sql"
          aria-label="Open XML, JSON or SQL file"
          ref={fileRef}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void openFile(f);
          }}
        />
        <main className="editor-workspace">
          {leftOpen && (
            <Palette key={d.kind}
              iconMode={iconMode}
              onIconMode={setIconMode}
              kind={d.kind}
              onAdd={add}
              onDrop={(template, x, y) => {
                const r = canvasRef.current?.getBoundingClientRect();
                if (
                  r &&
                  x >= r.left &&
                  x <= r.right &&
                  y >= r.top &&
                  y <= r.bottom
                )
                  add(
                    template,
                    flow.screenToFlowPosition({ x: x - 35, y: y - 25 }),
                  );
              }}
              onClose={() => setLeftOpen(false)}
            />
          )}
          <div
            className={`canvas-area ${dragOver ? "is-dropping" : ""}`}
            ref={canvasRef}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              setDragOver(true);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node))
                setDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const raw = e.dataTransfer.getData(paletteMime);
              if (raw) {
                try {
                  add(
                    JSON.parse(raw),
                    flow.screenToFlowPosition({
                      x: e.clientX - 50,
                      y: e.clientY - 25,
                    }),
                  );
                } catch {
                  notify("Could not add this component.", true);
                }
              } else if (e.dataTransfer.files[0])
                void openFile(e.dataTransfer.files[0]);
            }}
          >
            <ReactFlow<DiagramNode, DiagramEdge>
              nodes={d.nodes}
              edges={d.edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={connect}
              onNodeDragStart={begin}
              onNodeDragStop={dragStop}
              onSelectionDragStart={begin}
              onSelectionDragStop={(_e, nodes) => {
                if (nodes[0]) dragStop(_e, nodes[0], nodes);
                else end();
              }}
              onNodeContextMenu={contextMenu}
              onPaneContextMenu={(e) => contextMenu(e)}
              onPaneClick={() => setContext(null)}
              onNodeDoubleClick={(_e, n) => editNode(n.id)}
              onEdgeDoubleClick={(_e, edge) => {
                replace((d) => ({
                  ...d,
                  nodes: d.nodes.map((n) => ({ ...n, selected: false })),
                  edges: d.edges.map((e) => ({
                    ...e,
                    selected: e.id === edge.id,
                  })),
                }));
                setRightOpen(true);
                requestAnimationFrame(() =>
                  document.getElementById("edge-label-input")?.focus(),
                );
              }}
              onMoveEnd={(_e, v) => replace((d) => ({ ...d, viewport: v }))}
              defaultViewport={d.viewport}
              minZoom={0.1}
              maxZoom={3}
              snapToGrid={d.settings.snap}
              snapGrid={[d.settings.gridSize, d.settings.gridSize]}
              connectionLineType={ConnectionLineType.SmoothStep}
              connectionLineStyle={{ stroke: "var(--focus)", strokeWidth: 1.5 }}
              selectionMode={SelectionMode.Partial}
              selectionOnDrag={tool === "select"}
              panOnDrag={tool === "pan" ? true : [1, 2]}
              panOnScroll
              zoomOnScroll={false}
              zoomOnPinch
              selectionKeyCode="Shift"
              multiSelectionKeyCode={["Meta", "Control"]}
              deleteKeyCode={null}
              selectNodesOnDrag
              elevateEdgesOnSelect={false}
              isValidConnection={(c) => d.kind === "data-model" ? !!c.sourceHandle && !!c.targetHandle && c.sourceHandle !== c.targetHandle : c.source !== c.target}
              colorMode={dark ? "dark" : "light"}
            >
              {d.settings.grid && (
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={d.settings.gridSize}
                  size={1}
                  color={d.settings.gridColor ?? (dark ? "#4b5666" : "#bbc3ce")}
                />
              )}
            </ReactFlow>
            <div className="canvas-topline">
              <div className="canvas-breadcrumb">
                {!leftOpen && (
                  <button
                    className="icon-button panel-reveal"
                    aria-label="Open component library"
                    title="Open library"
                    onClick={() => setLeftOpen(true)}
                  >
                    <PanelLeftClose size={17} />
                  </button>
                )}
                <span className="canvas-tag">
                  <Icon name="workflow" size={13} />
                  {modules.find(m => m.kind === d.kind)?.name.toUpperCase()}
                </span>
                <span className="breadcrumb-slash">/</span>
                <span>{d.name || "Untitled diagram"}</span>
              </div>
              <div className="canvas-top-actions">
                <button
                  className="subtle-button"
                  onClick={() =>
                    guard(
                      () => loadDiagram(moduleExample(d.kind), false, true),
                      "Load example",
                    )
                  }
                >
                  <Icon name="play" size={12} />
                  Load example
                </button>
                {!rightOpen && (
                  <button
                    className="icon-button panel-reveal"
                    aria-label="Open properties panel"
                    title="Open inspector"
                    onClick={() => setRightOpen(true)}
                  >
                    <PanelRightClose size={17} />
                  </button>
                )}
              </div>
            </div>
            {!d.nodes.length && (
              <div className="empty-canvas">
                <div className="empty-diagram-icon">
                  <Icon name="workflow" size={31} />
                </div>
                <h1>Start a new diagram</h1>
                <p>Drag a component here to start building.</p>
                <div className="empty-quick-actions">
                  <button
                    onClick={() =>
                      add(d.kind === "data-model" ? tableTemplate : nodeTemplates.find((t) => t.kind === (d.kind === "architecture" ? "application" : "task"))!)
                    }
                  >
                    <Plus size={14} />
                    {d.kind === "data-model" ? "Add a table" : d.kind === "architecture" ? "Add a system" : "Add a task"}
                  </button>
                  <span>or</span>
                  <button
                    onClick={() =>
                      guard(
                        () => loadDiagram(moduleExample(d.kind), false, true),
                        "Load example",
                      )
                    }
                  >
                    Explore an example
                    <Icon name="external-link" size={12} />
                  </button>
                </div>
                <div className="empty-hint">
                  <kbd>Shift</kbd> + drag to select · scroll to pan
                </div>
              </div>
            )}
            <div className="canvas-bottom">
              <div className="tool-switch floating-bar">
                <button
                  className={tool === "select" ? "active" : ""}
                  title="Select · V"
                  aria-label="Select tool"
                  onClick={() => setTool("select")}
                >
                  <MousePointer2 size={18} />
                </button>
                <button
                  className={tool === "pan" ? "active" : ""}
                  title="Pan · H"
                  aria-label="Pan tool"
                  onClick={() => setTool("pan")}
                >
                  <Hand size={18} />
                </button>
                {selectedNodes.length > 1 && (
                  <>
                    <span className="bar-divider" />
                    <button
                      title="Group selection · Ctrl/⌘ G"
                      aria-label="Group selection"
                      onClick={groupSelection}
                    >
                      <Icon name="group" size={18} />
                    </button>
                  </>
                )}
              </div>
              <div className="zoom-controls floating-bar">
                <button
                  title="Zoom out"
                  aria-label="Zoom out"
                  onClick={() => void flow.zoomOut({ duration: 150 })}
                >
                  <ZoomOut size={17} />
                </button>
                <button
                  className="zoom-percent"
                  title="Reset to 100%"
                  onClick={() => void flow.zoomTo(1, { duration: 150 })}
                >
                  {Math.round(viewport.zoom * 100)}%
                </button>
                <button
                  title="Zoom in"
                  aria-label="Zoom in"
                  onClick={() => void flow.zoomIn({ duration: 150 })}
                >
                  <ZoomIn size={17} />
                </button>
                <span className="bar-divider" />
                <button
                  title="Fit diagram · 1"
                  aria-label="Fit diagram"
                  onClick={fit}
                  disabled={!d.nodes.length}
                >
                  <Maximize size={17} />
                </button>
                <span className="bar-divider" />
                <button
                  className={d.settings.grid ? "toggled" : ""}
                  aria-label="Toggle grid"
                  title="Show grid"
                  onClick={() =>
                    patchDiagram({
                      settings: { ...d.settings, grid: !d.settings.grid },
                    })
                  }
                >
                  <Grid2X2 size={17} />
                </button>
                <button
                  className={d.settings.snap ? "toggled" : ""}
                  aria-label="Toggle snap"
                  title="Snap to grid"
                  onClick={() =>
                    patchDiagram({
                      settings: { ...d.settings, snap: !d.settings.snap },
                    })
                  }
                >
                  <Magnet size={17} />
                </button>
              </div>
              <button
                className="floating-help"
                title="Keyboard shortcuts"
                aria-label="Show shortcuts"
                onClick={() => setHelp(true)}
              >
                <HelpCircle size={18} />
              </button>
            </div>
            {dragOver && (
              <div className="drop-indicator">Drop to add to your diagram</div>
            )}
          </div>
          {rightOpen && (
            <PropertiesPanel
              diagram={d}
              nodes={selectedNodes}
              edge={selectedEdge}
              onDiagram={patchDiagram}
              onData={patchData}
              onFields={patchFields}
              onType={changeType}
              onEdge={patchEdge}
              onSize={setSize}
              onReset={resetSize}
              onParent={parentNode}
              onDelete={removeSelection}
              onDuplicate={duplicate}
              onGroup={groupSelection}
              onUngroup={ungroup}
              onClose={() => setRightOpen(false)}
            />
          )}
        </main>
        <footer className="status-bar">
          <span>
            <span className="status-dot" />
            Ready
            <span className="status-separator" /> {d.nodes.length} components
            <span className="status-separator" />
            {d.edges.length} connections
            {(selectedNodes.length > 0 || selectedEdge) && (
              <span className="selected-status">
                {selectedNodes.length +
                  d.edges.filter((e) => e.selected).length}{" "}
                selected
              </span>
            )}
          </span>
          <span className="status-hint">
            Drag to select
            <span className="status-separator" />
            Scroll to pan
            <span className="status-separator" />
            <kbd>?</kbd> Shortcuts
          </span>
          <span>
            Grid {d.settings.gridSize} px · Snap{" "}
            {d.settings.snap ? "on" : "off"}
          </span>
          <span className="release-version" title="Installed Strider version">v{release.version}</span>
          <span className="author-credit">Created by <a href="https://www.linkedin.com/in/antoniolamanna/" target="_blank" rel="noopener noreferrer">Antonio Lamanna</a></span>
        </footer>
        {importWarnings.length > 0 && <Modal title="SQL import notes" onClose={() => setImportWarnings([])}><p>Tables and supported keys were imported. Review these items:</p><ul>{importWarnings.map((w, i) => <li key={i}>{w}</li>)}</ul><button className="primary-button" onClick={() => setImportWarnings([])}>Done</button></Modal>}
        {newDialog && <Modal title="Create a diagram" onClose={() => setNewDialog(false)}>
          <div className="new-module-list">{modules.map(m => <button key={m.kind} onClick={() => createTab(m.kind)}><Icon name={m.icon} size={24}/><span><strong>{m.name} Designer</strong><small>{m.description}</small></span><Plus size={17}/></button>)}</div>
          <div className="modal-actions"><button className="text-button" onClick={() => { setNewDialog(false); openProjectSettings(false); }}>Create a project</button><button className="secondary-button" onClick={() => setNewDialog(false)}>Cancel</button></div>
        </Modal>}
        {projectDialog && <Modal title={projectMode === "edit" ? "Project settings" : "Create project"} onClose={() => setProjectDialog(false)}>
          <div className="project-form"><label className="field"><span>Project name</span><input autoFocus value={projectName} onChange={e => setProjectName(e.target.value)}/></label><label className="field"><span>Description</span><textarea rows={3} value={projectDescription} onChange={e => setProjectDescription(e.target.value)}/></label><p>{projectMode === 'edit' ? 'All open diagrams belong to this project.' : workspace.project ? 'Start a new project with an empty workflow. Save the current project first to keep your work.' : 'The open diagrams will become part of this project. You can add as many diagrams as you need.'}</p></div>
          <div className="modal-actions"><button className="secondary-button" onClick={() => setProjectDialog(false)}>Cancel</button><button className="primary-button" disabled={!projectName.trim()} onClick={() => {
            const next = { id: projectMode === 'edit' ? workspace.project!.id : newId(), name: projectName.trim(), description: projectDescription };
            const action = () => { if (projectMode === 'edit') workspace.setProject(next); else { workspace.createProject(next, !workspace.project); if (workspace.project) void flow.setViewport({ x: 0, y: 0, zoom: 1 }); } };
            setProjectDialog(false);
            if (projectMode === 'create' && workspace.project && workspace.dirty) setPending({ title: 'Create a new project?', body: 'Save the current project to keep all its diagrams.', label: 'Create project', action, saveAction: saveProject }); else action();
          }}>{projectMode === 'edit' ? "Apply" : "Create project"}</button></div>
        </Modal>}
        {context && (
          <div
            className="context-menu dropdown"
            ref={menuRef}
            style={{ left: context.x, top: context.y }}
            role="menu"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setContext(null);
                canvasRef.current?.focus();
              }
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                const buttons = Array.from(
                  e.currentTarget.querySelectorAll("button:not(:disabled)"),
                );
                const current = buttons.indexOf(
                  document.activeElement as HTMLButtonElement,
                );
                (
                  buttons[
                    (current +
                      (e.key === "ArrowDown" ? 1 : -1) +
                      buttons.length) %
                      buttons.length
                  ] as HTMLButtonElement
                )?.focus();
              }
            }}
          >
            {context.nodeId ? (
              <>
                <button
                  role="menuitem"
                  onClick={() => {
                    editNode(context.nodeId!);
                    setContext(null);
                  }}
                >
                  <Icon name="settings" size={15} />
                  Edit properties
                </button>
                <button role="menuitem" onClick={duplicate}>
                  <Copy size={15} />
                  Duplicate<kbd>⌘ D</kbd>
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    copy();
                    setContext(null);
                  }}
                >
                  <Copy size={15} />
                  Copy<kbd>⌘ C</kbd>
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    resetSize(context.nodeId!);
                    setContext(null);
                  }}
                >
                  <RotateCcw size={15} />
                  Reset size
                </button>
                {isContainer(d.nodes.find((n) => n.id === context.nodeId)!) && (
                  <button
                    role="menuitem"
                    onClick={() => ungroup(context.nodeId!)}
                  >
                    <Unlink size={15} />
                    Ungroup
                  </button>
                )}
                <hr />
                <button
                  role="menuitem"
                  onClick={() => reorder(context.nodeId!, true)}
                >
                  <ArrowUp size={15} />
                  Bring forward
                </button>
                <button
                  role="menuitem"
                  onClick={() => reorder(context.nodeId!, false)}
                >
                  <ArrowDown size={15} />
                  Send backward
                </button>
                <hr />
                <button
                  role="menuitem"
                  className="danger"
                  onClick={removeSelection}
                >
                  <Trash2 size={15} />
                  Delete<kbd>⌫</kbd>
                </button>
              </>
            ) : (
              <>
                <button
                  role="menuitem"
                  disabled={!clipboard.hasContent()}
                  onClick={() => paste(context.point)}
                >
                  <Copy size={15} />
                  Paste<kbd>⌘ V</kbd>
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    selectAll();
                    setContext(null);
                  }}
                >
                  <Icon name="group" size={15} />
                  Select all<kbd>⌘ A</kbd>
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    fit();
                    setContext(null);
                  }}
                >
                  <Maximize size={15} />
                  Fit diagram<kbd>1</kbd>
                </button>
              </>
            )}
          </div>
        )}
        {toast && (
          <div className={`toast ${toast.error ? "error" : ""}`} role="status">
            {toast.error ? <X size={16} /> : <Check size={16} />}
            <span>{toast.text}</span>
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setToast(null)}
            >
              <X size={14} />
            </button>
          </div>
        )}
        {pending && (
          <Modal title={pending.title} onClose={() => setPending(null)}>
            <p>{pending.body}</p>
            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={() => setPending(null)}
              >
                Cancel
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  pending.action();
                  setPending(null);
                }}
              >
                Discard & continue
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  if (!(pending.saveAction ? pending.saveAction() : workspace.project ? saveProject() : save())) { setPending(null); return; }
                  pending.action();
                  setPending(null);
                }}
              >
                Save & continue
              </button>
            </div>
          </Modal>
        )}
        {error && (
          <Modal
            title="We couldn't open this file or export"
            onClose={() => setError("")}
          >
            <p className="error-detail">{error}</p>
            <div className="modal-actions">
              <button className="primary-button" onClick={() => setError("")}>
                Back to diagram
              </button>
            </div>
          </Modal>
        )}
        {help && (
          <Modal
            title="Make room for your ideas"
            onClose={() => setHelp(false)}
          >
            <p className="help-intro">
              Drag components from the library. Connect an output on the right
              or bottom to an input on the left or top. Double-click an element
              to edit it.
            </p>
            <div className="shortcut-list">
              {[
                ["Copy / paste", "⌘ C / ⌘ V"],
                ["Duplicate", "⌘ D"],
                ["Undo / redo", "⌘ Z / ⌘ ⇧ Z"],
                ["Select all", "⌘ A"],
                ["Group selection", "⌘ G"],
                ["Save XML", "⌘ S"],
                ["Delete selected", "Delete / Backspace"],
                ["Select / pan tool", "V / H"],
                ["Fit diagram", "1"],
                ["Clear selection", "Esc"],
              ].map(([label, key]) => (
                <div key={label}>
                  <span>{label}</span>
                  <kbd>{key}</kbd>
                </div>
              ))}
            </div>
            <IconCredits />
            <p className="help-footnote">
              Use Ctrl in place of ⌘ on Windows and Linux. Shift-drag creates a
              selection. Ctrl/⌘-click adds to a selection. Move a component
              fully inside a container to group it; move it out to detach.
            </p>
            <div className="modal-actions">
              <button className="primary-button" onClick={() => setHelp(false)}>
                Back to canvas
              </button>
            </div>
          </Modal>
        )}
      </div>
    </EditorContext.Provider>
  );
}
