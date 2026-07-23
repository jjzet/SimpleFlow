import { Node, Edge } from 'reactflow';
import { TaskDefinitionCode, CodeCache } from './types';
import { nodeHandlers } from './node-handlers';
import { edgeHandlers } from './edge-handlers';

export class TaskDefinitionCodeGenerator {
  private codeCache: CodeCache = {};
  private cacheTimeout = 5000; // 5 seconds

  private getCacheKey(
    taskDefinitionId: string,
    scope: string,
    code: string
  ): string {
    // Use node ID as the primary key, with scope:code as a fallback for backward compatibility
    return `${taskDefinitionId}:${scope}:${code}`;
  }

  generateInitialCode(taskDefinition: Node): TaskDefinitionCode {
    return {
      id: {
        scope: taskDefinition.data.scope || '',
        code: taskDefinition.data.code || '',
      },
      displayName: taskDefinition.data.displayName || '',
      description: taskDefinition.data.description || '',
      states: [],
      fieldSchema: [],
      initialState: {
        name: '',
        requiredFields: [],
      },
      triggers: [],
      transitions: [],
      actions: [],
    };
  }

  formatWorkerParameters(parameters: any[] = []) {
    const formattedParams: { [key: string]: { mapFrom: string; setTo: null } } =
      {};
    parameters.forEach((param) => {
      if (param.name) {
        formattedParams[param.name] = {
          mapFrom: param.mapFrom || '',
          setTo: null,
        };
      }
    });
    return formattedParams;
  }

  generateCode(
    taskDefinitionId: string,
    nodes: Node[],
    edges: Edge[]
  ): TaskDefinitionCode {
    // Find the task definition node
    const taskDefinitionNode = nodes.find(
      (node) => node.id === taskDefinitionId && node.type === 'taskDefinition'
    );

    if (!taskDefinitionNode) {
      throw new Error(`Task definition node not found: ${taskDefinitionId}`);
    }

    const nodeScope = taskDefinitionNode.data.scope || '';
    const nodeCode = taskDefinitionNode.data.code || '';
    const cacheKey = this.getCacheKey(taskDefinitionId, nodeScope, nodeCode);

    // Check cache first
    const cached = this.codeCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.code;
    }

    // Generate initial code
    let generatedCode = this.generateInitialCode(taskDefinitionNode);

    // Include the task definition node itself and all nodes that belong to it
    // First priority: match by ownerTaskDefinitionId
    // Second priority: match by scope/code for backward compatibility
    const relatedNodes = nodes.filter(
      (node) =>
        node.id === taskDefinitionId ||
        node.data.ownerTaskDefinitionId === taskDefinitionId ||
        (node.data.ownerTaskDefinition?.scope === nodeScope &&
          node.data.ownerTaskDefinition?.code === nodeCode)
    );

    const relatedEdges = edges.filter(
      (edge) =>
        edge.data.ownerTaskDefinitionId === taskDefinitionId ||
        (edge.data.ownerTaskDefinition?.scope === nodeScope &&
          edge.data.ownerTaskDefinition?.code === nodeCode)
    );

    // Process all nodes
    relatedNodes.forEach((node) => {
      const handler = nodeHandlers.find((h) => h.canHandle(node));
      if (handler) {
        handler.updateCode(node, generatedCode);
      }
    });

    // Process all edges
    relatedEdges.forEach((edge) => {
      const handler = edgeHandlers.find((h) => h.canHandle(edge));
      if (handler) {
        handler.updateCode(edge, generatedCode, nodes);
      }
    });

    // Format worker parameters in actions
    if (generatedCode.actions) {
      generatedCode.actions = generatedCode.actions.map((action) => {
        if (
          action.actionDetails?.type === 'RunWorker' &&
          Array.isArray(action.actionDetails.workerParameters)
        ) {
          return {
            ...action,
            actionDetails: {
              ...action.actionDetails,
              workerParameters: this.formatWorkerParameters(
                action.actionDetails.workerParameters
              ),
            },
          };
        }
        return action;
      });
    }

    // Update cache using the combined key
    this.codeCache[cacheKey] = {
      code: generatedCode,
      timestamp: Date.now(),
    };

    return generatedCode;
  }

  invalidateCache(taskDefinitionId?: string, nodes?: Node[]): void {
    if (taskDefinitionId && nodes) {
      // Find the task definition node
      const taskDefinitionNode = nodes.find(
        (node) => node.id === taskDefinitionId && node.type === 'taskDefinition'
      );

      if (taskDefinitionNode) {
        const scope = taskDefinitionNode.data.scope || '';
        const code = taskDefinitionNode.data.code || '';
        const cacheKey = this.getCacheKey(taskDefinitionId, scope, code);
        delete this.codeCache[cacheKey];
      }
    } else {
      // If no specific ID or nodes provided, clear entire cache
      this.codeCache = {};
    }
  }
}
