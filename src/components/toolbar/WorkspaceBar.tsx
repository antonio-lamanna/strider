import type { Diagram } from '../../model/diagram';
import type { Project } from '../../model/project';
import { modules } from '../../config/modules';
import { Icon, Plus, X, Save, FolderOpen } from '../ui/Icon';
interface Props {
  docs: Diagram[]; active: string; project: Project | null; dirty: boolean;
  dirtyDiagram: (id: string) => boolean;
  onSelect: (id: string) => void; onRemove: (id: string) => void;
  onNew: () => void; onProject: () => void; onSaveProject: () => void;
}
export function WorkspaceBar(p: Props) {
  return <div className="workspace-bar">
    <div className="project-strip">
      <button className="text-button project-title" onClick={p.onProject} title={p.project ? 'Project settings' : 'Create a project from these diagrams'}>
        <FolderOpen size={16}/><strong>{p.project?.name || 'Standalone diagrams'}</strong><span>{p.project ? `${p.docs.length} diagrams` : 'Create project'}</span>
      </button>
      {p.project && <button className="text-button" onClick={p.onSaveProject}><Save size={15}/>Save project XML{p.dirty && <span className="tab-dirty"/>}</button>}
    </div>
    <div className="diagram-tabs" role="tablist" aria-label="Open diagrams">
      {p.docs.map(d => <div className={`diagram-tab ${d.id === p.active ? 'active' : ''}`} key={d.id}>
        <button role="tab" aria-selected={d.id === p.active} onClick={() => p.onSelect(d.id)} title={`${modules.find(m => m.kind === d.kind)?.name}: ${d.name}`}>
          <Icon name={modules.find(m => m.kind === d.kind)?.icon ?? 'workflow'} size={15}/><span>{d.name}</span>{p.dirtyDiagram(d.id) && <i className="tab-dirty"/>}
        </button>
        <button className="close-tab" onClick={() => p.onRemove(d.id)} aria-label={`${p.project ? 'Remove' : 'Close'} ${d.name}`} title={p.project ? 'Remove diagram from project' : 'Close diagram'}><X size={13}/></button>
      </div>)}
      <button className="icon-button new-tab" onClick={p.onNew} title="Add diagram" aria-label="Add diagram"><Plus size={17}/></button>
    </div>
  </div>;
}
