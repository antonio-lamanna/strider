import { flatProductIcons } from "./flatProductIcons";
import type { SimpleIcon } from "simple-icons";
import power_bi from "../assets/products/power-bi.svg?raw";
import microsoft_fabric from "../assets/products/microsoft-fabric.svg?raw";
import type { IconMode, NodeTemplate } from "../model/diagram";
import { systemPresets, type SystemPreset } from "./systemPresets";
import { siSap, siAppian, siUipath, siAnthropic, siSnowflake, siDatabricks, siDocker, siKubernetes, siGithub, siJira, siConfluence, siGmail, siGoogledrive, siGooglesheets, siGooglecloud, siPostgresql } from "simple-icons";
import power_apps from "../assets/products/power-apps.svg?raw";
import power_automate from "../assets/products/power-automate.svg?raw";
import dataverse from "../assets/products/dataverse.svg?raw";
import power_platform from "../assets/products/power-platform.svg?raw";
import copilot_studio from "../assets/products/copilot-studio.svg?raw";
import power_pages from "../assets/products/power-pages.svg?raw";
import dynamics_365 from "../assets/products/dynamics-365.svg?raw";
import azure_functions from "../assets/products/azure-functions.svg?raw";
import azure_app_service from "../assets/products/azure-app-service.svg?raw";
import azure_sql_database from "../assets/products/azure-sql-database.svg?raw";
import azure_data_factory from "../assets/products/azure-data-factory.svg?raw";
import azure_synapse_analytics from "../assets/products/azure-synapse-analytics.svg?raw";
import azure_kubernetes_service from "../assets/products/azure-kubernetes-service.svg?raw";
import azure_virtual_machines from "../assets/products/azure-virtual-machines.svg?raw";
import azure_service_bus from "../assets/products/azure-service-bus.svg?raw";
import azure_event_hubs from "../assets/products/azure-event-hubs.svg?raw";
import azure_key_vault from "../assets/products/azure-key-vault.svg?raw";
import azure_api_management from "../assets/products/azure-api-management.svg?raw";
import azure_cosmos_db from "../assets/products/azure-cosmos-db.svg?raw";

export interface ProductIcon extends SystemPreset {
  aliases: string[];
  source: string;
  svg?: string;
  guidelines?: string;
  license?: SimpleIcon["license"];
}
const simple: Record<string, SimpleIcon> = {"sap":siSap,"appian":siAppian,"uipath":siUipath,"anthropic":siAnthropic,"snowflake":siSnowflake,"databricks":siDatabricks,"docker":siDocker,"kubernetes":siKubernetes,"github":siGithub,"jira":siJira,"confluence":siConfluence,"gmail":siGmail,"google-drive":siGoogledrive,"google-sheets":siGooglesheets,"google-cloud":siGooglecloud,"postgresql":siPostgresql};
const microsoft: Record<string, {svg: string; source: string}> = {
  "power-bi": {svg: power_bi, source: "https://learn.microsoft.com/en-us/fabric/fundamentals/icons"},
  "microsoft-fabric": {svg: microsoft_fabric, source: "https://learn.microsoft.com/en-us/fabric/fundamentals/icons"},
  "power-apps": {svg: power_apps, source: "https://learn.microsoft.com/en-us/power-platform/guidance/icons"},
  "power-automate": {svg: power_automate, source: "https://learn.microsoft.com/en-us/power-platform/guidance/icons"},
  "dataverse": {svg: dataverse, source: "https://learn.microsoft.com/en-us/power-platform/guidance/icons"},
  "power-platform": {svg: power_platform, source: "https://learn.microsoft.com/en-us/power-platform/guidance/icons"},
  "copilot-studio": {svg: copilot_studio, source: "https://learn.microsoft.com/en-us/power-platform/guidance/icons"},
  "power-pages": {svg: power_pages, source: "https://learn.microsoft.com/en-us/power-platform/guidance/icons"},
  "dynamics-365": {svg: dynamics_365, source: "https://learn.microsoft.com/en-us/dynamics365/get-started/icons"},
  "azure-functions": {svg: azure_functions, source: "https://learn.microsoft.com/en-us/azure/architecture/icons/"},
  "azure-app-service": {svg: azure_app_service, source: "https://learn.microsoft.com/en-us/azure/architecture/icons/"},
  "azure-sql-database": {svg: azure_sql_database, source: "https://learn.microsoft.com/en-us/azure/architecture/icons/"},
  "azure-data-factory": {svg: azure_data_factory, source: "https://learn.microsoft.com/en-us/azure/architecture/icons/"},
  "azure-synapse-analytics": {svg: azure_synapse_analytics, source: "https://learn.microsoft.com/en-us/azure/architecture/icons/"},
  "azure-kubernetes-service": {svg: azure_kubernetes_service, source: "https://learn.microsoft.com/en-us/azure/architecture/icons/"},
  "azure-virtual-machines": {svg: azure_virtual_machines, source: "https://learn.microsoft.com/en-us/azure/architecture/icons/"},
  "azure-service-bus": {svg: azure_service_bus, source: "https://learn.microsoft.com/en-us/azure/architecture/icons/"},
  "azure-event-hubs": {svg: azure_event_hubs, source: "https://learn.microsoft.com/en-us/azure/architecture/icons/"},
  "azure-key-vault": {svg: azure_key_vault, source: "https://learn.microsoft.com/en-us/azure/architecture/icons/"},
  "azure-api-management": {svg: azure_api_management, source: "https://learn.microsoft.com/en-us/azure/architecture/icons/"},
  "azure-cosmos-db": {svg: azure_cosmos_db, source: "https://learn.microsoft.com/en-us/azure/architecture/icons/"},
};
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
  const si = simple[p.id], ms = microsoft[p.id], flat = flatProductIcons[p.id];
  const aliases = [p.id.replaceAll("-", " "), category(p), p.category];
  if (/^azure|^power-|copilot|dataverse|teams|outlook|sharepoint|dynamics/.test(p.id)) aliases.push("microsoft", "ms");
  if (p.category === "GCP" || p.category === "Google") aliases.push("google", "gcp");
  if (p.id === "openai") aliases.push("chatgpt", "chat gpt", "gpt");
  if (/appian|uipath|automation-anywhere|blue-prism|power-automate/.test(p.id)) aliases.push("automation", "rpa", "low code");
  if (p.id === "power-bi") aliases.push("powerbi", "business intelligence", "analytics");
  if (p.id === "power-apps") aliases.push("powerapps", "low code");
  return { ...p, category: category(p), aliases, source: flat?.source ?? ms?.source ?? si?.source ?? "Standard fallback",
    svg: flat?.svg ?? ms?.svg ?? (si ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#${si.hex}"><path d="${si.path}"/></svg>` : undefined),
    guidelines: si?.guidelines, license: si?.license };
});
const byId = new Map(productIcons.map(p => [p.id, p]));
export const findProduct = (id?: string) => id ? byId.get(id) : undefined;
export const productSearchTerms = (id?: string) => findProduct(id)?.aliases.join(" ") ?? "";
export const supportsProductIcon = (data: Pick<NodeTemplate, "kind">) => !["table", "start", "end", "event", "timer", "gateway", "lane", "group", "system-boundary", "team-boundary"].includes(data.kind);
const uris = new Map(productIcons.filter(p => p.svg).map(p => [p.id, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(p.svg!)}`]));
const darkArtwork = new Set(["anthropic", "github", "confluence"].map(id => uris.get(id)));
export const productIconNeedsBackdrop = (uri?: string) => !!uri && darkArtwork.has(uri);
export const productIconUri = (data: Pick<NodeTemplate, "iconMode" | "system">) => data.iconMode === "product" && data.system ? uris.get(data.system) : undefined;
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
