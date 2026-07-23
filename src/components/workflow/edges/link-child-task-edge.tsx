import React from 'react';
import { Edge, EdgeProps, getSmoothStepPath } from 'reactflow';
import { GitBranch } from 'lucide-react';

export interface LinkChildTaskEdgeData {
  workerId: string;
  childTaskId: string;
}

export function LinkChildTaskEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
}: EdgeProps<LinkChildTaskEdgeData>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={{
          strokeWidth: 2,
          stroke: '#3b82f6',
        }}
        markerEnd="url(#link-child-task-arrow)"
      />

      {/* Branch Icon */}
      {labelX && labelY && (
        <foreignObject
          width={24}
          height={24}
          x={labelX - 12}
          y={labelY - 12}
          className="overflow-visible"
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div className="flex items-center justify-center">
            <div className="rounded-full border border-blue-500 bg-blue-100 p-1">
              <GitBranch className="h-3 w-3 text-blue-500" />
            </div>
          </div>
        </foreignObject>
      )}

      {/* Arrow Marker Definition */}
      <defs>
        <marker
          id="link-child-task-arrow"
          markerWidth={12}
          markerHeight={8}
          refX={9}
          refY={4}
          orient="auto"
        >
          <path d="M0,0 L0,8 L12,4 z" fill="#3b82f6" />
        </marker>
      </defs>
    </>
  );
}
