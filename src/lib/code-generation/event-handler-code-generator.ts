import { Node, Edge } from 'reactflow';
import { EventHandlerCode, EventHandlerCodeCache } from './types';
import { lusidApiService } from '../services/lusid-api-service';

export class EventHandlerCodeGenerator {
  private codeCache: EventHandlerCodeCache = {};

  constructor() {
    this.codeCache = {};
  }

  // Helper to get a consistent cache key
  private getCacheKey(eventHandlerId: string): string {
    return eventHandlerId;
  }

  public generateCode(
    eventHandlerId: string,
    nodes: Node[],
    edges: Edge[]
  ): EventHandlerCode {
    // Get cache key based on the node ID
    const cacheKey = this.getCacheKey(eventHandlerId);

    // Check if we have a cached version
    if (
      this.codeCache[cacheKey] &&
      this.codeCache[cacheKey].timestamp > Date.now() - 5000
    ) {
      return this.codeCache[cacheKey].code;
    }

    // Find the event handler node
    const eventHandlerNode = nodes.find(
      (node) => node.id === eventHandlerId && node.type === 'eventHandler'
    );
    if (!eventHandlerNode) {
      throw new Error(`Event handler node with ID ${eventHandlerId} not found`);
    }

    // Find the connected task definition
    const eventHandlerEdge = edges.find(
      (edge) => edge.source === eventHandlerId && edge.type === 'eventHandler'
    );

    // Get task definition data from the node or edge
    let taskDefinitionId = eventHandlerNode.data.taskDefinitionId;

    // If not found in the node, try to get it from the edge
    if (
      (!taskDefinitionId ||
        !taskDefinitionId.scope ||
        !taskDefinitionId.code) &&
      eventHandlerEdge &&
      eventHandlerEdge.data.taskDefinitionId
    ) {
      taskDefinitionId = eventHandlerEdge.data.taskDefinitionId;
    }

    // If still not found, try to find the target node and get the data from there
    if (
      (!taskDefinitionId ||
        !taskDefinitionId.scope ||
        !taskDefinitionId.code) &&
      eventHandlerEdge
    ) {
      const targetNode = nodes.find(
        (node) => node.id === eventHandlerEdge.target
      );
      if (targetNode && targetNode.type === 'taskDefinition') {
        taskDefinitionId = {
          scope: targetNode.data.scope || '',
          code: targetNode.data.code || '',
        };
      }
    }

    // Get userId from settings if available
    const settings = lusidApiService.getSettings();
    const userId = settings?.userId || 'system';

    // Generate the code
    const code: EventHandlerCode = {
      id: {
        scope: eventHandlerNode.data.scope || '',
        code: eventHandlerNode.data.code || '',
      },
      displayName:
        eventHandlerNode.data.displayName ||
        eventHandlerNode.data.label ||
        'Event Handler',
      description: eventHandlerNode.data.description || '',
      status: 'Active',
      eventMatchingPattern: {
        eventType: eventHandlerNode.data.eventType || '',
        filter: eventHandlerNode.data.filter || undefined,
      },
      runAsUserId: {
        setTo: userId,
      },
      taskDefinitionId: taskDefinitionId || {
        scope: '',
        code: '',
      },
      taskActivity: {
        type: 'CreateNewTask',
        initialTrigger: eventHandlerNode.data.initialTrigger || 'start',
        correlationIds: eventHandlerNode.data.correlationIds
          ? eventHandlerNode.data.correlationIds.map((cid: any) => ({
              mapFrom: cid.mapFrom || null,
              setTo: cid.setTo || '',
            }))
          : [],
        taskFields: eventHandlerNode.data.taskFields || {},
      },
    };

    // Cache the code
    this.codeCache[cacheKey] = {
      code,
      timestamp: Date.now(),
    };

    return code;
  }

  public invalidateCache(eventHandlerId?: string, nodes?: Node[]) {
    if (eventHandlerId) {
      const cacheKey = this.getCacheKey(eventHandlerId);
      delete this.codeCache[cacheKey];
    } else {
      this.codeCache = {};
    }
  }
}
