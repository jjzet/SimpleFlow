'use client';

import React from 'react';
import { EdgeProps, getSmoothStepPath } from 'reactflow';

export type ActionType = 'RunWorker' | 'TriggerParentTask' | 'CreateChildTasks';

export interface ActionEdgeData {
  name: string;
  actionType?: ActionType;
  workerId?: {
    scope: string;
    code: string;
  };
  workerStatusTriggers?: {
    completedWithResults?: string;
    completedNoResults?: string;
    failed?: string;
  };
  taskDefinitionId?: {
    scope: string;
    code: string;
  };
  trigger?: string;
}

export function ActionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
}: EdgeProps<ActionEdgeData>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        strokeWidth={3}
        stroke="#9333ea"
        markerEnd="url(#action-arrow)"
      />
      {data?.name && (
        <foreignObject
          width={100}
          height={24}
          x={labelX - 50}
          y={labelY - 12}
          className="overflow-visible"
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div className="flex items-center justify-center">
            <div className="whitespace-nowrap rounded-full border border-purple-500 bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              {data.name}
            </div>
          </div>
        </foreignObject>
      )}
      <defs>
        <marker
          id="action-arrow"
          markerWidth={12}
          markerHeight={8}
          refX={9}
          refY={4}
          orient="auto"
        >
          <path d="M0,0 L0,8 L12,4 z" fill="#9333ea" />
        </marker>
      </defs>
    </>
  );
}
