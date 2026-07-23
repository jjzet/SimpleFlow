import { Node, Edge } from 'reactflow';

/**
 * Finds the parent task definition node that contains the given node
 * @param nodes All nodes in the workflow
 * @param nodeId ID of the node to find the parent for
 * @returns The parent task definition node or null if not found
 */
export function findParentTaskDefinition(
  nodes: Node[],
  nodeId: string
): Node | null {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  // If the node is already a task definition, return it
  if (node.type === 'taskDefinition') return node;

  // TODO: Implement logic to find the containing task definition
  // This will be based on position/boundaries once we implement task definition containers
  return null;
}

/**
 * Checks if two nodes are in the same task definition
 * @param nodes All nodes in the workflow
 * @param sourceId Source node ID
 * @param targetId Target node ID
 * @returns true if both nodes are in the same task definition
 */
export function areNodesInSameTask(
  nodes: Node[],
  sourceId: string,
  targetId: string
): boolean {
  const sourceParent = findParentTaskDefinition(nodes, sourceId);
  const targetParent = findParentTaskDefinition(nodes, targetId);

  // If either node doesn't have a parent, they're not in the same task
  if (!sourceParent || !targetParent) return false;

  return sourceParent.id === targetParent.id;
}

/**
 * Determines if a node is a state node
 * @param node The node to check
 * @returns true if the node is a state node
 */
export function isStateNode(node: Node): boolean {
  return node.type === 'state';
}

/**
 * Determines if a connection should be a state transition
 * @param nodes All nodes in the workflow
 * @param sourceId Source node ID
 * @param targetId Target node ID
 * @returns true if the connection should be a state transition
 */
export function shouldBeStateTransition(
  nodes: Node[],
  sourceId: string,
  targetId: string
): boolean {
  const sourceNode = nodes.find((n) => n.id === sourceId);
  const targetNode = nodes.find((n) => n.id === targetId);

  if (!sourceNode || !targetNode) return false;

  // Simply check if both nodes are state nodes
  return isStateNode(sourceNode) && isStateNode(targetNode);
}
