'use client';

import React from 'react';
import { EdgeProps, getBezierPath } from 'reactflow';
import { cn } from '@/lib/utils';

export interface TransitionEdgeData {
  label?: string;
  guard?: string;
}

export function TransitionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
  markerEnd,
}: EdgeProps<TransitionEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
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
        style={style}
        className="react-flow__edge-path stroke-gray-400 stroke-2"
        d={edgePath}
        markerEnd={markerEnd}
      />

      {/* Edge Label */}
      {data?.label && (
        <text>
          <textPath
            href={`#${id}`}
            style={{ fontSize: '12px' }}
            startOffset="50%"
            textAnchor="middle"
            className={cn('fill-gray-600', data.guard && 'fill-red-500')}
          >
            {data.label}
            {data.guard && ` [${data.guard}]`}
          </textPath>
        </text>
      )}
    </>
  );
}
