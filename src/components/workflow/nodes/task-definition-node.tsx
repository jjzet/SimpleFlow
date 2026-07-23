'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { cn } from '@/lib/utils';
import { useWorkflow } from '@/contexts/workflow-context';

export type TaskType = 'parent' | 'child' | 'exception';

export interface TaskDefinitionData {
  label: string;
  type: TaskType;
  description?: string;
  // Optionally include scope and code if available
  scope?: string;
  code?: string;
  displayName?: string;
  savedSize?: { width: number; height: number };
}

export const taskDefaultSizes = {
  parent: { width: 600, height: 300 },
  child: { width: 450, height: 260 },
  exception: { width: 300, height: 200 },
};

const taskTypeStyles: Record<
  TaskType,
  { border: string; bg: string; text: string; pillBg: string; headerBg: string }
> = {
  parent: {
    border: 'border-yellow-500',
    bg: 'bg-yellow-50/80',
    text: 'text-yellow-800',
    pillBg: 'bg-yellow-500',
    headerBg: 'bg-yellow-100',
  },
  child: {
    border: 'border-orange-500',
    bg: 'bg-orange-50/80',
    text: 'text-orange-800',
    pillBg: 'bg-orange-500',
    headerBg: 'bg-orange-100',
  },
  exception: {
    border: 'border-red-500',
    bg: 'bg-red-50/80',
    text: 'text-red-800',
    pillBg: 'bg-red-500',
    headerBg: 'bg-red-100',
  },
};

// Calculate proper container size based on child content
function calculateContainerSize(
  taskType: TaskType,
  containerId: string
): { width: number; height: number } {
  const defaultSize = taskDefaultSizes[taskType];

  // Try to find the container element
  const container = document.getElementById(`taskDefinition-${containerId}`);
  if (!container) {
    return defaultSize;
  }

  // Find all child nodes within this container
  const childNodes = document.querySelectorAll(
    `[data-parent="${containerId}"]`
  );
  if (childNodes.length === 0) {
    return defaultSize;
  }

  // Calculate boundaries based on child positions
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  childNodes.forEach((node: Element) => {
    const rect = node.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Adjust coordinates relative to the container
    const relativeLeft = rect.left - containerRect.left;
    const relativeTop = rect.top - containerRect.top;

    minX = Math.min(minX, relativeLeft);
    minY = Math.min(minY, relativeTop);
    maxX = Math.max(maxX, relativeLeft + rect.width);
    maxY = Math.max(maxY, relativeTop + rect.height);
  });

  // Add padding to the calculated size
  const padding = 50;
  const width = Math.max(defaultSize.width, maxX + padding);
  const height = Math.max(defaultSize.height, maxY + padding);

  return { width, height };
}

export const TaskDefinitionNode = React.forwardRef<
  HTMLDivElement,
  NodeProps<TaskDefinitionData>
>((props, ref) => {
  const { data, isConnectable, selected, id } = props;
  const styles = taskTypeStyles[data.type || 'parent'];
  const { updateNodeData } = useWorkflow();

  // Initialize size from node's style if available, otherwise use default
  const [size, setSize] = useState(() => {
    // Get the node style from the DOM element (for existing nodes)
    const nodeElement = document.getElementById(`taskDefinition-${id}`);
    if (nodeElement) {
      const width = nodeElement.offsetWidth;
      const height = nodeElement.offsetHeight;
      if (width > 0 && height > 0) {
        return { width, height };
      }
    }

    // If we have a style object in the node data, use that
    if (
      data.savedSize &&
      typeof data.savedSize.width === 'number' &&
      typeof data.savedSize.height === 'number'
    ) {
      return {
        width: data.savedSize.width,
        height: data.savedSize.height,
      };
    }

    // Fall back to default sizes
    return taskDefaultSizes[data.type || 'parent'];
  });

  // Add a ref to track if the node has been manually resized
  const hasBeenManuallyResized = useRef(false);

  // Set hasBeenManuallyResized to true if the node has a custom size
  useEffect(() => {
    if (
      data.savedSize &&
      typeof data.savedSize.width === 'number' &&
      typeof data.savedSize.height === 'number'
    ) {
      hasBeenManuallyResized.current = true;
    }
  }, [data.savedSize]);

  // Update size when content changes, but only if not manually resized
  useEffect(() => {
    // Skip automatic resize if node has been manually resized
    if (hasBeenManuallyResized.current) {
      return;
    }

    // Use requestAnimationFrame to ensure DOM is fully updated
    const frame = requestAnimationFrame(() => {
      const newSize = calculateContainerSize(data.type || 'parent', id);
      setSize(newSize);
    });

    return () => cancelAnimationFrame(frame);
  }, [id, data.type]); // Remove position dependencies to avoid resize on move

  // Apply size to node style
  const nodeStyle = {
    width: size.width,
    height: size.height,
  };

  // Handle resize from NodeResizer
  const onResize = (_event: any, params: { width: number; height: number }) => {
    // Mark the node as manually resized
    hasBeenManuallyResized.current = true;

    // Update the size state
    const newSize = { width: params.width, height: params.height };
    setSize(newSize);

    // Store the size in the node data for persistence
    updateNodeData(id, { savedSize: newSize });
  };

  return (
    <div
      id={`taskDefinition-${id}`}
      ref={ref}
      data-scope={data.scope}
      data-code={data.code}
      className={cn(
        'border-2 shadow-md',
        'transition-shadow duration-200 hover:shadow-xl',
        'flex h-full w-full flex-col',
        'relative',
        selected && 'ring-2 ring-blue-500 ring-offset-2',
        selected && 'hover:cursor-move active:cursor-move',
        styles.border,
        styles.bg
      )}
      style={{
        ...nodeStyle,
        borderRadius: '8px',
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={200}
        minHeight={150}
        onResize={onResize}
        handleStyle={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: '#3b82f6',
          border: '2px solid #2563eb',
        }}
        lineStyle={{ border: '1px solid #2563eb' }}
      />

      {/* Header section with exact matching border radius */}
      <div
        className={cn(
          'flex h-8 w-full items-center px-4 text-xs font-medium text-white',
          styles.pillBg
        )}
        style={{
          borderTopLeftRadius: '6px',
          borderTopRightRadius: '6px',
        }}
      >
        {data.label}
      </div>

      {/* Content section for states and workers - no description */}
      <div className="relative flex-1 p-4">{/* No description text */}</div>

      {/* Top handle */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        isConnectable={isConnectable}
        className={cn(
          'h-3 w-3',
          data.type === 'parent'
            ? 'bg-yellow-400'
            : data.type === 'child'
              ? 'bg-orange-400'
              : 'bg-red-400'
        )}
      />

      {/* Right handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectable={isConnectable}
        className={cn(
          'h-3 w-3',
          data.type === 'parent'
            ? 'bg-yellow-400'
            : data.type === 'child'
              ? 'bg-orange-400'
              : 'bg-red-400'
        )}
      />

      {/* Bottom handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectable={isConnectable}
        className={cn(
          'h-3 w-3',
          data.type === 'parent'
            ? 'bg-yellow-400'
            : data.type === 'child'
              ? 'bg-orange-400'
              : 'bg-red-400'
        )}
      />

      {/* Left handle */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        isConnectable={isConnectable}
        className={cn(
          'h-3 w-3',
          data.type === 'parent'
            ? 'bg-yellow-400'
            : data.type === 'child'
              ? 'bg-orange-400'
              : 'bg-red-400'
        )}
      />
    </div>
  );
});
TaskDefinitionNode.displayName = 'TaskDefinitionNode';
