'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { useWorkflow } from '@/contexts/workflow-context';
import { TaskDefinitionProperties } from './properties/task-definition-properties';
import { StateNodeProperties } from './properties/state-node-properties';
import { WorkerNodeProperties } from './properties/worker-node-properties';
import { ActionEdgeProperties } from './properties/action-edge-properties';
import { StateTransitionEdgeProperties } from './properties/state-transition-edge-properties';
import { EventHandlerProperties } from './properties/event-handler-properties';
import { EventHandlerEdgeProperties } from './properties/event-handler-edge-properties';

interface PropertiesCardProps {
  isCodeView: boolean;
}

export function PropertiesCard({ isCodeView }: PropertiesCardProps) {
  const { selectedNode, selectedEdge, updateNodeData, updateEdgeData } =
    useWorkflow();

  // If no node or edge is selected, or we're in code view, don't show the card
  if ((!selectedNode && !selectedEdge) || isCodeView) return null;

  const commonCardClasses = 'fixed top-20 right-4 w-[320px] shadow-lg';

  // Handle edge properties
  if (selectedEdge) {
    switch (selectedEdge.type) {
      case 'action':
        return (
          <Card className={commonCardClasses}>
            <div className="p-4">
              <ActionEdgeProperties
                data={selectedEdge.data}
                onChange={(data) => updateEdgeData(selectedEdge.id, data)}
              />
            </div>
          </Card>
        );
      case 'stateTransition':
        return (
          <Card className={commonCardClasses}>
            <div className="p-4">
              <StateTransitionEdgeProperties
                data={selectedEdge.data}
                onChange={(data) => updateEdgeData(selectedEdge.id, data)}
              />
            </div>
          </Card>
        );
      case 'eventHandler':
        return (
          <Card className={commonCardClasses}>
            <div className="p-4">
              <EventHandlerEdgeProperties
                data={selectedEdge.data}
                onChange={(data) => updateEdgeData(selectedEdge.id, data)}
              />
            </div>
          </Card>
        );
      default:
        return null;
    }
  }

  // Handle node properties
  if (selectedNode) {
    switch (selectedNode.type) {
      case 'taskDefinition':
        return (
          <Card className={commonCardClasses}>
            <div className="p-4">
              <TaskDefinitionProperties
                data={selectedNode.data}
                onChange={(data) => updateNodeData(selectedNode.id, data)}
                nodeId={selectedNode.id}
              />
            </div>
          </Card>
        );
      case 'state':
        return (
          <Card className={commonCardClasses}>
            <div className="p-4">
              <StateNodeProperties
                data={selectedNode.data}
                onChange={(data) => updateNodeData(selectedNode.id, data)}
              />
            </div>
          </Card>
        );
      case 'worker':
        return (
          <Card className={commonCardClasses}>
            <div className="p-4">
              <WorkerNodeProperties
                data={selectedNode.data}
                onChange={(data) => updateNodeData(selectedNode.id, data)}
                nodeId={selectedNode.id}
              />
            </div>
          </Card>
        );
      case 'eventHandler':
        return (
          <Card className={commonCardClasses}>
            <div className="p-4">
              <EventHandlerProperties
                node={selectedNode}
                onChange={updateNodeData}
              />
            </div>
          </Card>
        );
      default:
        return null;
    }
  }

  return null;
}
