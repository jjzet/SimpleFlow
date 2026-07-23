import { Node, Edge } from 'reactflow';
import {
  taskDefaultSizes,
  nodeDefaultSizes,
} from '@/contexts/workflow-context';

export interface LayoutOptions {
  parentChildHorizontalSpacing?: number;
  parentChildVerticalSpacing?: number;
  siblingVerticalSpacing?: number;
  siblingHorizontalSpacing?: number;
  stateHorizontalSpacing?: number;
  stateVerticalSpacing?: number;
  taskPadding?: number;
}

const defaultLayoutOptions: LayoutOptions = {
  parentChildHorizontalSpacing: 80,
  parentChildVerticalSpacing: 200,
  siblingVerticalSpacing: 280,
  siblingHorizontalSpacing: 100,
  stateHorizontalSpacing: 120,
  stateVerticalSpacing: 80,
  taskPadding: 50,
};

interface TaskNodeGroup {
  taskNode: Node;
  stateNodes: Node[];
  workerNodes: Node[];
  childTaskGroups: TaskNodeGroup[];
}

/**
 * Hierarchical Layout Engine for workflow templates
 * Organizes nodes into a hierarchical structure with proper parent-child relationships
 */
export class HierarchicalLayoutEngine {
  private options: LayoutOptions;

  constructor(options: LayoutOptions = {}) {
    this.options = { ...defaultLayoutOptions, ...options };
  }

  /**
   * Apply hierarchical layout to a collection of nodes and edges
   */
  public applyLayout(
    nodes: Node[],
    edges: Edge[]
  ): { nodes: Node[]; edges: Edge[] } {
    // Clone the nodes to avoid mutating the original
    const processedNodes = JSON.parse(JSON.stringify(nodes)) as Node[];

    // Group nodes by their hierarchical relationships
    const groupedNodes = this.groupNodesByHierarchy(processedNodes, edges);

    // Calculate positions for each node based on hierarchy
    this.calculatePositions(groupedNodes);

    // Return the positioned nodes and original edges
    return {
      nodes: processedNodes,
      edges,
    };
  }

  /**
   * Group nodes by their hierarchical relationships
   * Parent tasks -> Child tasks -> Exception tasks, with their associated states and workers
   */
  private groupNodesByHierarchy(nodes: Node[], edges: Edge[]): TaskNodeGroup[] {
    // Identify task definition nodes
    const taskNodes = nodes.filter((node) => node.type === 'taskDefinition');
    const stateNodes = nodes.filter((node) => node.type === 'state');
    const workerNodes = nodes.filter((node) => node.type === 'worker');

    // Find parent tasks (those that don't have edges pointing to other task definitions)
    const childLinkedEdges = edges.filter(
      (edge) => edge.type === 'linkChildTask'
    );

    // Tasks that are targets of linkChildTask edges are parent tasks
    const parentTaskIds = new Set(childLinkedEdges.map((edge) => edge.target));

    // Tasks that are sources of linkChildTask edges are child tasks
    const childTaskIds = new Set(childLinkedEdges.map((edge) => edge.source));

    // Find root parent tasks (those that aren't child tasks)
    const rootParentTasks = taskNodes.filter(
      (node) =>
        parentTaskIds.has(node.id) &&
        !childTaskIds.has(node.id) &&
        node.data.type === 'parent'
    );

    // If we couldn't find root parent tasks with the above method, just look for nodes with type 'parent'
    if (rootParentTasks.length === 0) {
      const parentTypeNodes = taskNodes.filter(
        (node) => node.data.type === 'parent'
      );
      if (parentTypeNodes.length > 0) {
        // Use the first parent task as the root
        return [
          this.createTaskNodeGroup(
            parentTypeNodes[0],
            taskNodes,
            stateNodes,
            workerNodes,
            edges
          ),
        ];
      }
    }

    // Create hierarchical structure starting with parent tasks
    return rootParentTasks.map((parentTask) =>
      this.createTaskNodeGroup(
        parentTask,
        taskNodes,
        stateNodes,
        workerNodes,
        edges
      )
    );
  }

  /**
   * Create a task node group containing the task node itself and any associated
   * state nodes, worker nodes, and child task groups
   */
  private createTaskNodeGroup(
    taskNode: Node,
    taskNodes: Node[],
    stateNodes: Node[],
    workerNodes: Node[],
    edges: Edge[]
  ): TaskNodeGroup {
    // Find state nodes that belong to this task
    const taskStates = stateNodes.filter((state) => {
      // Check for explicit taskId property
      if (state.data.taskId === taskNode.id) {
        return true;
      }

      // Check for matching owner task definition
      if (state.data.ownerTaskDefinition) {
        return (
          state.data.ownerTaskDefinition.scope === taskNode.data.scope &&
          state.data.ownerTaskDefinition.code === taskNode.data.code
        );
      }

      return false;
    });

    // Find worker nodes that belong to this task
    const taskWorkers = workerNodes.filter((worker) => {
      // Check for explicit taskId property
      if (worker.data.taskId === taskNode.id) {
        return true;
      }

      // Check for matching owner task definition
      if (worker.data.ownerTaskDefinition) {
        return (
          worker.data.ownerTaskDefinition.scope === taskNode.data.scope &&
          worker.data.ownerTaskDefinition.code === taskNode.data.code
        );
      }

      return false;
    });

    // Find child tasks linked to this task
    const childTaskIds = edges
      .filter(
        (edge) => edge.type === 'linkChildTask' && edge.target === taskNode.id
      )
      .map((edge) => edge.source);

    const childTasks = taskNodes.filter((node) =>
      childTaskIds.includes(node.id)
    );

    // If we couldn't find child tasks with the above method, let's try finding child type tasks
    // This is a fallback in case the linkChildTask edges aren't properly defined
    if (childTasks.length === 0 && taskNode.data.type === 'parent') {
      const childTypeNodes = taskNodes.filter(
        (node) => node.data.type === 'child' && node.id !== taskNode.id
      );

      // If we find child type nodes, add them as children
      if (childTypeNodes.length > 0) {
        childTypeNodes.forEach((childNode) => {
          childTasks.push(childNode);
        });
      }
    }

    // Recursively create groups for child tasks
    const childTaskGroups = childTasks.map((childTask) =>
      this.createTaskNodeGroup(
        childTask,
        taskNodes,
        stateNodes,
        workerNodes,
        edges
      )
    );

    return {
      taskNode,
      stateNodes: taskStates,
      workerNodes: taskWorkers,
      childTaskGroups,
    };
  }

  /**
   * Calculate positions for all nodes based on their hierarchical structure
   */
  private calculatePositions(
    groups: TaskNodeGroup[],
    startX = 100,
    startY = 100
  ): void {
    let currentX = startX;
    let currentY = startY;

    groups.forEach((group) => {
      // Calculate sizes needed for states and workers
      const stateRowsRequired = Math.ceil(group.stateNodes.length / 3);
      const workerRowsRequired = Math.ceil(group.workerNodes.length / 2);

      // Calculate minimum size required for the task container
      const requiredWidth = Math.max(
        // At least 3 states wide (or fewer if we have less than 3 states)
        Math.min(3, group.stateNodes.length) * nodeDefaultSizes.state.width +
          (Math.min(3, group.stateNodes.length) - 1) *
            this.options.stateHorizontalSpacing! +
          2 * this.options.taskPadding!,
        // Also consider workers width
        Math.min(2, group.workerNodes.length) * nodeDefaultSizes.worker.width +
          (Math.min(2, group.workerNodes.length) - 1) *
            this.options.siblingHorizontalSpacing! +
          2 * this.options.taskPadding!,
        // Ensure minimum width
        taskDefaultSizes[
          group.taskNode.data.type as keyof typeof taskDefaultSizes
        ].width
      );

      const requiredHeight =
        this.options.taskPadding! +
        stateRowsRequired * nodeDefaultSizes.state.height +
        (stateRowsRequired - 1) * this.options.stateVerticalSpacing! +
        (workerRowsRequired > 0
          ? this.options.stateVerticalSpacing! +
            workerRowsRequired * nodeDefaultSizes.worker.height +
            (workerRowsRequired - 1) * this.options.stateVerticalSpacing!
          : 0) +
        this.options.taskPadding!;

      // Update task node size
      const taskSize = {
        width: Math.max(
          requiredWidth,
          taskDefaultSizes[
            group.taskNode.data.type as keyof typeof taskDefaultSizes
          ].width
        ),
        height: Math.max(
          requiredHeight,
          taskDefaultSizes[
            group.taskNode.data.type as keyof typeof taskDefaultSizes
          ].height
        ),
      };

      group.taskNode.style = {
        ...group.taskNode.style,
        width: taskSize.width,
        height: taskSize.height,
      };

      // Position the main task node
      this.setNodePosition(group.taskNode, currentX, currentY);

      // Position the state nodes in rows inside the task
      // Start from the top with padding
      let stateX = currentX + this.options.taskPadding!;
      let stateY = currentY + this.options.taskPadding! + 20; // Add extra padding for the task label
      let stateCount = 0;

      // Sort states to try to keep a logical order (initial states first)
      const sortedStates = [...group.stateNodes].sort((a, b) => {
        // Put "Pending" or similar initial states first
        const initialStateNames = ['Pending', 'Initial', 'Start'];
        const aIsInitial = initialStateNames.some((name) =>
          a.data.label.includes(name)
        );
        const bIsInitial = initialStateNames.some((name) =>
          b.data.label.includes(name)
        );

        if (aIsInitial && !bIsInitial) return -1;
        if (!aIsInitial && bIsInitial) return 1;
        return 0;
      });

      sortedStates.forEach((stateNode) => {
        // Update state position
        this.setNodePosition(stateNode, stateX, stateY);

        // Move to next position
        stateCount++;
        if (stateCount % 3 === 0) {
          // Start a new row
          stateX = currentX + this.options.taskPadding!;
          stateY +=
            nodeDefaultSizes.state.height + this.options.stateVerticalSpacing!;
        } else {
          // Move to next column
          stateX +=
            nodeDefaultSizes.state.width + this.options.stateHorizontalSpacing!;
        }
      });

      // Position the worker nodes below the states
      // Reset for worker positioning
      let workerX = currentX + this.options.taskPadding!;
      let workerY =
        stateY +
        (stateCount > 0
          ? (stateCount % 3 === 0 ? 0 : nodeDefaultSizes.state.height) +
            this.options.stateVerticalSpacing!
          : 0);
      let workerCount = 0;

      group.workerNodes.forEach((workerNode) => {
        // Update worker position
        this.setNodePosition(workerNode, workerX, workerY);

        // Move to next position
        workerCount++;
        if (workerCount % 2 === 0) {
          // Start a new row
          workerX = currentX + this.options.taskPadding!;
          workerY +=
            nodeDefaultSizes.worker.height + this.options.stateVerticalSpacing!;
        } else {
          // Move to next column
          workerX +=
            nodeDefaultSizes.worker.width +
            this.options.siblingHorizontalSpacing!;
        }
      });

      // Position child task groups in a vertical flow below this task
      if (group.childTaskGroups.length > 0) {
        const childStartX = currentX + taskSize.width / 2; // Center align with parent
        const childStartY =
          currentY + taskSize.height + this.options.parentChildVerticalSpacing!;

        // Start child tasks in a vertical arrangement
        let childY = childStartY;

        group.childTaskGroups.forEach((childGroup, index) => {
          const childX = childStartX;

          // Calculate child position
          this.calculatePositions([childGroup], childX, childY);

          // Update vertical position for next child task
          if (index < group.childTaskGroups.length - 1) {
            // Get the height of the current child task including all its descendants
            const childTaskHeight =
              childGroup.taskNode.style?.height ||
              taskDefaultSizes[
                childGroup.taskNode.data.type as keyof typeof taskDefaultSizes
              ].height;

            childY +=
              (childTaskHeight as number) +
              this.options.siblingVerticalSpacing!;
          }
        });
      }

      // Update currentY for next sibling task
      // Calculate how much vertical space this task and its children took
      const taskHeight = taskSize.height;
      const childrenHeight = this.calculateChildrenHeight(group);

      currentY +=
        taskHeight + childrenHeight + this.options.siblingVerticalSpacing!;
    });
  }

  /**
   * Calculate the total height taken by children of a task group
   */
  private calculateChildrenHeight(group: TaskNodeGroup): number {
    if (group.childTaskGroups.length === 0) {
      return 0;
    }

    let totalHeight = this.options.parentChildVerticalSpacing!;
    let prevChildHeight = 0;

    group.childTaskGroups.forEach((childGroup, index) => {
      const childHeight =
        childGroup.taskNode.style?.height ||
        taskDefaultSizes[
          childGroup.taskNode.data.type as keyof typeof taskDefaultSizes
        ].height;

      totalHeight +=
        prevChildHeight +
        (index > 0 ? this.options.siblingVerticalSpacing! : 0);
      prevChildHeight = childHeight as number;

      // Add height of this child's children
      totalHeight += this.calculateChildrenHeight(childGroup);
    });

    return totalHeight;
  }

  /**
   * Set the position of a node
   */
  private setNodePosition(node: Node, x: number, y: number): void {
    node.position = { x, y };
  }

  /**
   * Calculate the maximum depth of child tasks for vertical spacing
   */
  private getMaxChildDepth(group: TaskNodeGroup): number {
    if (group.childTaskGroups.length === 0) {
      return 0;
    }

    return (
      1 +
      Math.max(
        ...group.childTaskGroups.map((childGroup) =>
          this.getMaxChildDepth(childGroup)
        )
      )
    );
  }
}
