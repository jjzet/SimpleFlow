'use client';

import React from 'react';
import { EdgeProps, getSmoothStepPath, useReactFlow, Edge } from 'reactflow';
import { Bell } from 'lucide-react';
import { EventHandlerEdgeData } from '@/types/workflow';
import { useWorkflow } from '@/contexts/workflow-context';

export function EventHandlerEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
}: EdgeProps<EventHandlerEdgeData>) {
  const { setSelectedEdge } = useWorkflow();
  const reactFlowInstance = useReactFlow();

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleEdgeClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    // Find the edge in the current edges
    const edges = reactFlowInstance.getEdges();
    const edge = edges.find((e) => e.id === id) || null;
    setSelectedEdge(edge);
  };

  // Edge color
  const edgeColor = style.stroke || '#3b82f6'; // Default to blue-500

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: edgeColor,
        }}
        markerEnd="url(#event-handler-arrow)"
        onClick={handleEdgeClick}
      />
      <path
        d={edgePath}
        fill="none"
        strokeWidth={12}
        stroke="transparent"
        onClick={handleEdgeClick}
        strokeLinecap="round"
        className="cursor-pointer"
      />

      {/* Event Handler Indicator */}
      <foreignObject
        width={24}
        height={24}
        x={labelX - 12}
        y={labelY - 12}
        className="overflow-visible"
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <div className="relative flex items-center justify-center">
          <div className="z-10 rounded-full border border-blue-500 bg-blue-100 p-1">
            <Bell className="h-3 w-3 text-blue-500" />
          </div>
        </div>
      </foreignObject>

      {/* Arrow Marker Definition */}
      <defs>
        <marker
          id="event-handler-arrow"
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
