"use client";

import { BaseEdge, getSmoothStepPath, type ConnectionLineComponentProps, type EdgeProps } from "@xyflow/react";

function EdgeArrow({ id }: { id: string }) {
  return (
    <marker
      id={id}
      markerWidth="8"
      markerHeight="14.4"
      viewBox="-7.2 -7.2 8 14.4"
      markerUnits="userSpaceOnUse"
      orient="auto"
      refX="0"
      refY="0"
      overflow="visible"
    >
      <polyline
        points="-6.36,-6.36 0,0 -6.36,6.36"
        fill="none"
        stroke="context-stroke"
        strokeWidth="1"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
    </marker>
  );
}

export function WorkflowEdge({
  id,
  type,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });
  const markerId = `workflow-arrow-${id}`;

  return (
    <>
      <defs>
        <EdgeArrow id={markerId} />
      </defs>
      <BaseEdge
        path={path}
        markerEnd={`url(#${markerId})`}
        className={type === "loop" ? "workflow-edge workflow-edge-loop" : "workflow-edge"}
      />
    </>
  );
}

export function WorkflowConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
}: ConnectionLineComponentProps) {
  const [path] = getSmoothStepPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
    borderRadius: 8,
  });

  return (
    <>
      <defs>
        <EdgeArrow id="workflow-connection-arrow" />
      </defs>
      <path d={path} className="workflow-connection" markerEnd="url(#workflow-connection-arrow)" />
    </>
  );
}

export const workflowEdgeCss = `
  .react-flow .react-flow__edge-path.workflow-edge {
    stroke: var(--grey-fg-disabled, #c3bfbc);
    stroke-width: 1px;
    stroke-linecap: butt;
  }
  .react-flow .react-flow__edge:hover:not(.selected) .react-flow__edge-path.workflow-edge,
  .react-flow .react-flow__edge.selectable:focus:not(.selected) .react-flow__edge-path.workflow-edge,
  .react-flow .react-flow__edge.selectable:focus-visible:not(.selected) .react-flow__edge-path.workflow-edge {
    stroke: var(--grey-fg-tertiary, #999390);
  }
  .react-flow .react-flow__edge.selected .react-flow__edge-path.workflow-edge {
    stroke: var(--blue-fg-accent, #1f74c6);
  }
  .react-flow .react-flow__edge-loop .react-flow__edge-path.workflow-edge,
  .react-flow .react-flow__edge-path.workflow-edge-loop {
    stroke-dasharray: 2 2;
  }
  .react-flow .workflow-connection {
    stroke: var(--blue-fg-accent, #1f74c6);
    stroke-width: 1px;
    stroke-dasharray: 2 2;
    stroke-linecap: butt;
    fill: none;
  }
`;
