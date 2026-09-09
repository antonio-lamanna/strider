import { memo } from "react";
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import type { DiagramEdge } from "../../model/diagram";
import { dashPattern } from "../../utils/geometry";
export const OrthogonalEdge = memo(function OrthogonalEdge(
  p: EdgeProps<DiagramEdge>,
) {
  const [path, x, y] = getSmoothStepPath({
    ...p,
    borderRadius: 12,
    offset: 24,
  });
  const color = p.selected
    ? "var(--focus)"
    : p.data?.semantic === "exception"
      ? "#c46666"
      : "var(--edge)";
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
        markerEnd={`url(#${marker})`}
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
      {p.label && (
        <EdgeLabelRenderer>
          <div
            className={`edge-label nodrag nopan ${p.selected ? "selected" : ""}`}
            style={{
              transform: `translate(-50%, -50%) translate(${x}px,${y}px)`,
            }}
          >
            {p.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
