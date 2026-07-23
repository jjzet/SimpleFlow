'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';

export interface GuardNodeData {
  label: string;
  condition?: string;
}

export function GuardNode({ data, isConnectable }: NodeProps<GuardNodeData>) {
  return (
    <div className="relative h-[40px] w-[100px]">
      {/* Main body */}
      <div
        className={cn(
          'h-full w-full',
          'rounded-full border-2 border-red-600 bg-red-50 px-3 py-1',
          'flex items-center justify-center shadow-md',
          'transition-shadow duration-200 hover:shadow-lg'
        )}
      >
        <div className="text-xs text-red-700">{data.label || 'New guard'}</div>

        {/* Input handle */}
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={isConnectable}
          className="h-2 w-2 bg-red-500"
        />

        {/* Output handle */}
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          className="h-2 w-2 bg-red-500"
        />
      </div>
    </div>
  );
}
