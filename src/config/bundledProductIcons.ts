/** Local vendor artwork for products not represented by Simple Icons. */
const artwork = import.meta.glob<string>("../assets/products/*.svg", { query: "?raw", import: "default", eager: true });
export const bundledProductIcons = Object.fromEntries(Object.entries(artwork).map(([path, svg]) => [path.split("/").pop()!.replace(/\.svg$/, ""), svg]));
