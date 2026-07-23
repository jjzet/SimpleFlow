import { Node, Edge } from 'reactflow';
import { WorkerNodeData } from '@/types/workflow';

export interface WorkerCode {
  id: {
    scope: string;
    code: string;
  };
  displayName: string;
  description: string;
  workerConfiguration: {
    type: 'LuminesceView';
    name: string;
  };
  parameters: Array<{
    type: 'DateTime' | 'String' | 'Decimal' | 'Boolean';
    name: string;
    displayName: string;
    required: boolean;
  }>;
}

interface WorkerCodeCache {
  [key: string]: {
    code: WorkerCode;
    timestamp: number;
  };
}

export class WorkerCodeGenerator {
  private codeCache: WorkerCodeCache = {};
  private cacheTimeout = 5000; // 5 seconds

  private getCacheKey(workerId: string, scope: string, code: string): string {
    // Use node ID as the primary key, with scope:code as a fallback for backward compatibility
    return `${workerId}:${scope}:${code}`;
  }

  generateCode(workerId: string, nodes: Node[], edges: Edge[]): WorkerCode {
    // Find the worker node
    const workerNode = nodes.find((node) => node.id === workerId);
    if (!workerNode || workerNode.type !== 'worker') {
      throw new Error(`Worker node not found: ${workerId}`);
    }

    const data = workerNode.data as WorkerNodeData;
    const nodeScope = data.scope || '';
    const nodeCode = data.code || '';
    const cacheKey = this.getCacheKey(workerId, nodeScope, nodeCode);

    // Check cache first
    const cached = this.codeCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.code;
    }

    // Generate the code with the correct structure
    const generatedCode: WorkerCode = {
      id: {
        scope: nodeScope,
        code: nodeCode,
      },
      displayName: data.displayName || data.label || 'Unnamed Worker',
      description: data.description || '',
      workerConfiguration: {
        type: 'LuminesceView',
        name: data.workerViewName || `Worker.${nodeCode || 'Unnamed'}`,
      },
      parameters: (data.parameters || []).map((param) => ({
        type: param.type || 'String',
        name: param.name,
        displayName: param.displayName || param.name,
        required: param.required !== false,
      })),
    };

    // Cache the result using workerId:scope:code as key
    this.codeCache[cacheKey] = {
      code: generatedCode,
      timestamp: Date.now(),
    };

    return generatedCode;
  }

  invalidateCache(workerId?: string, nodes?: Node[]): void {
    if (workerId && nodes) {
      // Find the worker node
      const workerNode = nodes.find(
        (node) => node.id === workerId && node.type === 'worker'
      );

      if (workerNode) {
        const data = workerNode.data as WorkerNodeData;
        const scope = data.scope || '';
        const code = data.code || '';
        const cacheKey = this.getCacheKey(workerId, scope, code);
        delete this.codeCache[cacheKey];
      }
    } else {
      // If no specific ID or nodes provided, clear entire cache
      this.codeCache = {};
    }
  }
}
