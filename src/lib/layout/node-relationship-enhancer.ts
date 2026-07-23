import { Node, Edge } from 'reactflow';

/**
 * Enhances nodes with relationship information needed for layout
 * Adds parent-child relationships between nodes based on edges
 */
export function enhanceNodesWithRelationships(
  nodes: Node[],
  edges: Edge[]
): Node[] {
  // Clone the nodes to avoid mutating the original
  const enhancedNodes = JSON.parse(JSON.stringify(nodes)) as Node[];

  // Map to store task definitions by id
  const taskDefMap = new Map<string, Node>();

  // Identify all task definition nodes
  enhancedNodes
    .filter((node) => node.type === 'taskDefinition')
    .forEach((node) => {
      taskDefMap.set(node.id, node);
    });

  // Step 1: Identify parent-child task relationships
  const childTaskEdges = edges.filter((edge) => edge.type === 'linkChildTask');

  // Map child tasks to their parent task
  const childToParentMap = new Map<string, string>();

  childTaskEdges.forEach((edge) => {
    childToParentMap.set(edge.source, edge.target);
  });

  // If we have no child task edges, try to infer relationships from task types
  if (childTaskEdges.length === 0) {
    const parentTasks = enhancedNodes.filter(
      (node) => node.type === 'taskDefinition' && node.data.type === 'parent'
    );

    const childTasks = enhancedNodes.filter(
      (node) => node.type === 'taskDefinition' && node.data.type === 'child'
    );

    // If we have one parent and at least one child, connect them
    if (parentTasks.length > 0 && childTasks.length > 0) {
      childTasks.forEach((childTask) => {
        childToParentMap.set(childTask.id, parentTasks[0].id);
      });
    }
  }

  // Step 2: Link workers to their task definitions
  enhancedNodes
    .filter((node) => node.type === 'worker')
    .forEach((workerNode) => {
      // First check if the worker specifies an owner task definition
      if (workerNode.data.ownerTaskDefinition) {
        const ownerTask = enhancedNodes.find(
          (task) =>
            task.type === 'taskDefinition' &&
            task.data.scope === workerNode.data.ownerTaskDefinition?.scope &&
            task.data.code === workerNode.data.ownerTaskDefinition?.code
        );

        if (ownerTask) {
          // Add the task ID to the worker data
          workerNode.data = {
            ...workerNode.data,
            taskId: ownerTask.id,
          };
        }
      }
      // If no owner task definition is specified, check for an ID in the worker's name
      else if (workerNode.id.includes('worker-')) {
        // Extract task ID from the worker ID (assuming format like "task-id-worker-name")
        const parts = workerNode.id.split('-worker-');
        if (parts.length > 1 && taskDefMap.has(parts[0])) {
          workerNode.data = {
            ...workerNode.data,
            taskId: parts[0],
          };
        }
      }
    });

  // Step 3: Link states to their task definitions

  // Find state transitions
  const stateTransitions = edges.filter(
    (edge) => edge.type === 'stateTransition'
  );

  // Group state IDs by task ID using transition data
  const statesByTaskId = new Map<string, Set<string>>();

  // First, collect states explicitly linked to tasks via taskId in edge data
  stateTransitions.forEach((transition) => {
    if (transition.data?.ownerTaskDefinition) {
      const ownerTask = enhancedNodes.find(
        (task) =>
          task.type === 'taskDefinition' &&
          task.data.scope === transition.data.ownerTaskDefinition.scope &&
          task.data.code === transition.data.ownerTaskDefinition.code
      );

      if (ownerTask) {
        if (!statesByTaskId.has(ownerTask.id)) {
          statesByTaskId.set(ownerTask.id, new Set<string>());
        }
        statesByTaskId.get(ownerTask.id)?.add(transition.source);
        statesByTaskId.get(ownerTask.id)?.add(transition.target);
      }
    }
  });

  // If we couldn't find any explicit relationships, try to infer from state IDs
  if (statesByTaskId.size === 0) {
    enhancedNodes
      .filter((node) => node.type === 'state')
      .forEach((stateNode) => {
        // Check if state ID contains a task ID prefix (like "taskId-state-stateName")
        const stateParts = stateNode.id.split('-state-');
        if (stateParts.length > 1 && taskDefMap.has(stateParts[0])) {
          if (!statesByTaskId.has(stateParts[0])) {
            statesByTaskId.set(stateParts[0], new Set<string>());
          }
          statesByTaskId.get(stateParts[0])?.add(stateNode.id);
        }
      });
  }

  // If we still don't have relationships, use transition edges to cluster states
  if (statesByTaskId.size === 0 && stateTransitions.length > 0) {
    // Create a map of states that are linked by transitions
    const connectedStates = new Map<string, Set<string>>();

    stateTransitions.forEach((transition) => {
      if (!connectedStates.has(transition.source)) {
        connectedStates.set(transition.source, new Set<string>());
      }
      connectedStates.get(transition.source)?.add(transition.target);

      if (!connectedStates.has(transition.target)) {
        connectedStates.set(transition.target, new Set<string>());
      }
      connectedStates.get(transition.target)?.add(transition.source);
    });

    // Find connected state groups using BFS
    const visited = new Set<string>();
    const stateGroups: Set<string>[] = [];

    // Convert the Map keys to an array before iterating
    const stateIds = Array.from(connectedStates.keys());

    for (const stateId of stateIds) {
      if (!visited.has(stateId)) {
        const group = new Set<string>();
        const queue = [stateId];

        while (queue.length > 0) {
          const current = queue.shift()!;
          if (!visited.has(current)) {
            visited.add(current);
            group.add(current);

            const neighbors = connectedStates.get(current) || new Set<string>();
            // Convert the Set to an array before iterating
            const neighborArray = Array.from(neighbors);
            for (const neighbor of neighborArray) {
              if (!visited.has(neighbor)) {
                queue.push(neighbor);
              }
            }
          }
        }

        stateGroups.push(group);
      }
    }

    // Assign each state group to a task definition
    // For simplicity, we'll assign the first group to the parent task,
    // the second to the first child task, and so on
    const taskDefs = Array.from(taskDefMap.values());
    const parentTasks = taskDefs.filter((task) => task.data.type === 'parent');
    const childTasks = taskDefs.filter((task) => task.data.type === 'child');

    const availableTasks = [...parentTasks, ...childTasks];

    stateGroups.forEach((group, index) => {
      if (index < availableTasks.length) {
        const taskId = availableTasks[index].id;
        statesByTaskId.set(taskId, group);
      }
    });
  }

  // Finally, update all state nodes with their task relationships
  statesByTaskId.forEach((stateIds, taskId) => {
    enhancedNodes
      .filter((node) => node.type === 'state' && stateIds.has(node.id))
      .forEach((stateNode) => {
        stateNode.data = {
          ...stateNode.data,
          taskId: taskId,
        };
      });
  });

  // As a final fallback, if we have tasks and unassigned states,
  // distribute them among the available tasks
  const assignedStateIds = new Set<string>();
  statesByTaskId.forEach((stateIds) => {
    stateIds.forEach((id) => assignedStateIds.add(id));
  });

  const unassignedStates = enhancedNodes.filter(
    (node) => node.type === 'state' && !assignedStateIds.has(node.id)
  );

  if (unassignedStates.length > 0 && taskDefMap.size > 0) {
    const tasks = Array.from(taskDefMap.values());
    const parentTasks = tasks.filter((task) => task.data.type === 'parent');
    const childTasks = tasks.filter((task) => task.data.type === 'child');

    const availableTasks = [...parentTasks, ...childTasks];

    if (availableTasks.length > 0) {
      // Assign states evenly among tasks
      unassignedStates.forEach((stateNode, index) => {
        const taskIndex = index % availableTasks.length;
        stateNode.data = {
          ...stateNode.data,
          taskId: availableTasks[taskIndex].id,
        };
      });
    }
  }

  return enhancedNodes;
}
