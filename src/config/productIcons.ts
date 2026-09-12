import { brandArtwork } from "./brandArtwork";
import { flatProductIcons } from "./flatProductIcons";
import type { SimpleIcon } from "simple-icons";
import type { IconMode, NodeTemplate } from "../model/diagram";
import { systemPresets, type SystemPreset } from "./systemPresets";

export interface ProductIcon extends SystemPreset {
  aliases: string[];
  source: string;
  svg?: string;
  guidelines?: string;
  license?: SimpleIcon["license"];
}
const simple = brandArtwork;
const extra: SystemPreset[] = [
{"id": "gmail", "name": "Gmail", "icon": "mail", "category": "Google", "accentColor": "#6385a5"},
{"id": "google-drive", "name": "Google Drive", "icon": "files", "category": "Google", "accentColor": "#6385a5"},
{"id": "google-sheets", "name": "Google Sheets", "icon": "database", "category": "Google", "accentColor": "#6385a5"},
{"id": "dynamics-365", "name": "Dynamics 365", "icon": "briefcase", "category": "Microsoft", "accentColor": "#6385a5"},
{"id": "power-pages", "name": "Power Pages", "icon": "globe", "category": "Microsoft", "accentColor": "#6385a5"},
{"id": "automation-anywhere", "name": "Automation Anywhere", "icon": "bot", "category": "Automation", "accentColor": "#6385a5"},
{"id": "blue-prism", "name": "Blue Prism", "icon": "bot", "category": "Automation", "accentColor": "#6385a5"},
{"id": "oracle", "name": "Oracle", "icon": "database", "category": "Enterprise", "accentColor": "#6385a5"},
{"id": "workday", "name": "Workday", "icon": "briefcase", "category": "Enterprise", "accentColor": "#6385a5"},
{"id": "snowflake", "name": "Snowflake", "icon": "database", "category": "Data", "accentColor": "#6385a5"},
{"id": "databricks", "name": "Databricks", "icon": "layers", "category": "Data", "accentColor": "#6385a5"},
{"id": "docker", "name": "Docker", "icon": "box", "category": "Cloud", "accentColor": "#6385a5"},
{"id": "kubernetes", "name": "Kubernetes", "icon": "network", "category": "Cloud", "accentColor": "#6385a5"},
{"id": "mulesoft", "name": "MuleSoft", "icon": "workflow", "category": "Integration", "accentColor": "#6385a5"},
{"id": "github", "name": "GitHub", "icon": "code", "category": "Collaboration", "accentColor": "#6385a5"},
{"id": "confluence", "name": "Confluence", "icon": "files", "category": "Collaboration", "accentColor": "#6385a5"},
 ];
/** Reuses existing stable system IDs; presentation never changes their identity. */
export const productPresets = [...systemPresets, ...extra];
function category(p: SystemPreset) {
  if (/Microsoft|Azure/.test(p.category) || /power-|dataverse|copilot|microsoft|azure/.test(p.id)) return "Microsoft";
  if (p.category === "GCP" || p.category === "Google") return "Google";
  if (["AWS", "Cloud"].includes(p.category)) return "Cloud & infrastructure";
  if (["Data", "Analytics"].includes(p.category)) return "Data & analytics";
  if (["Integration", "Collaboration"].includes(p.category)) return "Integration & collaboration";
  return p.category;
}
export const productIcons: ProductIcon[] = productPresets.map(p => {
  const si = simple[p.id], flat = flatProductIcons[p.id];
  const aliases = [p.id.replaceAll("-", " "), category(p), p.category];
  if (/^azure|^power-|copilot|dataverse|teams|outlook|sharepoint|dynamics/.test(p.id)) aliases.push("microsoft", "ms");
  if (p.category === "GCP" || p.category === "Google") aliases.push("google", "gcp");
  if (p.id === "openai") aliases.push("chatgpt", "chat gpt", "gpt");
  if (/appian|uipath|automation-anywhere|blue-prism|power-automate/.test(p.id)) aliases.push("automation", "rpa", "low code");
  if (p.id === "power-bi") aliases.push("powerbi", "business intelligence", "analytics");
  if (p.id === "power-apps") aliases.push("powerapps", "low code");
  return { ...p, category: category(p), aliases, source: flat?.source ?? si?.source ?? "Standard fallback",
    svg: flat?.svg ?? (si ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#${si.hex}"><path d="${si.path}"/></svg>` : undefined),
    guidelines: si?.guidelines, license: si?.license };
});
const byId = new Map(productIcons.map(p => [p.id, p]));
export const findProduct = (id?: string) => id ? byId.get(id) : undefined;
export const productSearchTerms = (id?: string) => findProduct(id)?.aliases.join(" ") ?? "";
export const supportsProductIcon = (data: Pick<NodeTemplate, "kind">) => !["table", "start", "end", "event", "timer", "gateway", "lane", "group", "system-boundary", "team-boundary"].includes(data.kind);
const uris = new Map(productIcons.filter(p => p.svg).map(p => [p.id, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(p.svg!)}`]));
const darkArtwork = new Set(["anthropic", "github", "confluence"].map(id => uris.get(id)));
export const productIconNeedsBackdrop = (uri?: string) => !!uri && darkArtwork.has(uri);
export const productIconUri = (data: Pick<NodeTemplate, "iconMode" | "system" | "productIcon">) => data.iconMode === "product" ? data.productIcon || (data.system ? uris.get(data.system) : undefined) : undefined;
export function newNodeIconMode(template: NodeTemplate, preference: IconMode): NodeTemplate {
  return supportsProductIcon(template) ? { ...template, iconMode: template.iconMode ?? preference } : template;
}
export function loadIconMode(): IconMode {
  try { return localStorage.getItem("strider-icon-mode") === "product" ? "product" : "standard"; } catch { return "standard"; }
}
export function saveIconMode(mode: IconMode) {
  try { localStorage.setItem("strider-icon-mode", mode); } catch { /* Optional preference, same policy as theme. */ }
}
export const productCategories = Array.from(new Set(productIcons.map(p => p.category))).map(name => ({
  name, items: productIcons.filter(p => p.category === name).map(p => ({ kind: "application", label: p.name, system: p.id, icon: p.icon, color: p.accentColor } as NodeTemplate)),
}));
