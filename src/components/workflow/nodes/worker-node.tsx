'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';

export interface WorkerData {
  label: string;
  code?: string;
  scope?: string;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    displayName: string;
  }>;
  description?: string;
  displayName?: string;
  ownerTaskDefinition?: {
    code: string;
    scope: string;
  };
  // Add task ID to track parent-child relationship
  taskId?: string;
}

export const WorkerNode = React.forwardRef<
  HTMLDivElement,
  NodeProps<WorkerData>
>((props, ref) => {
  const { data, isConnectable, selected } = props;

  return (
    <div
      ref={ref}
      data-parent={data.taskId} // Add this to track the parent task
      className={cn(
        'rounded-lg border-2 border-purple-500 bg-purple-50 shadow-md',
        'transition-shadow duration-200 hover:shadow-xl',
        selected && 'ring-2 ring-purple-500 ring-offset-2'
      )}
      style={{
        width: '150px',
        height: '150px',
        position: 'relative',
      }}
    >
      {/* Worker label - full width bar at top */}
      <div className="absolute left-0 top-0 w-full rounded-t-md bg-purple-500 px-2 py-1 text-xs font-medium text-white">
        {data.label}
      </div>

      {/* No content in the body */}

      {/* Top handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        isConnectable={isConnectable}
        className="h-3 w-3 bg-purple-500"
      />

      {/* Right handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectable={isConnectable}
        className="h-3 w-3 bg-purple-500"
      />

      {/* Bottom handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectable={isConnectable}
        className="h-3 w-3 bg-purple-500"
      />

      {/* Left handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        isConnectable={isConnectable}
        className="h-3 w-3 bg-purple-500"
      />
    </div>
  );
});
WorkerNode.displayName = 'WorkerNode';
