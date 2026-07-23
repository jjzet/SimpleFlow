import { Edge, Node } from 'reactflow';
import { TaskDefinitionCode } from './types';

export interface EdgeHandler {
  canHandle(edge: Edge): boolean;
  updateCode(edge: Edge, code: TaskDefinitionCode, nodes: Node[]): void;
}

export class StateTransitionEdgeHandler implements EdgeHandler {
  canHandle(edge: Edge): boolean {
    return edge.type === 'stateTransition';
  }

  updateCode(edge: Edge, code: TaskDefinitionCode, nodes: Node[]): void {
    // Add trigger if not exists
    if (
      edge.data.trigger &&
      !code.triggers.find((t) => t.name === edge.data.trigger)
    ) {
      code.triggers.push({
        name: edge.data.trigger,
        trigger: { type: 'External' },
      });
    }

    // Add or update transition
    const existingTransition = code.transitions.find(
      (t) =>
        t.fromState === edge.data.sourceState &&
        t.toState === edge.data.targetState
    );

    if (existingTransition) {
      existingTransition.trigger = edge.data.trigger;
      if (edge.data.guard) {
        existingTransition.guard = edge.data.guard;
      } else {
        delete existingTransition.guard;
      }
    } else {
      code.transitions.push({
        fromState: edge.data.sourceState,
        toState: edge.data.targetState,
        trigger: edge.data.trigger,
        ...(edge.data.guard && { guard: edge.data.guard }),
      });
    }
  }
}

export class ActionEdgeHandler implements EdgeHandler {
  canHandle(edge: Edge): boolean {
    return edge.type === 'action';
  }

  updateCode(edge: Edge, code: TaskDefinitionCode, nodes: Node[]): void {
    if (!code.actions) {
      code.actions = [];
    }

    // Find or create action
    let action = code.actions.find((a) => a.name === edge.data.name);
    if (!action) {
      action = {
        name: edge.data.name,
        actionDetails: {
          type: edge.data.actionType,
        },
      };
      code.actions.push(action);
    }

    // Update action details based on type
    switch (edge.data.actionType) {
      case 'RunWorker': {
        // Ensure workerId is set
        if (!edge.data.workerId) {
          const worker = nodes.find((n) => n.id === edge.target);
          if (worker) {
            edge.data.workerId = {
              scope: worker.data.scope || '',
              code: worker.data.code || '',
            };
          }
        }
        if (edge.data.workerId) {
          action.actionDetails.workerId = edge.data.workerId;
        }
        // Use workerParameters from edge, fallback to worker node data if not present
        if (edge.data.workerParameters) {
          action.actionDetails.workerParameters = edge.data.workerParameters;
        } else {
          const worker = nodes.find((n) => n.id === edge.target);
          if (worker && worker.data.parameters) {
            action.actionDetails.workerParameters = worker.data.parameters;
          }
        }
        // Similarly, for status triggers
        if (edge.data.statusTriggers) {
          action.actionDetails.workerStatusTriggers = edge.data.statusTriggers;
        } else {
          const worker = nodes.find((n) => n.id === edge.target);
          if (worker && worker.data.statusTriggers) {
            action.actionDetails.workerStatusTriggers =
              worker.data.statusTriggers;
          }
        }

        // Add child task configuration if the worker has one
        const worker = nodes.find((n) => n.id === edge.target);
        if (worker && worker.data.childTask) {
          action.actionDetails.childTaskConfigurations = [
            {
              taskDefinitionId: {
                scope: worker.data.childTask.scope,
                code: worker.data.childTask.code,
              },
              initialTrigger: worker.data.childTask.initialTrigger,
              childTaskFields: Object.fromEntries(
                worker.data.childTask.fieldMappings.map(
                  (mapping: { childField: string; mapFrom: string }) => [
                    mapping.childField,
                    { mapFrom: mapping.mapFrom },
                  ]
                )
              ),
            },
          ];
        }
        break;
      }
      case 'CreateChildTasks': {
        // Ensure taskDefinitionId is set from the target node
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (targetNode) {
          const taskDefinitionId = {
            scope: targetNode.data.scope || '',
            code: targetNode.data.code || '',
          };

          // Set taskDefinitionId on the edge data itself
          edge.data.taskDefinitionId = taskDefinitionId;

          if (
            !edge.data.childTaskConfigurations ||
            edge.data.childTaskConfigurations.length === 0
          ) {
            action.actionDetails.childTaskConfigurations = [
              {
                taskDefinitionId,
                initialTrigger: 'start',
                childTaskFields: {},
              },
            ];
          } else {
            action.actionDetails.childTaskConfigurations =
              edge.data.childTaskConfigurations.map(
                (config: {
                  initialTrigger: string;
                  childTaskFields: Record<string, { mapFrom: string }>;
                }) => ({
                  ...config,
                  taskDefinitionId,
                })
              );
          }
        }
        break;
      }
      case 'TriggerParentTask': {
        if (edge.data.trigger) {
          action.actionDetails.trigger = edge.data.trigger;
        }
        break;
      }
    }

    // Find the appropriate transition to link the action to
    // Look for transitions that lead to the state where this action is connected
    const sourceNode = nodes.find((n) => n.id === edge.source);
    if (sourceNode && sourceNode.type === 'state') {
      const transitions = code.transitions.filter(
        (t) => t.toState === sourceNode.data.name
      );
      transitions.forEach((transition) => {
        transition.action = edge.data.name;
      });
    }
  }
}

// Collection of all edge handlers
export const edgeHandlers: EdgeHandler[] = [
  new StateTransitionEdgeHandler(),
  new ActionEdgeHandler(),
];
