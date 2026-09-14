import { typeLabel } from "../config/nodeTypes";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Diagram, DiagramNode } from "../model/diagram";
import { productIconUri, productIconNeedsBackdrop } from "../config/productIcons";
import { Icon } from "../components/ui/Icon";
import {
  absolutePosition,
  dashPattern,
  diagramBounds,
  edgeGeometry,
  nodeLayout,
  sortParentsFirst,
  textWidth,
} from "../utils/geometry";
import { isContainer } from "../model/diagram";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export const safeFilename = (name: string) =>
  name
    .trim()
    .replace(/[/\\?%*:|"<>\x00-\x1f]/g, "-")
    .replace(/\.+$/, "")
    .slice(0, 120) || "diagram";
const escape = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
const svgText = (
  s: string,
  x: number,
  y: number,
  size = 14,
  color = "#25272b",
  anchor = "start",
  weight = 500,
) =>
  `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${escape(s)}</text>`;
const icon = (
  name: string,
  x: number,
  y: number,
  size: number,
  color: string,
) =>
  name.startsWith('data:image/') ? `${productIconNeedsBackdrop(name) ? `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="3" fill="#fff"/>` : ""}<image x="${x}" y="${y}" width="${size}" height="${size}" href="${escape(name)}" xlink:href="${escape(name)}"/>` : `<g transform="translate(${x} ${y})" color="${color}">${renderToStaticMarkup(createElement(Icon, { name, size }))}</g>`;
export function buildSvg(
  d: Diagram,
  dark = false,
  transparent = true,
): { svg: string; width: number; height: number } {
  const fontSize = d.settings.fontSize ?? 14, scale = fontSize / 14;
  const text = (s: string, x: number, y: number, size = 14, color = "#25272b", anchor = "start", weight = 500) => svgText(s, x, y, size * scale, color, anchor, weight);
  const b = diagramBounds(d.nodes, d.edges, fontSize),
    bg = dark ? "#0d0f11" : "#f7f7f6",
    surface = dark ? "#1b1e21" : "#ffffff",
    border = dark ? "#3d4249" : "#d9dad8",
    ink = dark ? "#eff0f2" : "#25272b",
    muted = dark ? "#a5aab3" : "#818b9a";
  const groupXml = (n: DiagramNode) => {
    const at = absolutePosition(n, d.nodes),
      s = nodeLayout(n, fontSize), stroke = n.data.borderColor ?? n.data.color;
    if (n.data.kind === "lane") return `<g transform="translate(${at.x} ${at.y})"><rect width="${s.width}" height="${s.height}" fill="${n.data.color}" fill-opacity=".035" stroke="${stroke}"/><path d="M40 0V${s.height}" stroke="${stroke}"/><g transform="translate(25 ${s.height / 2}) rotate(-90)">${text(n.data.label, 0, 0, 12, muted, "middle")}</g></g>`;
    return `<g transform="translate(${at.x} ${at.y})"><rect x="0" y="0" width="${s.width}" height="${s.height}" rx="12" fill="${n.data.color}" fill-opacity=".035" stroke="${stroke}" stroke-opacity="${n.data.borderColor ? 1 : .5}" stroke-dasharray="6 5"/><path d="M0 39H${s.width}" stroke="${stroke}" stroke-opacity=".15"/>${icon(n.data.customIcon || productIconUri(n.data) || n.data.icon, 14, 11, 17, n.data.color)}${text(n.data.label, 39, 25, 12, muted)}</g>`;
  };
  const nodeXml = (n: DiagramNode, index: number) => {
    const at = absolutePosition(n, d.nodes),
      s = nodeLayout(n, fontSize),
      c = n.data.color,
      nodeBorder = n.data.borderColor ?? border,
      clip = "clip-" + index;
    let body = "";
    if (n.data.kind === "table") {
      body = `<rect width="${s.width}" height="${s.height}" rx="12" fill="${surface}" stroke="${nodeBorder}"/><path d="M0 ${48 * scale}H${s.width}" stroke="${nodeBorder}"/>${icon('database', 14, 24 * scale - 8, 17, c)}${text(n.data.label, 40, 29 * scale, 14, ink)}`;
      (n.data.fields ?? []).forEach((f, i) => {
        const y = (48 + i * 32) * scale;
        body += `<path d="M0 ${y + 32 * scale}H${s.width}" stroke="${nodeBorder}" stroke-opacity=".5"/>${text(f.primaryKey ? 'PK' : f.foreignKey ? 'FK' : '·', 13, y + 21 * scale, 11, f.primaryKey ? '#b18c3e' : c)}${text(f.name + (!f.nullable ? ' *' : '') + (f.primaryKey && f.foreignKey ? ' FK' : ''), 42, y + 21 * scale, 13, ink)}${text(f.dataType, s.width - 14, y + 21 * scale, 12, muted, 'end', 400)}`;
      });
    } else if (n.data.displayMode === "icon" && !s.event && !s.gateway) {
      const iconSize = Math.max(20, Math.min(s.width, s.height) - 16);
      body = (n.data.borderColor ? `<rect width="${s.width}" height="${s.height}" rx="8" fill="none" stroke="${nodeBorder}"/>` : "") + icon(n.data.customIcon || productIconUri(n.data) || n.data.icon, (s.width - iconSize) / 2, (s.height - iconSize) / 2, iconSize, c);
      s.labelLines.forEach((line, i) => body += text(line, s.width / 2, s.height + 4 + (11 + i * 14) * scale, 11, ink, "middle"));
    } else if (s.gateway) {
      body = `<polygon points="32,1 63,32 32,63 1,32" fill="${surface}" stroke="${nodeBorder}" stroke-width="1.5" stroke-linejoin="round"/>`;
      body += svgText(n.data.subtype === "and" ? "+" : n.data.subtype === "or" ? "○" : "×", 32, 40, 26, c, "middle");
      s.labelLines.forEach((line, i) => body += text(line, 32, 72 + (14 + i * 20) * scale, 14, ink, "middle"));
    } else if (s.event) {
      body = `<rect width="${s.width}" height="${s.height}" rx="22" fill="${surface}" stroke="${nodeBorder}"/><rect x="12" y="${(s.height - 26) / 2}" width="26" height="26" rx="8" fill="${c}" fill-opacity=".10"/>`;
      body += icon(n.data.icon, 18, (s.height - 14) / 2, 14, c);
      s.labelLines.forEach((line, i) => body += text(line, 48, s.height / 2 + (5 + (i - (s.labelLines.length - 1) / 2) * 20) * scale, 14, ink));
    } else {
      const rowHeight = s.height - (n.data.kind === "ai-agent" ? 37 * scale : 0);
      body = `<defs><clipPath id="${clip}"><rect x="1" y="1" width="${s.width - 2}" height="${s.height - 2}" rx="9"/></clipPath></defs><rect width="${s.width}" height="${s.height}" rx="12" fill="${surface}" stroke="${nodeBorder}"/><g clip-path="url(#${clip})"><rect x="14" y="${Math.max(12, (rowHeight - 32) / 2)}" width="32" height="32" rx="8" fill="${c}" fill-opacity=".10"/>${icon(n.data.customIcon || productIconUri(n.data) || n.data.icon, 21, Math.max(12, (rowHeight - 32) / 2) + 7, 18, c)}`;
      s.labelLines.forEach(
        (l, i) => (body += text(l, 57, 13 + (15 + i * 20) * scale, 14, ink)),
      );
      if (!s.descriptionLines.length) body += text(typeLabel(n.data.kind, n.data.subtype), 57, 13 + (12 + s.labelLines.length * 20) * scale, 11, muted);
      s.descriptionLines.forEach(
        (l, i) =>
          (body += text(
            l,
            57,
            18 + (12 + s.labelLines.length * 20 + i * 17) * scale,
            12,
            muted,
            "start",
            400,
          )),
      );
      if (n.data.kind === "ai-agent") {
        const y = s.height - 37 * scale;
        body += `<path d="M0 ${y}H${s.width}" stroke="${nodeBorder}"/>`;
        let x = 14;
        const chips = [
          String(n.data.properties.model ?? "Model"),
          ...(n.data.properties.memory ? ["Memory"] : []),
          ...(n.data.properties.tools ? ["Tools"] : []),
        ];
        chips.forEach((chip, i) => {
          const w = textWidth(chip, 11 * scale, 400) + 14;
          if (i)
            body += `<path d="M${x - 5} ${y + 12}V${y + 25}" stroke="${nodeBorder}"/>`;
          body += text(chip, x, y + 23 * scale, 11, muted, "start", 400);
          x += w;
        });
      }
      body += "</g>";
    }
    return `<g transform="translate(${at.x} ${at.y})">${body}</g>`;
  };
  const edges = d.edges
    .map((e, i) => {
      const g = edgeGeometry(e, d.nodes, fontSize);
      if (!g) return "";
      const c =
          e.data?.color ?? (e.data?.semantic === "exception"
            ? "#c46666"
            : dark
              ? "#8995a6"
              : "#929eae"),
        dash = dashPattern(e.data?.semantic ?? "control", e.data?.lineStyle),
        label = [e.label, e.data?.properties.cardinality].filter(Boolean).join(" · "),
        w = textWidth(label, 12 * scale, 400) + 16;
      return `<defs><marker id="arrow-${i}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M1 1L9 5L1 9Z" fill="${c}"/></marker></defs><path d="${g[0]}" fill="none" stroke="${c}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ""} ${e.data?.arrowDirection === "reverse" || e.data?.arrowDirection === "both" ? `marker-start="url(#arrow-${i})"` : ""} ${e.data?.arrowDirection !== "reverse" ? `marker-end="url(#arrow-${i})"` : ""}/>${label ? `<rect x="${g[1] - w / 2}" y="${g[2] - 12 * scale}" width="${w}" height="${24 * scale}" rx="5" fill="${surface}" stroke="${border}"/>${text(label, g[1], g[2] + 4 * scale, 12, muted, "middle", 400)}` : ""}`;
    })
    .join("");
  const ordered = sortParentsFirst(d.nodes);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${Math.ceil(b.width)}" height="${Math.ceil(b.height)}" viewBox="${b.x} ${b.y} ${b.width} ${b.height}"><title>${escape(d.name)}</title><desc>${escape(d.description)}</desc>${transparent ? "" : `<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="${bg}"/>`}${ordered.filter(isContainer).map(groupXml).join("")}${edges}${ordered
    .filter((n) => !isContainer(n))
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
    .map(nodeXml)
    .join("")}</svg>`;
  return { svg, width: Math.ceil(b.width), height: Math.ceil(b.height) };
}
export async function exportDiagram(
  d: Diagram,
  format: "svg" | "png",
  dark = false,
  transparent = true,
) {
  const { svg, width, height } = buildSvg(d, dark, transparent),
    blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  if (format === "svg") {
    downloadBlob(blob, safeFilename(d.name) + ".svg");
    return;
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
        reject(
          new Error(
            "Could not render this diagram as an image. Try SVG export.",
          ),
        );
      img.src = url;
    });
    const scale = Math.min(
      2,
      16384 / Math.max(width, height),
      Math.sqrt(32_000_000 / (width * height)),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("Your browser could not create a PNG. Use SVG export.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b
            ? resolve(b)
            : reject(
                new Error(
                  "PNG export failed. Try SVG for very large diagrams.",
                ),
              ),
        "image/png",
      ),
    );
    downloadBlob(png, safeFilename(d.name) + ".png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
