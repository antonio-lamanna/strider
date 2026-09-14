import { useEditorActions } from "../canvas/EditorContext";
import { useNodes } from "@xyflow/react";
import { routedGeometry } from "../../utils/routes";
import { memo } from "react";
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import type { DiagramEdge } from "../../model/diagram";
import { dashPattern } from "../../utils/geometry";
export const OrthogonalEdge = memo(function OrthogonalEdge(
  p: EdgeProps<DiagramEdge>,
) {
  const { fontSize } = useEditorActions();
  const nodes = useNodes<import("../../model/diagram").DiagramNode>();
  const [path, x, y] = routedGeometry({ ...p, sourceHandle: p.sourceHandleId, targetHandle: p.targetHandleId } as unknown as DiagramEdge, nodes, fontSize) ?? getSmoothStepPath({
    ...p,
    borderRadius: 12,
    offset: 24,
  });
  const color = p.selected
    ? "var(--focus)"
    : p.data?.color ?? (p.data?.semantic === "exception"
      ? "#c46666"
      : "var(--edge)");
  const label = [p.label, p.data?.properties.cardinality].filter(Boolean).join(" · ");
  const marker = `arrow-${p.id}`;
  return (
    <>
      <defs>
        <marker
          id={marker}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M1 1L9 5L1 9Z" fill={color} />
        </marker>
      </defs>
      <BaseEdge
        id={p.id}
        path={path}
        interactionWidth={20}
        markerStart={p.data?.arrowDirection === "reverse" || p.data?.arrowDirection === "both" ? `url(#${marker})` : undefined}
        markerEnd={p.data?.arrowDirection !== "reverse" ? `url(#${marker})` : undefined}
        style={{
          stroke: color,
          strokeWidth: p.selected ? 2 : 1.5,
          strokeDasharray: dashPattern(
            p.data?.semantic ?? "control",
            p.data?.lineStyle,
          ),
          strokeLinecap: "round",
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            className={`edge-label nodrag nopan ${p.selected ? "selected" : ""}`}
            style={{
              fontSize: 12 * fontSize / 14,
              lineHeight: `${15 * fontSize / 14}px`,
              transform: `translate(-50%, -50%) translate(${x}px,${y}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
