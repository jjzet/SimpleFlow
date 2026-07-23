'use client';

import React from 'react';
import ReactFlow, {
  Background,
  Controls,
  Panel,
  Node,
  NodeMouseHandler,
  Connection,
  Edge,
  ConnectionMode,
  OnConnectStart,
  OnConnectEnd,
  ConnectionLineType,
  NodeChange,
  applyNodeChanges,
  useReactFlow,
} from 'reactflow';
import { useWorkflow } from '@/contexts/workflow-context';
import { TaskDefinitionNode } from './nodes/task-definition-node';
import { WorkerNode } from './nodes/worker-node';
import { TriggerNode } from './nodes/trigger-node';
import { GuardNode } from './nodes/guard-node';
import { StateNode } from './nodes/state-node';
import { EventHandlerNode } from './nodes/event-handler-node';
import { ActionEdge } from './edges/action-edge';
import { StateTransitionEdge } from './edges/state-transition-edge';
import { LinkChildTaskEdge } from './edges/link-child-task-edge';
import { EventHandlerEdge } from './edges/event-handler-edge';
import { ViewToggle } from './view-toggle';
import { cn } from '@/lib/utils';
import 'reactflow/dist/style.css';
import { PropertiesCard } from './properties-card';
import CodeEditorView from './code-editor-view';
import { AIAssistant } from '@/components/ai-assistant/ai-assistant';

const nodeTypes = {
  taskDefinition: TaskDefinitionNode,
  worker: WorkerNode,
  trigger: TriggerNode,
  guard: GuardNode,
  state: StateNode,
  eventHandler: EventHandlerNode,
};

const edgeTypes = {
  action: ActionEdge,
  stateTransition: StateTransitionEdge,
  linkChildTask: LinkChildTaskEdge,
  eventHandler: EventHandlerEdge,
};

interface WorkflowCanvasProps {
  className?: string;
  isCodeView: boolean;
  onCodeViewChange: (isCodeView: boolean) => void;
}

export function WorkflowCanvas({
  className,
  isCodeView,
  onCodeViewChange,
}: WorkflowCanvasProps) {
  const {
    nodes,
    edges,
    onNodesChange,
    selectedElement,
    setSelectedNode,
    setSelectedEdge,
    addNode,
    isValidConnection,
    addEdge,
    deleteEdge,
    isActionMode,
    selectedEdge,
    isStateTransitionMode,
    isLinkChildTaskMode,
    selectedNode,
    deleteNodes,
    updateNodeData,
  } = useWorkflow();

  // Get the reactFlow instance to access the screenToFlowPosition method
  const reactFlowInstance = useReactFlow();

  // Wrap onNodesChange to prevent default deletion
  const handleNodesChange = React.useCallback(
    (changes: NodeChange[]) => {
      // Filter out any "remove" changes - we'll handle deletion separately
      const nonRemovalChanges = changes.filter(
        (change) => change.type !== 'remove'
      );
      onNodesChange(nonRemovalChanges);
    },
    [onNodesChange]
  );

  // Node drag stop handler to detect snapping into a TaskDefinition container
  const handleNodeDragStop = React.useCallback(
    (event: React.MouseEvent, draggedNode: Node) => {
      // Do nothing if the dragged node is a TaskDefinition itself
      if (draggedNode.type === 'taskDefinition') return;

      // Get the drop position from the event
      const { clientX, clientY } = event;

      // Find all task definition nodes
      const taskDefNodes = nodes.filter((n) => n.type === 'taskDefinition');

      // Check if the node is dropped inside any task definition
      let droppedInTaskDef = false;

      for (const tdNode of taskDefNodes) {
        const container = document.getElementById(
          `taskDefinition-${tdNode.id}`
        );
        if (container) {
          const rect = container.getBoundingClientRect();
          if (
            clientX >= rect.left &&
            clientX <= rect.right &&
            clientY >= rect.top &&
            clientY <= rect.bottom
          ) {
            // Found a task definition container where the node was dropped
            droppedInTaskDef = true;
            const tdData = tdNode.data;
            if (tdData.scope && tdData.code) {
              updateNodeData(draggedNode.id, {
                ownerTaskDefinition: {
                  scope: tdData.scope,
                  code: tdData.code,
                },
                ownerTaskDefinitionId: tdNode.id,
              });
            }
            break; // Stop after first match
          }
        }
      }

      // If not dropped in any task definition, remove the owner references
      if (!droppedInTaskDef) {
        updateNodeData(draggedNode.id, {
          ownerTaskDefinition: undefined,
          ownerTaskDefinitionId: undefined,
        });
      }
    },
    [nodes, updateNodeData]
  );

  // Update the keyboard event handler
  React.useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const activeElement = document.activeElement;
        if (
          activeElement?.tagName !== 'INPUT' &&
          activeElement?.tagName !== 'TEXTAREA'
        ) {
          if (selectedNode) {
            event.preventDefault(); // Prevent default deletion behavior
            const success = await deleteNodes([selectedNode.id]);
            if (!success) {
              // If deletion was cancelled or failed, do nothing
              return;
            }
          } else if (selectedEdge) {
            deleteEdge(selectedEdge.id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, selectedEdge, deleteNodes, deleteEdge]);

  const onConnectStart: OnConnectStart = React.useCallback((event, params) => {
    console.log('Connection start:', params);
  }, []);

  const onConnectEnd: OnConnectEnd = React.useCallback((event) => {
    console.log('Connection end:', event);
  }, []);

  const onConnect = React.useCallback(
    (params: Connection) => {
      console.log('onConnect called with:', params);
      addEdge(params);
    },
    [addEdge]
  );

  const onNodeClick: NodeMouseHandler = React.useCallback(
    (_, node) => {
      setSelectedNode(node);
    },
    [setSelectedNode]
  );

  const onEdgeClick = React.useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      setSelectedEdge(edge);
    },
    [setSelectedEdge]
  );

  const onPaneClick = React.useCallback(
    (event: React.MouseEvent) => {
      // Clear selections when clicking the pane
      setSelectedNode(null);
      setSelectedEdge(null);

      // Only add node if an element is selected and it's not an edge type
      if (
        selectedElement &&
        !['action', 'stateTransition', 'linkChildTask'].includes(
          selectedElement.type
        )
      ) {
        // Use the screenToFlowPosition method to get the correct position in flow coordinates
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const newNode = addNode(selectedElement.type, position);

        // Set z-index based on node type
        if (newNode.type === 'taskDefinition') {
          newNode.style = { ...newNode.style, zIndex: 0 };
        } else {
          newNode.style = { ...newNode.style, zIndex: 1 };
        }
      }
    },
    [
      selectedElement,
      addNode,
      setSelectedNode,
      setSelectedEdge,
      reactFlowInstance,
    ]
  );

  return (
    <div className="relative h-full w-full">
      <ViewToggle
        isCodeView={isCodeView}
        onToggle={() => onCodeViewChange(!isCodeView)}
      />
      <div
        className={cn(
          className,
          'absolute inset-0 transition-transform duration-300',
          isCodeView && '-translate-x-full',
          (isActionMode || isStateTransitionMode || isLinkChildTaskMode) &&
            'cursor-crosshair'
        )}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onNodeDragStart={() => {
            setSelectedEdge(null);
          }}
          onNodeDragStop={handleNodeDragStop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          isValidConnection={isValidConnection}
          connectionMode={ConnectionMode.Loose}
          snapToGrid={false}
          connectionLineStyle={{ stroke: '#343a40', strokeWidth: 1 }}
          connectionLineType={ConnectionLineType.SmoothStep}
          defaultEdgeOptions={{ zIndex: 1000 }}
          snapGrid={[15, 15]}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          elementsSelectable={true}
          selectNodesOnDrag={false}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {/* Notification panels positioned above the element selector */}
      {!isCodeView && (
        <div className="absolute bottom-24 left-1/2 z-[91] mb-1 -translate-x-1/2">
          {isActionMode && (
            <div className="mx-auto max-w-fit rounded-md border border-purple-200 bg-purple-100/95 px-3 py-1.5 text-xs font-medium text-purple-700 shadow-sm backdrop-blur duration-300 animate-in fade-in zoom-in-95 supports-[backdrop-filter]:bg-purple-100/60">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-500"></div>
                Click and drag between nodes
              </div>
            </div>
          )}
          {isStateTransitionMode && (
            <div className="mx-auto max-w-fit rounded-md border border-gray-200 bg-gray-100/95 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm backdrop-blur duration-300 animate-in fade-in zoom-in-95 supports-[backdrop-filter]:bg-gray-100/60">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-500"></div>
                Click and drag between states
              </div>
            </div>
          )}
          {isLinkChildTaskMode && (
            <div className="mx-auto max-w-fit rounded-md border border-blue-200 bg-blue-100/95 px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm backdrop-blur duration-300 animate-in fade-in zoom-in-95 supports-[backdrop-filter]:bg-blue-100/60">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500"></div>
                Click and drag from worker to child task
              </div>
            </div>
          )}
        </div>
      )}

      <PropertiesCard isCodeView={isCodeView} />
      <CodeEditorView isVisible={isCodeView} />
      <AIAssistant />
    </div>
  );
}
