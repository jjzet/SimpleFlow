'use client';

import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { Handle, Position, NodeProps, useUpdateNodeInternals } from 'reactflow';
import { cn } from '@/lib/utils';
import { Flag } from 'lucide-react';
import { StateNodeData } from '@/types/workflow';

export interface StateData {
  label: string;
  // Add task ID to track parent-child relationship
  taskId?: string;
}

export const StateNode = React.forwardRef<HTMLDivElement, NodeProps<StateData>>(
  (props, ref) => {
    const { data, isConnectable, selected, id } = props;

    // Use updateNodeInternals to manually trigger React Flow to re-compute node handles
    const updateNodeInternals = useUpdateNodeInternals();

    // Add state for width and text measurement
    const [width, setWidth] = useState(120); // Start with default width
    const textRef = useRef<HTMLDivElement>(null);
    const nodeInitialized = useRef(false);

    // Use useEffect instead of useLayoutEffect for more reliable updates
    useEffect(() => {
      // Create a temporary span to measure text width
      const span = document.createElement('span');
      span.style.visibility = 'hidden';
      span.style.position = 'absolute';
      span.style.fontSize = '0.875rem'; // text-sm in Tailwind
      span.style.fontWeight = '500'; // font-medium in Tailwind
      span.style.whiteSpace = 'nowrap';
      span.innerText = data.label || '';

      document.body.appendChild(span);
      const textWidth = span.getBoundingClientRect().width;
      document.body.removeChild(span);

      // Add padding for left and right sides
      const newWidth = Math.max(120, textWidth + 50); // More padding to ensure text fits

      if (Math.abs(newWidth - width) > 5) {
        // Only update if difference is significant
        setWidth(newWidth);

        // After updating width, update node internals to ensure handles are recalculated
        setTimeout(() => {
          updateNodeInternals(id);
        }, 0);
      }
    }, [data.label, width, id, updateNodeInternals]);

    // More aggressive initialization of node handles
    useEffect(() => {
      if (!nodeInitialized.current) {
        // Multiple updates with increasing delays to ensure handles are registered
        const updateTimes = [0, 50, 200, 500, 1000];

        updateTimes.forEach((delay) => {
          const timer = setTimeout(() => {
            updateNodeInternals(id);
          }, delay);

          return () => clearTimeout(timer);
        });

        nodeInitialized.current = true;
      }
    }, [id, updateNodeInternals]);

    // Add a useEffect to update node internals when the node's position changes
    const nodePosition = (props as any).position;
    useEffect(() => {
      updateNodeInternals(id);
    }, [nodePosition, id, updateNodeInternals]);

    // Add a DOM observer to ensure handles are registered when the node element changes
    useEffect(() => {
      if (ref && 'current' in ref && ref.current) {
        // Create a MutationObserver to watch for changes to the node element
        const observer = new MutationObserver(() => {
          // When the node element changes, update node internals
          updateNodeInternals(id);
        });

        // Observe changes to the node element's attributes and children
        observer.observe(ref.current, {
          attributes: true,
          childList: true,
          subtree: true,
          attributeFilter: ['style', 'class'],
        });

        return () => {
          observer.disconnect();
        };
      }
    }, [id, ref, updateNodeInternals]);

    // Define common handle styles
    const handleStyle = {
      width: '8px',
      height: '8px',
      background: '#3b82f6', // blue-500
      border: '2px solid #ffffff',
      zIndex: 1000,
    };

    // Reinitialize handles when component re-renders using useLayoutEffect for synchronous update
    useLayoutEffect(() => {
      updateNodeInternals(id);
    }, [id, updateNodeInternals]);

    return (
      <div
        ref={ref}
        data-parent={data.taskId}
        className={cn(
          'rounded-lg border-2 border-blue-500 bg-blue-50 px-4 py-2 shadow-md',
          'transition-shadow duration-200 hover:shadow-xl',
          'flex items-center justify-center text-center text-sm font-medium',
          selected && 'ring-2 ring-blue-500 ring-offset-2'
        )}
        style={{ width: `${width}px`, height: '40px', position: 'relative' }}
        id={`state-node-${id}`} // Add an ID for easier debugging
      >
        <div ref={textRef} className="whitespace-nowrap">
          {data.label}
        </div>

        {/* Top handle - with improved positioning */}
        <Handle
          type="source"
          position={Position.Top}
          id="top"
          isConnectable={isConnectable}
          style={{
            ...handleStyle,
            top: '-4px',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />

        {/* Right handle - with improved positioning */}
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          isConnectable={isConnectable}
          style={{
            ...handleStyle,
            right: '-4px',
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />

        {/* Bottom handle - with improved positioning */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          isConnectable={isConnectable}
          style={{
            ...handleStyle,
            bottom: '-4px',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />

        {/* Left handle - with improved positioning */}
        <Handle
          type="source"
          position={Position.Left}
          id="left"
          isConnectable={isConnectable}
          style={{
            ...handleStyle,
            left: '-4px',
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />
      </div>
    );
  }
);
StateNode.displayName = 'StateNode';

export function StateNodeOld({
  data,
  isConnectable,
}: NodeProps<StateNodeData>) {
  return (
    <div className="relative h-[40px] w-[120px]">
      {/* Initial State Indicator */}
      {data.isInitial && (
        <div
          className="absolute -left-2 -top-2 z-10 rounded-full border border-blue-500 bg-blue-50 p-0.5"
          title="Initial State"
        >
          <Flag className="h-3 w-3 text-blue-500" strokeWidth={2} />
        </div>
      )}

      <div
        className={cn(
          'h-full w-full',
          'rounded-md border-2 border-gray-600 bg-gray-50 px-2 py-1',
          'flex items-center justify-center shadow-md',
          'transition-shadow duration-200 hover:shadow-lg'
        )}
      >
        <div className="whitespace-nowrap text-xs text-gray-700">
          {data.label || 'New state'}
        </div>

        {/* Top handle */}
        <Handle
          type="source"
          position={Position.Top}
          id="top"
          isConnectable={isConnectable}
          className="h-2 w-2 bg-gray-500"
        />

        {/* Right handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          isConnectable={isConnectable}
          className="h-2 w-2 bg-gray-500"
        />

        {/* Bottom handle */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          isConnectable={isConnectable}
          className="h-2 w-2 bg-gray-500"
        />

        {/* Left handle */}
        <Handle
          type="source"
          position={Position.Left}
          id="left"
          isConnectable={isConnectable}
          className="h-2 w-2 bg-gray-500"
        />
      </div>
    </div>
  );
}
