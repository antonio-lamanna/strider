import type { DiagramKind, NodeTemplate } from '../model/diagram';
export const modules: { kind: DiagramKind; name: string; icon: string; description: string }[] = [
  { kind: 'workflow', name: 'Workflow', icon: 'workflow', description: 'Processes, activities and automation flows' },
  { kind: 'data-model', name: 'Data Model', icon: 'database', description: 'Tables, fields, keys and relationships' },
  { kind: 'architecture', name: 'Architecture', icon: 'layers', description: 'Systems, networks and deployment boundaries' },
];
export const tableTemplate: NodeTemplate = { kind: 'table', label: 'New table', icon: 'database', color: '#5f7ec7' };
export const architectureCategories: { name: string; items: NodeTemplate[] }[] = [
 { name: 'Boundaries', items: [
  { kind: 'system-boundary', label: 'Client network', icon: 'globe', color: '#5f7ec7' },
  { kind: 'system-boundary', label: 'Supplier network', icon: 'globe', color: '#a17bc4' },
  { kind: 'group', label: 'Cloud environment', icon: 'cloud', color: '#5f8bc7' },
  { kind: 'group', label: 'On-premise', icon: 'server', color: '#6b8292' },
  { kind: 'group', label: 'Security zone', icon: 'shield', color: '#af8050' },
 ] },
 { name: 'Infrastructure', items: [
  { kind: 'application', label: 'Server', icon: 'server', color: '#6b8292' },
  { kind: 'application', label: 'Citrix', icon: 'monitor', color: '#557f9c' },
  { kind: 'resource', label: 'VPN tunnel', icon: 'lock', color: '#669789' },
  { kind: 'resource', label: 'Firewall', icon: 'shield', color: '#bc795b' },
  { kind: 'resource', label: 'Load balancer', icon: 'network', color: '#6a89ba' },
  { kind: 'resource', label: 'Internet', icon: 'globe', color: '#7491b5' },
  { kind: 'device', label: 'Workstation', icon: 'monitor', color: '#6b8292' },
  { kind: 'device', label: 'Tablet / iPad', icon: 'tablet', color: '#6b8292' },
  { kind: 'external-actor', label: 'External user', icon: 'contact', color: '#b28c50', displayMode: 'icon' },
  { kind: 'user', label: 'Internal user', displayMode: 'icon', icon: 'user', color: '#b28c50' },
  { kind: 'api-call', label: 'API gateway', icon: 'globe', color: '#6385df' },
  { kind: 'database', label: 'Database', icon: 'database', color: '#5e9a84' },
  { kind: 'application', label: 'Application', icon: 'app-window', color: '#5f7ec7' },
 ] },
];
