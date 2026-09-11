import { productIcons } from "../../config/productIcons";

export function IconCredits() {
  return <details className="icon-credits">
    <summary>Icons &amp; credits</summary>
    <p>Standard symbols: Lucide (ISC). Product artwork: selected Simple Icons and official Microsoft architecture resources. All assets are bundled locally.</p>
    <p>Product names and logos are trademarks of their respective owners. Their use identifies systems in diagrams and does not imply endorsement or affiliation with STRIDER.</p>
    <p>Microsoft icons are provided for architecture diagrams, training and documentation. Keep the product name nearby; do not crop, rotate, distort or use them as your own brand.</p>
    <p>Simple Icons is a CC0 project; individual brand rights, guidelines and licenses still apply.</p>
    <a href="/icon-licenses.txt" target="_blank" rel="noreferrer">License notices &amp; source inventory</a>
    <ul>{productIcons.filter(p => p.svg).map(p => <li key={p.id}><a href={p.guidelines ?? p.source} target="_blank" rel="noreferrer">{p.name}</a> · {p.source.includes("learn.microsoft.com") ? "Microsoft" : "Simple Icons"}</li>)}</ul>
  </details>;
}
