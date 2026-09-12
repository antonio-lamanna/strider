export type Orientation = 'horizontal' | 'vertical';
export interface LayoutView { signature: string; nodes: { id: string; x: number; y: number; width?: number; height?: number }[] }
export interface WorkflowLayout { orientation: Orientation; horizontal?: LayoutView; vertical?: LayoutView }
export function validateWorkflowLayout(value: unknown): WorkflowLayout {
  const v=value as WorkflowLayout;
  if (!v || !['horizontal','vertical'].includes(v.orientation)) throw new Error('Invalid workflow orientation.');
  for (const key of ['horizontal','vertical'] as const) {
    const s=v[key]; if (!s) continue;
    if (typeof s.signature!=='string' || !Array.isArray(s.nodes) || s.nodes.length>5000 || s.nodes.some(n=>typeof n.id!=='string' || !Number.isFinite(n.x) || !Number.isFinite(n.y) || [n.width,n.height].some(x=>x!==undefined && (!Number.isFinite(x) || x<40 || x>20000)))) throw new Error('Invalid saved workflow layout.');
  }
  return v;
}
