import type { Diagram } from './diagram';
import { fingerprint } from './diagram';
export interface Project { id: string; name: string; description: string; }
export interface ProjectFile extends Project { diagrams: Diagram[]; activeDiagramId?: string; }
export const projectFingerprint = (p: ProjectFile) => JSON.stringify({ id: p.id, name: p.name, description: p.description, diagrams: p.diagrams.map(fingerprint) });
