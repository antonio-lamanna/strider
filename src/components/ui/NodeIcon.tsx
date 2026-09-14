import type { NodeTemplate } from "../../model/diagram";
import { productIconUri, productIconNeedsBackdrop } from "../../config/productIcons";
import { Icon } from "./Icon";

/** Never consults the library preference: old nodes always retain Standard. */
export function NodeIcon({ data, size = 18 }: { data: Pick<NodeTemplate, "label" | "icon" | "system" | "iconMode" | "customIcon" | "productIcon">; size?: number }) {
  const product = !data.customIcon && productIconUri(data);
  const src = data.customIcon || product;
  return src ? <img className={product ? `product-node-icon ${productIconNeedsBackdrop(product) ? "product-icon-backdrop" : ""}` : "custom-node-icon"} src={src} width={size} height={size} alt="" draggable={false} style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }} /> : <Icon name={data.icon} size={size} />;
}
