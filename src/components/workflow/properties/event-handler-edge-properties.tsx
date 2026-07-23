import React from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useWorkflow } from '@/contexts/workflow-context';
import { EventHandlerEdgeData } from '@/types/workflow';

interface EventHandlerEdgePropertiesProps {
  data: EventHandlerEdgeData;
  onChange: (data: Partial<EventHandlerEdgeData>) => void;
}

export function EventHandlerEdgeProperties({
  data,
  onChange,
}: EventHandlerEdgePropertiesProps) {
  const { nodes } = useWorkflow();

  // Find the source node (event handler) and target node (task definition)
  const sourceNode = nodes.find((node) => node.id === data.sourceNodeId);
  const targetNode = nodes.find((node) => node.id === data.targetNodeId);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Event Handler Connection</h3>

      {data.ownerTaskDefinition && (
        <div className="space-y-2">
          <Label>Task Definition</Label>
          <div className="flex items-center gap-2 text-xs">
            <Badge
              variant="secondary"
              className="inline-flex items-center gap-1.5"
            >
              <span className="font-medium">
                {data.ownerTaskDefinition.scope}
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium">
                {data.ownerTaskDefinition.code}
              </span>
            </Badge>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Connection Type</Label>
        <div className="text-sm">Event Handler → Task Definition</div>
      </div>

      {sourceNode && (
        <div className="space-y-2">
          <Label>Event Handler</Label>
          <div className="flex items-center gap-2 text-xs">
            <Badge
              variant="outline"
              className="inline-flex items-center gap-1.5"
            >
              <span className="font-medium">
                {sourceNode.data.displayName || 'Unnamed Event Handler'}
              </span>
            </Badge>
          </div>
        </div>
      )}

      {targetNode && (
        <div className="space-y-2">
          <Label>Target Task Definition</Label>
          <div className="flex items-center gap-2 text-xs">
            <Badge
              variant="outline"
              className="inline-flex items-center gap-1.5"
            >
              <span className="font-medium">
                {targetNode.data.displayName || 'Unnamed Task Definition'}
              </span>
            </Badge>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
        This connection links an Event Handler to a Task Definition. When the
        event is triggered, the associated task will be executed.
      </div>
    </div>
  );
}
