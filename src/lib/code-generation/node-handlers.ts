import { Node } from 'reactflow';
import { NodeHandler, TaskDefinitionCode } from './types';

export class StateNodeHandler implements NodeHandler {
  canHandle(node: Node): boolean {
    return node.type === 'state';
  }

  updateCode(node: Node, code: TaskDefinitionCode): void {
    // Add state to states array if not exists
    if (!code.states.find((s) => s.name === node.data.name)) {
      code.states.push({ name: node.data.name });
    }

    // Update initial state if needed
    if (node.data.isInitial) {
      code.initialState.name = node.data.name;
    }
  }
}

export class WorkerNodeHandler implements NodeHandler {
  canHandle(node: Node): boolean {
    return node.type === 'worker';
  }

  updateCode(node: Node, code: TaskDefinitionCode): void {
    // Workers don't directly update the code
    // They are handled through action edges
  }
}

export class TaskDefinitionNodeHandler implements NodeHandler {
  canHandle(node: Node): boolean {
    return node.type === 'taskDefinition';
  }

  updateCode(node: Node, code: TaskDefinitionCode): void {
    // Update basic task definition properties
    code.id.scope = node.data.scope || '';
    code.id.code = node.data.code || '';
    code.displayName = node.data.displayName || '';
    code.description = node.data.description || '';

    if (node.data.fieldSchema) {
      // Remove the "required" flag from fieldSchema and assign to code.fieldSchema
      code.fieldSchema = node.data.fieldSchema.map((field: any) => ({
        name: field.name,
        type: field.type,
        description: field.description,
      }));
      // Ensure requiredFields exists
      if (!code.initialState.requiredFields) {
        code.initialState.requiredFields = [];
      }
      // Add field names marked as required
      node.data.fieldSchema.forEach((field: any) => {
        if (field.required) {
          code.initialState.requiredFields.push(field.name);
        }
      });
    }
  }
}

// Collection of all handlers
export const nodeHandlers: NodeHandler[] = [
  new StateNodeHandler(),
  new WorkerNodeHandler(),
  new TaskDefinitionNodeHandler(),
];
