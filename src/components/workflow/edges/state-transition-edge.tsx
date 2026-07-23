'use client';

import React from 'react';
import { EdgeProps, getSmoothStepPath, Position } from 'reactflow';
import { Zap, Shield } from 'lucide-react';

export interface StateTransitionEdgeData {
  sourceState: string;
  targetState: string;
  trigger?: string;
  guard?: string;
}

export function StateTransitionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
}: EdgeProps<StateTransitionEdgeData>) {
  // Calculate better offset based on the source and target positions
  const getOffset = (position: Position) => {
    switch (position) {
      case Position.Top:
        return { x: 0, y: -3 };
      case Position.Right:
        return { x: 3, y: 0 };
      case Position.Bottom:
        return { x: 0, y: 3 };
      case Position.Left:
        return { x: -3, y: 0 };
      default:
        return { x: 0, y: 0 };
    }
  };

  // Apply small offsets to improve alignment with handles
  const sourceOffset = getOffset(sourcePosition);
  const targetOffset = getOffset(targetPosition);

  // Adjust source and target coordinates to align better with handles
  const adjustedSourceX = sourceX + sourceOffset.x;
  const adjustedSourceY = sourceY + sourceOffset.y;
  const adjustedTargetX = targetX + targetOffset.x;
  const adjustedTargetY = targetY + targetOffset.y;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: adjustedSourceX,
    sourceY: adjustedSourceY,
    sourcePosition,
    targetX: adjustedTargetX,
    targetY: adjustedTargetY,
    targetPosition,
    borderRadius: 12, // Add a slight curve to the line
  });

  // Charcoal gray color for edge and arrow
  const edgeColor = '#343a40';

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        strokeWidth={1}
        stroke={edgeColor}
        markerEnd="url(#state-transition-arrow)"
        style={{
          ...style,
          pointerEvents: 'all', // Ensure the edge is clickable
        }}
      />

      {/* Trigger and Guard Indicators */}
      <foreignObject
        width={80}
        height={24}
        x={labelX - 40}
        y={labelY - 12}
        className="overflow-visible"
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <div className="relative flex items-center justify-center">
          <div className="flex gap-0 transition-all duration-200 hover:gap-2">
            {data?.trigger && (
              <div
                className="z-10 rounded-full border border-green-500 bg-green-100 p-1"
                title={`Trigger: ${data.trigger}`}
              >
                <Zap className="h-3 w-3 text-green-500" />
              </div>
            )}
            {data?.guard && (
              <div
                className="-ml-2 rounded-full border border-red-500 bg-red-100 p-1 transition-all duration-200 hover:ml-0"
                title={`Guard: ${data.guard}`}
              >
                <Shield className="h-3 w-3 text-red-500" />
              </div>
            )}
          </div>
        </div>
      </foreignObject>

      {/* Arrow Marker Definition */}
      <defs>
        <marker
          id="state-transition-arrow"
          markerWidth={12}
          markerHeight={8}
          refX={10}
          refY={4}
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,8 L12,4 z" fill={edgeColor} />
        </marker>
      </defs>
    </>
  );
}
