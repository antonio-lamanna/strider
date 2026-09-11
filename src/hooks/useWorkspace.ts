import { useRef, useState } from 'react';
import type { Diagram } from '../model/diagram';
import { cleanDiagram, createDiagram, fingerprint } from '../model/diagram';
import type { Project, ProjectFile } from '../model/project';
import { projectFingerprint } from '../model/project';
import { newId } from '../utils/id';
import { useDiagramHistory } from './useDiagramHistory';

export function useWorkspace(history: ReturnType<typeof useDiagramHistory>) {
  const [documents, setDocuments] = useState<Diagram[]>([history.diagram]);
  const [project, setProject] = useState<Project | null>(null);
  const [projectSaved, setProjectSaved] = useState('');
  const saved = useRef(new Map<string, string>([[history.diagram.id, fingerprint(history.diagram)]]));
  const all = () => documents.map(d => d.id === history.ref.current.id ? history.ref.current : d);
  const docs = all();
  function stash() { const current = all(); setDocuments(current); return current; }
  function activate(id: string) {
    const current = stash(), next = current.find(d => d.id === id);
    if (next) history.switchTo(next);
  }
  function add(d: Diagram, imported = false) {
    const next = all().some(n => n.id === d.id) ? { ...d, id: newId() } : d;
    setDocuments([...all(), next]);
    saved.current.set(next.id, imported ? fingerprint(next) : '');
    history.switchTo(next);
  }
  function remove(id: string) {
    const remaining = all().filter(d => d.id !== id);
    if (!remaining.length) { const next = createDiagram(); remaining.push(next); saved.current.set(next.id, fingerprint(next)); }
    setDocuments(remaining);
    if (history.ref.current.id === id) history.switchTo(remaining[0]);
    saved.current.delete(id);
  }
  function getProject(): ProjectFile | null {
    return project ? { ...project, diagrams: all().map(cleanDiagram), activeDiagramId: history.ref.current.id } : null;
  }
  function markDiagramSaved(d: Diagram) { saved.current.set(d.id, fingerprint(d)); history.markSaved(d); }
  function markProjectSaved() {
    const p = getProject();
    if (p) { setProjectSaved(projectFingerprint(p)); p.diagrams.forEach(d => saved.current.set(d.id, fingerprint(d))); history.markSaved(history.ref.current); }
  }
  function loadProject(p: ProjectFile) {
    history.resetSessions();
    const next = p.diagrams.length ? p.diagrams : [createDiagram()];
    setDocuments(next);
    setProject({ id: p.id, name: p.name, description: p.description });
    saved.current = new Map(next.map(d => [d.id, fingerprint(d)]));
    setProjectSaved(projectFingerprint({ ...p, diagrams: next }));
    history.load(next.find(d => d.id === p.activeDiagramId) ?? next[0]);
  }
  function createProject(p: Project, keepDiagrams: boolean) {
    if (!keepDiagrams) {
      const next = createDiagram();
      history.resetSessions(); history.load(next);
      setDocuments([next]); saved.current = new Map([[next.id, fingerprint(next)]]);
    }
    setProject(p); setProjectSaved('');
  }
  const dirtyDiagram = (id: string) => {
    const d = docs.find(d => d.id === id);
    return !!d && fingerprint(d) !== saved.current.get(id);
  };
  const dirty = project ? projectFingerprint({ ...project, diagrams: docs }) !== projectSaved : docs.some(d => dirtyDiagram(d.id));
  return { docs, project, setProject, activate, add, remove, createProject, getProject, loadProject, markProjectSaved, markDiagramSaved, dirtyDiagram, dirty };
}
