'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';

export type TriggerType = 'External' | 'Scheduled' | 'WorkerStatus';

export interface TriggerNodeData {
  label: string;
  triggerType?: TriggerType;
}

export function TriggerNode({
  data,
  isConnectable,
}: NodeProps<TriggerNodeData>) {
  return (
    <div className="relative h-[40px] w-[100px]">
      <div
        className={cn(
          'h-full w-full',
          'rounded-full border-2 border-green-600 bg-green-50 px-3 py-1',
          'flex items-center justify-center shadow-md',
          'transition-shadow duration-200 hover:shadow-lg'
        )}
      >
        <div className="whitespace-nowrap text-xs text-green-700">
          {data.label || 'New trigger'}
        </div>

        {/* Input handle */}
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={isConnectable}
          className="h-2 w-2 bg-green-500"
        />

        {/* Output handle */}
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          className="h-2 w-2 bg-green-500"
        />
      </div>
    </div>
  );
}
