import { useState } from 'react';
import type { DataField } from '../../model/diagram';
import { createField, dataTypes } from '../../model/dataModel';
import { Plus, Trash2, ArrowUp, ArrowDown, ChevronDown } from '../ui/Icon';
export function FieldEditor({ fields, onChange }: { fields: DataField[]; onChange: (fields: DataField[]) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const update = (id: string, patch: Partial<DataField>) => onChange(fields.map(f => f.id === id ? { ...f, ...patch } : f));
  function move(i: number, delta: number) { const next = [...fields]; [next[i], next[i + delta]] = [next[i + delta], next[i]]; onChange(next); }
  return <section className="property-section field-editor"><h3>Fields <span>{fields.length}</span></h3>
    <datalist id="data-types">{dataTypes.map(t => <option key={t} value={t}/>)}</datalist>
    {fields.map((f, i) => <div className="field-card" key={f.id}>
      <div className="field-card-heading"><span>{i + 1}</span><input aria-label={`Field ${i + 1} name`} value={f.name} onChange={e => update(f.id, { name: e.target.value })}/><button className="icon-button danger" aria-label={`Delete field ${f.name}`} title="Delete field and its relationships" onClick={() => onChange(fields.filter(n => n.id !== f.id))}><Trash2 size={14}/></button></div>
      <input aria-label={`Data type for ${f.name}`} list="data-types" value={f.dataType} placeholder="Type or select a data type" onChange={e => update(f.id, { dataType: e.target.value })}/>
      <div className="field-flags">
        <label><input type="checkbox" checked={f.primaryKey} onChange={e => update(f.id, { primaryKey: e.target.checked, ...(e.target.checked ? { nullable: false } : {}) })}/>PK</label>
        <label><input type="checkbox" checked={f.foreignKey} onChange={e => update(f.id, { foreignKey: e.target.checked })}/>FK</label>
        <label><input type="checkbox" checked={f.nullable} disabled={f.primaryKey} onChange={e => update(f.id, { nullable: e.target.checked })}/>Null</label>
        <label><input type="checkbox" checked={f.unique} onChange={e => update(f.id, { unique: e.target.checked })}/>Unique</label>
      </div>
      <div className="field-card-actions"><button className="subtle-button" onClick={() => setExpanded(expanded === f.id ? null : f.id)}><ChevronDown size={12}/>Details</button><span/><button className="icon-button" disabled={i === 0} title="Move field up" aria-label={`Move ${f.name} up`} onClick={() => move(i, -1)}><ArrowUp size={12}/></button><button className="icon-button" disabled={i === fields.length - 1} title="Move field down" aria-label={`Move ${f.name} down`} onClick={() => move(i, 1)}><ArrowDown size={12}/></button></div>
      {expanded === f.id && <><label className="field"><span>Default value</span><input value={f.defaultValue} onChange={e => update(f.id, { defaultValue: e.target.value })}/></label><label className="field"><span>Description</span><textarea rows={2} value={f.description} onChange={e => update(f.id, { description: e.target.value })}/></label></>}
      {(!f.name.trim() || !f.dataType.trim() || fields.some(other => other.id !== f.id && other.name.toLowerCase() === f.name.toLowerCase())) && <small className="field-error">Use a unique field name and a data type.</small>}
    </div>)}
    <button className="secondary-button full-width" onClick={() => { let i = fields.length + 1; while (fields.some(f => f.name === `field_${i}`)) i++; const f = createField(`field_${i}`); onChange([...fields, f]); }}><Plus size={14}/>Add field</button>
    <p className="field-hint">Connect the right dot of a referenced key to the left dot of its foreign key. Select the relationship to set its cardinality.</p>
  </section>;
}
