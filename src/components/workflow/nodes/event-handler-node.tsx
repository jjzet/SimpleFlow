'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { Bell } from 'lucide-react';
import { EventHandlerNodeData } from '@/types/workflow';

type EventHandlerData = EventHandlerNodeData;

export const EventHandlerNode = React.forwardRef<
  HTMLDivElement,
  NodeProps<EventHandlerData>
>((props, ref) => {
  const { data, isConnectable, selected } = props;

  return (
    <div
      ref={ref}
      data-parent={
        data.ownerTaskDefinition?.scope && data.ownerTaskDefinition?.code
          ? `${data.ownerTaskDefinition.scope}:${data.ownerTaskDefinition.code}`
          : undefined
      }
      className={cn(
        'rounded-lg border-2 border-blue-500 bg-blue-50 shadow-md',
        'transition-shadow duration-200 hover:shadow-xl',
        selected && 'ring-2 ring-blue-500 ring-offset-2'
      )}
      style={{
        width: '180px',
        height: '100px',
        position: 'relative',
      }}
    >
      {/* Event Handler label - full width bar at top */}
      <div className="absolute left-0 top-0 flex w-full items-center rounded-t-md bg-blue-500 px-2 py-1 text-xs font-medium text-white">
        <Bell className="mr-1 h-3 w-3 text-white" />
        {data.label || 'New eventHandler'}
      </div>

      {/* Right handle - source */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectable={isConnectable}
        className="h-3 w-3 bg-blue-500"
      />
    </div>
  );
});
