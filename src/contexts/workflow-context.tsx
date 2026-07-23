'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from 'reactflow';
import { ElementOption } from '@/components/workflow/element-selector';
import { nanoid } from 'nanoid';
import { shouldBeStateTransition } from '@/utils/workflow';
import { Project } from '@/types/workflow';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  TaskDefinitionCode,
  EventHandlerCode,
} from '@/lib/code-generation/types';
import { TaskDefinitionCodeGenerator } from '@/lib/code-generation/task-definition-code-generator';
import {
  WorkerCodeGenerator,
  WorkerCode,
} from '@/lib/code-generation/worker-code-generator';
import { EventHandlerCodeGenerator } from '@/lib/code-generation/event-handler-code-generator';
import { Template } from '@/types/template';
import { toast } from '@/components/ui/use-toast';

// Interface for task definition files
interface TaskDefinitionFile {
  id: string;
  name: string;
  type: 'parent' | 'child' | 'exception';
  nodeId: string;
}

// Update the default node sizes
export const nodeDefaultSizes = {
  state: { width: 120, height: 50 },
  worker: { width: 150, height: 150 },
  taskDefinition: { width: 600, height: 300 },
  eventHandler: { width: 180, height: 100 },
  default: { width: 150, height: 75 },
};

export const taskDefaultSizes = {
  parent: { width: 620, height: 320 },
  child: { width: 480, height: 280 },
  exception: { width: 400, height: 220 },
};

export interface WorkflowContextType {
  nodes: Node[];
  edges: Edge[];
  selectedElement: ElementOption | null;
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  setSelectedElement: (element: ElementOption | null) => void;
  setSelectedNode: (node: Node | null) => void;
  setSelectedEdge: (edge: Edge | null) => void;
  addNode: (type: string, position: { x: number; y: number }) => Node;
  updateNodeData: (nodeId: string, data: any) => void;
  updateEdgeData: (edgeId: string, data: any) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: OnConnect;
  deleteNodes: (nodeIds: string[]) => Promise<boolean>;
  deleteEdge: (edgeId: string) => void;
  isValidConnection: (connection: Connection) => boolean;
  addEdge: (connection: Connection) => void;
  isActionMode: boolean;
  isStateTransitionMode: boolean;
  isLinkChildTaskMode: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  projects: Project[];
  selectedProject: Project | null;
  createProject: (name: string, description: string) => void;
  selectProject: (projectId: string | null) => void;
  addTaskDefinitionFile: (
    projectId: string,
    nodeId: string,
    type: 'parent' | 'child' | 'exception',
    name: string
  ) => void;
  updateTaskDefinitionFileName: (
    projectId: string,
    fileId: string,
    newName: string
  ) => void;
  deleteTaskDefinitionFile: (projectId: string, fileId: string) => void;
  expandedFolders: Record<string, boolean>;
  toggleFolder: (projectId: string) => void;
  generateTaskDefinitionCode: (taskDefinitionId: string) => TaskDefinitionCode;
  invalidateTaskDefinitionCodeCache: (taskDefinitionId?: string) => void;
  generateWorkerCode: (workerId: string) => WorkerCode;
  invalidateWorkerCodeCache: (workerId?: string) => void;
  generateEventHandlerCode: (eventHandlerId: string) => EventHandlerCode;
  invalidateEventHandlerCodeCache: (eventHandlerId?: string) => void;
  addWorkerFile: (projectId: string, nodeId: string, name: string) => void;
  updateWorkerFileName: (
    projectId: string,
    fileId: string,
    newName: string
  ) => void;
  deleteWorkerFile: (projectId: string, fileId: string) => void;
  currentTemplate: Template | null;
  setCurrentTemplate: (template: Template | null) => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(
  undefined
);

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedElement, setSelectedElement] = useState<ElementOption | null>(
    null
  );
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<
    Record<string, boolean>
  >({});
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);

  // Instantiate the code generators
  const taskDefinitionCodeGenerator = new TaskDefinitionCodeGenerator();
  const workerCodeGenerator = new WorkerCodeGenerator();
  const eventHandlerCodeGenerator = new EventHandlerCodeGenerator();

  // Task Definition code generation
  const generateTaskDefinitionCode = useCallback(
    (taskDefinitionId: string) => {
      return taskDefinitionCodeGenerator.generateCode(
        taskDefinitionId,
        nodes,
        edges
      );
    },
    [nodes, edges, taskDefinitionCodeGenerator]
  );

  const invalidateTaskDefinitionCodeCache = useCallback(
    (taskDefinitionId?: string) => {
      // Force clear the entire cache when no specific ID is provided
      if (!taskDefinitionId) {
        taskDefinitionCodeGenerator.invalidateCache();
        console.log('Task definition code cache fully cleared');
        return;
      }

      taskDefinitionCodeGenerator.invalidateCache(taskDefinitionId, nodes);
      console.log(
        `Task definition code cache cleared for: ${taskDefinitionId}`
      );
    },
    [taskDefinitionCodeGenerator, nodes]
  );

  // Worker code generation
  const generateWorkerCode = useCallback(
    (workerId: string) => {
      return workerCodeGenerator.generateCode(workerId, nodes, edges);
    },
    [nodes, edges, workerCodeGenerator]
  );

  const invalidateWorkerCodeCache = useCallback(
    (workerId?: string) => {
      // Force clear the entire cache when no specific ID is provided
      if (!workerId) {
        workerCodeGenerator.invalidateCache();
        console.log('Worker code cache fully cleared');
        return;
      }

      workerCodeGenerator.invalidateCache(workerId, nodes);
      console.log(`Worker code cache cleared for: ${workerId}`);
    },
    [workerCodeGenerator, nodes]
  );

  // Event Handler code generation
  const generateEventHandlerCode = useCallback(
    (eventHandlerId: string) => {
      return eventHandlerCodeGenerator.generateCode(
        eventHandlerId,
        nodes,
        edges
      );
    },
    [nodes, edges, eventHandlerCodeGenerator]
  );

  const invalidateEventHandlerCodeCache = useCallback(
    (eventHandlerId?: string) => {
      // Force clear the entire cache when no specific ID is provided
      if (!eventHandlerId) {
        eventHandlerCodeGenerator.invalidateCache();
        console.log('Event handler code cache fully cleared');
        return;
      }

      eventHandlerCodeGenerator.invalidateCache(eventHandlerId, nodes);
      console.log(`Event handler code cache cleared for: ${eventHandlerId}`);
    },
    [eventHandlerCodeGenerator, nodes]
  );

  // Compute if we're in action mode or other modes
  const isActionMode = selectedElement?.type === 'action';
  const isStateTransitionMode = selectedElement?.type === 'stateTransition';
  const isLinkChildTaskMode = selectedElement?.type === 'linkChildTask';

  const onNodesChange: OnNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange: OnEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect: OnConnect = useCallback((params: Connection) => {
    // Early return if source or target is missing
    if (!params.source || !params.target) return;

    setEdges((eds) => {
      // Create new edge with required properties
      const newEdge: Edge = {
        id: `${params.source}-${params.target}`,
        source: params.source as string, // We know this is not null due to the check above
        target: params.target as string, // We know this is not null due to the check above
        sourceHandle: params.sourceHandle || undefined,
        targetHandle: params.targetHandle || undefined,
        type: 'default',
        animated: true,
        data: {}, // Add any additional edge data here
      };
      return [...eds, newEdge];
    });
  }, []);

  const toggleFolder = useCallback((projectId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  }, []);

  const createProject = useCallback((name: string, description: string) => {
    const newProject: Project = {
      id: nanoid(),
      name,
      description,
      createdAt: new Date(),
      taskDefinitions: [],
      workers: [],
    };
    setProjects((prev) => [...prev, newProject]);
    setSelectedProject(newProject);
  }, []);

  const selectProject = useCallback(
    (projectId: string | null) => {
      setSelectedProject(
        projectId ? projects.find((p) => p.id === projectId) || null : null
      );
    },
    [projects]
  );

  const addTaskDefinitionFile = useCallback(
    (
      projectId: string,
      nodeId: string,
      type: 'parent' | 'child' | 'exception',
      name: string
    ) => {
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== projectId) return project;
          return {
            ...project,
            taskDefinitions: [
              ...project.taskDefinitions,
              {
                id: nanoid(),
                name,
                type,
                nodeId,
              },
            ],
          };
        })
      );
    },
    []
  );

  const updateTaskDefinitionFileName = useCallback(
    (projectId: string, fileId: string, newName: string) => {
      // Update projects state
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== projectId) return project;
          return {
            ...project,
            taskDefinitions: project.taskDefinitions.map((file) =>
              file.id === fileId ? { ...file, name: newName } : file
            ),
          };
        })
      );

      // Also update selectedProject if it matches
      setSelectedProject((prev) => {
        if (!prev || prev.id !== projectId) return prev;
        return {
          ...prev,
          taskDefinitions: prev.taskDefinitions.map((file) =>
            file.id === fileId ? { ...file, name: newName } : file
          ),
        };
      });
    },
    []
  );

  const deleteTaskDefinitionFile = useCallback(
    (projectId: string, fileId: string) => {
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== projectId) return project;
          return {
            ...project,
            taskDefinitions: project.taskDefinitions.filter(
              (file) => file.id !== fileId
            ),
          };
        })
      );

      setSelectedProject((prev) => {
        if (!prev || prev.id !== projectId) return prev;
        return {
          ...prev,
          taskDefinitions: prev.taskDefinitions.filter(
            (file) => file.id !== fileId
          ),
        };
      });
    },
    []
  );

  const addWorkerFile = useCallback(
    (projectId: string, nodeId: string, name: string) => {
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== projectId) return project;
          return {
            ...project,
            workers: [
              ...(project.workers || []),
              {
                id: nanoid(),
                name,
                nodeId,
              },
            ],
          };
        })
      );
    },
    []
  );

  const updateWorkerFileName = useCallback(
    (projectId: string, fileId: string, newName: string) => {
      // Update projects state
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== projectId) return project;
          return {
            ...project,
            workers: project.workers.map((file) =>
              file.id === fileId ? { ...file, name: newName } : file
            ),
          };
        })
      );

      // Also update selectedProject if it matches
      setSelectedProject((prev) => {
        if (!prev || prev.id !== projectId) return prev;
        return {
          ...prev,
          workers: prev.workers.map((file) =>
            file.id === fileId ? { ...file, name: newName } : file
          ),
        };
      });
    },
    []
  );

  const deleteWorkerFile = useCallback((projectId: string, fileId: string) => {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== projectId) return project;
        return {
          ...project,
          workers: project.workers.filter((file) => file.id !== fileId),
        };
      })
    );

    setSelectedProject((prev) => {
      if (!prev || prev.id !== projectId) return prev;
      return {
        ...prev,
        workers: prev.workers.filter((file) => file.id !== fileId),
      };
    });
  }, []);

  const addNode = useCallback(
    (type: string, position: { x: number; y: number }): Node => {
      const taskVariant = selectedElement?.variant || 'parent';
      const isTask = type === 'task';
      const isWorker = type === 'worker';
      const isEventHandler = type === 'eventHandler';

      // Get default size based on node type
      const defaultSize = isTask
        ? taskDefaultSizes[taskVariant as keyof typeof taskDefaultSizes]
        : nodeDefaultSizes[type as keyof typeof nodeDefaultSizes];

      // Find the currently selected task definition node if any
      const selectedTaskDefinition = nodes.find(
        (n) => n.type === 'taskDefinition' && n.selected
      );

      const newNode: Node = {
        id: nanoid(),
        type: isTask ? 'taskDefinition' : type,
        position,
        style: defaultSize
          ? {
              width: defaultSize.width,
              height: defaultSize.height,
            }
          : undefined,
        data: {
          label: `New ${type}`,
          name: `New ${type}`,
          type: taskVariant,
          isInitial: false,
          // If this is not a task definition and we have a selected task definition,
          // set both ownerTaskDefinition (for backward compatibility) and ownerTaskDefinitionId
          ...(!isTask && selectedTaskDefinition
            ? {
                ownerTaskDefinition: {
                  scope: selectedTaskDefinition.data.scope || '',
                  code: selectedTaskDefinition.data.code || '',
                },
                ownerTaskDefinitionId: selectedTaskDefinition.id,
              }
            : {}),
        },
      };

      setNodes((nds) => [...nds, newNode]);

      // If this is a task definition node and we have a selected project, create a file
      if (isTask && selectedProject) {
        addTaskDefinitionFile(
          selectedProject.id,
          newNode.id,
          taskVariant as 'parent' | 'child' | 'exception',
          newNode.data.label
        );
      }

      // If this is a worker node and we have a selected project, create a worker file
      if (isWorker && selectedProject) {
        setProjects((prev) =>
          prev.map((project) => {
            if (project.id !== selectedProject.id) return project;
            return {
              ...project,
              workers: [
                ...(project.workers || []),
                {
                  id: nanoid(),
                  name: newNode.data.label,
                  nodeId: newNode.id,
                },
              ],
            };
          })
        );
      }

      return newNode;
    },
    [selectedElement, selectedProject, addTaskDefinitionFile, nodes]
  );

  const updateNodeData = useCallback(
    (nodeId: string, data: any) => {
      setNodes((nds) => {
        const updatedNodes = nds.map((node) => {
          if (node.id === nodeId) {
            const updatedNode = { ...node, data: { ...node.data, ...data } };

            // If this is a task definition node and scope or code changed
            if (
              node.type === 'taskDefinition' &&
              (data.scope !== undefined || data.code !== undefined)
            ) {
              const oldScope = node.data.scope;
              const oldCode = node.data.code;
              const newScope = data.scope !== undefined ? data.scope : oldScope;
              const newCode = data.code !== undefined ? data.code : oldCode;

              // Check if this would create a duplicate scope/code combination
              const duplicateTaskDefinition = nds.find(
                (n) =>
                  n.id !== nodeId && // Not the current node
                  n.type === 'taskDefinition' &&
                  n.data.scope === newScope &&
                  n.data.code === newCode
              );

              if (duplicateTaskDefinition) {
                // Show error or warning to the user about duplicate scope/code
                toast({
                  title: 'Duplicate Task Definition',
                  description: `A task definition with scope "${newScope}" and code "${newCode}" already exists. Please use a different scope or code.`,
                  variant: 'destructive',
                });
                // Return the original node without updates to prevent the duplicate
                return node;
              }

              // Update all nodes that belong to this task definition
              nds.forEach((n) => {
                // Check for both ownerTaskDefinitionId and scope/code match
                if (
                  n.data.ownerTaskDefinitionId === nodeId ||
                  (n.data.ownerTaskDefinition?.scope === oldScope &&
                    n.data.ownerTaskDefinition?.code === oldCode)
                ) {
                  n.data = {
                    ...n.data,
                    // Update the scope/code reference but keep the ID reference
                    ownerTaskDefinition: {
                      scope: newScope,
                      code: newCode,
                    },
                    // No need to update ownerTaskDefinitionId as it stays the same
                  };
                }
              });

              // Find any worker nodes that have this task definition linked as a child task
              const linkedWorkerEdge = edges.find(
                (e) => e.type === 'linkChildTask' && e.target === nodeId
              );

              if (linkedWorkerEdge) {
                nds.forEach((n) => {
                  if (n.id === linkedWorkerEdge.source) {
                    n.data = {
                      ...n.data,
                      childTask: {
                        ...n.data.childTask,
                        scope: newScope,
                        code: newCode,
                      },
                    };
                  }
                });
              }

              // Update all edges that belong to this task definition
              setEdges((currentEdges) =>
                currentEdges.map((e) => {
                  // Check for both ID and scope/code match
                  if (
                    e.data.ownerTaskDefinitionId === nodeId ||
                    (e.data.ownerTaskDefinition?.scope === oldScope &&
                      e.data.ownerTaskDefinition?.code === oldCode)
                  ) {
                    return {
                      ...e,
                      data: {
                        ...e.data,
                        ownerTaskDefinition: {
                          scope: newScope,
                          code: newCode,
                        },
                        // Keep the ID reference
                        ownerTaskDefinitionId: nodeId,
                      },
                    };
                  }
                  return e;
                })
              );

              // Invalidate code cache for this task definition node
              invalidateTaskDefinitionCodeCache(nodeId);

              // Also invalidate code cache for any linked worker nodes
              if (linkedWorkerEdge) {
                invalidateWorkerCodeCache(linkedWorkerEdge.source);
              }
            }

            // If this is a worker node and label changed, update the worker file name
            if (node.type === 'worker' && data.label !== undefined) {
              const project = projects.find((p) =>
                p.workers.some((file) => file.nodeId === nodeId)
              );
              if (project) {
                const file = project.workers.find((f) => f.nodeId === nodeId);
                if (file) {
                  setProjects((prev) =>
                    prev.map((p) => {
                      if (p.id !== project.id) return p;
                      return {
                        ...p,
                        workers: p.workers.map((w) =>
                          w.id === file.id ? { ...w, name: data.label } : w
                        ),
                      };
                    })
                  );
                }
              }
            }

            return updatedNode;
          }
          return node;
        });

        // For task definitions, update the file name if label changed
        if (data.label) {
          const node = updatedNodes.find((n) => n.id === nodeId);
          if (node?.type === 'taskDefinition') {
            const project = projects.find((p) =>
              p.taskDefinitions.some((file) => file.nodeId === nodeId)
            );
            if (project) {
              const file = project.taskDefinitions.find(
                (f) => f.nodeId === nodeId
              );
              if (file) {
                updateTaskDefinitionFileName(project.id, file.id, data.label);
              }
            }
          } else if (
            node &&
            (node.data.ownerTaskDefinitionId || node.data.ownerTaskDefinition)
          ) {
            // If a non-taskDefinition node that belongs to a parent is updated, try to invalidate the parent's cache
            // First try to find by ownerTaskDefinitionId, then fall back to scope/code
            const parentId = node.data.ownerTaskDefinitionId;
            if (parentId) {
              invalidateTaskDefinitionCodeCache(parentId);
            } else if (node.data.ownerTaskDefinition) {
              // Find the parent task definition node which matches the ownerTaskDefinition
              const parent = nds.find(
                (n) =>
                  n.type === 'taskDefinition' &&
                  n.data.scope === node.data.ownerTaskDefinition.scope &&
                  n.data.code === node.data.ownerTaskDefinition.code
              );
              if (parent) {
                invalidateTaskDefinitionCodeCache(parent.id);
              }
            }
          }
        }
        return updatedNodes;
      });

      setSelectedNode((currentNode) => {
        if (currentNode?.id === nodeId) {
          return {
            ...currentNode,
            data: { ...currentNode.data, ...data },
          };
        }
        return currentNode;
      });

      // If this is a state node and its name is being updated, update connected edges
      if (data.name) {
        setEdges((eds) => {
          return eds.map((edge) => {
            if (edge.type === 'stateTransition') {
              if (edge.source === nodeId) {
                return {
                  ...edge,
                  data: { ...edge.data, sourceState: data.name },
                };
              }
              if (edge.target === nodeId) {
                return {
                  ...edge,
                  data: { ...edge.data, targetState: data.name },
                };
              }
            }
            return edge;
          });
        });
      }
    },
    [
      edges,
      projects,
      updateTaskDefinitionFileName,
      invalidateTaskDefinitionCodeCache,
      invalidateWorkerCodeCache,
      toast,
    ]
  );

  const updateEdgeData = useCallback((edgeId: string, data: any) => {
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === edgeId ? { ...edge, data: { ...edge.data, ...data } } : edge
      )
    );

    // Update selected edge to trigger immediate UI update
    setSelectedEdge((currentEdge) => {
      if (currentEdge?.id === edgeId) {
        return {
          ...currentEdge,
          data: { ...currentEdge.data, ...data },
        };
      }
      return currentEdge;
    });
  }, []);

  const deleteNodes = useCallback(
    async (nodeIds: string[]) => {
      try {
        // First, find any task definition nodes that are being deleted
        const nodesToDelete = nodes.filter((node) => nodeIds.includes(node.id));
        const taskDefinitionNodes = nodesToDelete.filter(
          (node) => node.type === 'taskDefinition'
        );
        const workerNodes = nodesToDelete.filter(
          (node) => node.type === 'worker'
        );

        // If we have task definition nodes, show confirmation modal
        if (taskDefinitionNodes.length > 0 || workerNodes.length > 0) {
          const confirmDelete = await confirm(
            `Are you sure you want to delete ${taskDefinitionNodes.length} task definition${
              taskDefinitionNodes.length > 1 ? 's' : ''
            }${
              workerNodes.length > 0
                ? ` and ${workerNodes.length} worker${
                    workerNodes.length > 1 ? 's' : ''
                  }`
                : ''
            }? This will also remove the associated file${
              taskDefinitionNodes.length + workerNodes.length > 1 ? 's' : ''
            }.`
          );

          if (!confirmDelete) {
            return false;
          }

          // Delete task definition files
          const projectWithTaskFiles = projects.find((project) =>
            project.taskDefinitions.some((file) =>
              taskDefinitionNodes.some((node) => node.id === file.nodeId)
            )
          );

          if (projectWithTaskFiles) {
            taskDefinitionNodes.forEach((node) => {
              const file = projectWithTaskFiles.taskDefinitions.find(
                (file) => file.nodeId === node.id
              );
              if (file) {
                deleteTaskDefinitionFile(projectWithTaskFiles.id, file.id);
              }
            });
          }

          // Delete worker files
          const projectWithWorkerFiles = projects.find((project) =>
            project.workers.some((file) =>
              workerNodes.some((node) => node.id === file.nodeId)
            )
          );

          if (projectWithWorkerFiles) {
            workerNodes.forEach((node) => {
              const file = projectWithWorkerFiles.workers.find(
                (file) => file.nodeId === node.id
              );
              if (file) {
                setProjects((prev) =>
                  prev.map((p) => {
                    if (p.id !== projectWithWorkerFiles.id) return p;
                    return {
                      ...p,
                      workers: p.workers.filter((w) => w.id !== file.id),
                    };
                  })
                );
              }
            });
          }
        }

        // Only remove nodes if either:
        // 1. There were no task definition/worker nodes, or
        // 2. The user confirmed the deletion
        setNodes((nds) => nds.filter((node) => !nodeIds.includes(node.id)));
        setEdges((eds) =>
          eds.filter(
            (edge) =>
              !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
          )
        );
        setSelectedNode((node) =>
          node && nodeIds.includes(node.id) ? null : node
        );
        return true;
      } catch (error) {
        console.error('Error deleting nodes:', error);
        return false;
      }
    },
    [nodes, projects, deleteTaskDefinitionFile, confirm]
  );

  const deleteEdge = useCallback((edgeId: string) => {
    setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
    setSelectedEdge((edge) => (edge?.id === edgeId ? null : edge));
  }, []);

  const isValidConnection = useCallback(
    (connection: Connection): boolean => {
      console.log('Validating connection:', connection);
      if (!connection.source || !connection.target) return false;

      // Get the source and target nodes
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      console.log('Source node:', sourceNode);
      console.log('Target node:', targetNode);

      if (!sourceNode || !targetNode) return false;

      // If we're in link child task mode
      if (isLinkChildTaskMode) {
        // Source must be a worker
        if (sourceNode.type !== 'worker') return false;

        // Target must be a child or exception task
        if (
          targetNode.type !== 'taskDefinition' ||
          (targetNode.data.type !== 'child' &&
            targetNode.data.type !== 'exception')
        ) {
          return false;
        }

        // Check if worker already has a link
        const existingLink = edges.find(
          (e) => e.type === 'linkChildTask' && e.source === sourceNode.id
        );
        if (existingLink) return false;

        // Check if target task already has a link
        const existingTargetLink = edges.find(
          (e) => e.type === 'linkChildTask' && e.target === targetNode.id
        );
        if (existingTargetLink) return false;

        return true;
      }

      // If we're in action mode, validate action connections
      if (isActionMode) {
        // Source must be a state
        if (sourceNode.type !== 'state') return false;

        // Target can be a worker or any type of task definition
        return (
          targetNode.type === 'worker' || targetNode.type === 'taskDefinition'
        );
      }

      // If we're in state transition mode, validate state transitions
      if (isStateTransitionMode) {
        // Only allow connections between states
        if (sourceNode.type !== 'state' || targetNode.type !== 'state')
          return false;

        // Check if states belong to different task definitions
        const sourceOwner = sourceNode.data.ownerTaskDefinition;
        const targetOwner = targetNode.data.ownerTaskDefinition;

        // If source has an owner, target must have the same owner
        if (sourceOwner && targetOwner) {
          // More permissive check - if both have owners, they should match, but allow for undefined values
          return (
            (sourceOwner.scope === targetOwner.scope ||
              !sourceOwner.scope ||
              !targetOwner.scope) &&
            (sourceOwner.code === targetOwner.code ||
              !sourceOwner.code ||
              !targetOwner.code)
          );
        }

        // If source has no owner, target should also have no owner
        if (!sourceOwner || !targetOwner) return true;

        // If one has an owner and the other doesn't, prevent connection
        return false;
      }

      // Handle event handler connections
      if (
        sourceNode.type === 'eventHandler' &&
        targetNode.type === 'taskDefinition'
      ) {
        // Check if event handler already has a connection
        const existingLink = edges.find((e) => e.source === sourceNode.id);
        if (existingLink) return false;

        return true;
      }

      // Don't allow connections if not in either mode
      return false;
    },
    [nodes, edges, isActionMode, isStateTransitionMode, isLinkChildTaskMode]
  );

  const addEdge = useCallback(
    (connection: Connection) => {
      console.log('Adding edge:', connection);
      if (!connection.source || !connection.target) return;

      // Get source and target nodes
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return;

      // Handle link child task edge
      if (isLinkChildTaskMode) {
        const newEdge: Edge = {
          id: nanoid(),
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          type: 'linkChildTask',
          animated: false,
          data: {
            workerId: connection.source,
            childTaskId: connection.target,
          },
        };

        // Update the worker node with the linked child task ID
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === connection.source) {
              // If worker doesn't have child task config, create it
              if (!node.data.childTask) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    childTask: {
                      scope: targetNode.data.scope || '',
                      code: targetNode.data.code || '',
                      initialTrigger: 'start',
                      fieldMappings: [],
                    },
                    linkedChildTaskId: connection.target,
                  },
                };
              }
              // If it has config, just update the scope, code and linked ID
              return {
                ...node,
                data: {
                  ...node.data,
                  childTask: {
                    ...node.data.childTask,
                    scope: targetNode.data.scope || '',
                    code: targetNode.data.code || '',
                  },
                  linkedChildTaskId: connection.target,
                },
              };
            }
            return node;
          })
        );

        setEdges((eds) => [...eds, newEdge]);

        // Only clear the selected element if we're not in state transition mode
        // This allows users to create multiple state transitions without reselecting the mode
        if (!isStateTransitionMode) {
          setSelectedElement(null);
        }
        return;
      }

      // Handle event handler edge
      if (
        sourceNode.type === 'eventHandler' &&
        targetNode.type === 'taskDefinition'
      ) {
        // Ensure we have valid task definition data
        const taskDefinitionScope = targetNode.data.scope || '';
        const taskDefinitionCode = targetNode.data.code || '';

        const newEdge: Edge = {
          id: nanoid(),
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          type: 'eventHandler',
          animated: false,
          style: {
            stroke: '#3b82f6', // blue-500
            strokeWidth: 2,
            zIndex: 1000,
          },
          data: {
            ownerTaskDefinition: targetNode.data.ownerTaskDefinition,
            sourceNodeId: connection.source,
            targetNodeId: connection.target,
            // Also store task definition data in the edge
            taskDefinitionId: {
              scope: taskDefinitionScope,
              code: taskDefinitionCode,
            },
          },
        };
        // Update the event handler node with the task definition ID
        setNodes((nds) => {
          const updatedNodes = nds.map((node) => {
            if (node.id === connection.source) {
              const updatedNode = {
                ...node,
                data: {
                  ...node.data,
                  taskDefinitionId: {
                    scope: taskDefinitionScope,
                    code: taskDefinitionCode,
                  },
                  ownerTaskDefinition: targetNode.data.ownerTaskDefinition || {
                    scope: taskDefinitionScope,
                    code: taskDefinitionCode,
                  },
                  // Set default initial trigger if not already set
                  initialTrigger: node.data.initialTrigger || 'start',
                },
              };
              return updatedNode;
            }
            return node;
          });
          return updatedNodes;
        });
        setEdges((eds) => [...eds, newEdge]);

        // Only clear the selected element if we're not in state transition mode
        // This allows users to create multiple state transitions without reselecting the mode
        if (!isStateTransitionMode) {
          setSelectedElement(null);
        }
        return;
      }

      // Handle other edge types
      const newEdge: Edge = {
        id: nanoid(),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: isStateTransitionMode ? 'stateTransition' : 'action',
        animated: !isStateTransitionMode,
        style: {
          stroke: isStateTransitionMode ? '#000000' : '#9333ea',
          strokeWidth: isStateTransitionMode ? 1 : 3,
          zIndex: 1000,
        },
        data: {
          ...(isStateTransitionMode
            ? {
                sourceState: sourceNode.data.name || '',
                targetState: targetNode.data.name || '',
                ownerTaskDefinition: sourceNode.data.ownerTaskDefinition,
              }
            : {
                name: 'New Action',
                actionType:
                  targetNode.type === 'worker'
                    ? 'RunWorker'
                    : targetNode.type === 'taskDefinition' &&
                        targetNode.data.type === 'parent'
                      ? 'TriggerParentTask'
                      : 'CreateChildTasks',
                ownerTaskDefinition: sourceNode.data.ownerTaskDefinition,
                ...(targetNode.type === 'worker' && {
                  workerId: {
                    scope: targetNode.data.scope || '',
                    code: targetNode.data.code || '',
                  },
                }),
                ...(targetNode.type === 'taskDefinition' && {
                  taskDefinitionId: {
                    scope: targetNode.data.scope || '',
                    code: targetNode.data.code || '',
                  },
                }),
              }),
        },
      };

      setEdges((eds) => [...eds, newEdge]);

      // Force a re-render of nodes when in state transition mode to update handle internals
      if (isStateTransitionMode) {
        setNodes((nds) => [...nds]);
      }

      // Only clear the selected element if we're not in state transition mode
      if (!isStateTransitionMode) {
        setSelectedElement(null);
      }
    },
    [nodes, isStateTransitionMode, isLinkChildTaskMode, setSelectedElement]
  );

  const value = {
    nodes,
    edges,
    selectedElement,
    selectedNode,
    selectedEdge,
    setSelectedElement,
    setSelectedNode,
    setSelectedEdge,
    addNode,
    updateNodeData,
    updateEdgeData,
    onNodesChange,
    onEdgesChange,
    onConnect,
    deleteNodes,
    deleteEdge,
    isValidConnection,
    addEdge,
    isActionMode,
    isStateTransitionMode,
    isLinkChildTaskMode,
    isSidebarOpen,
    setIsSidebarOpen,
    projects,
    selectedProject,
    createProject,
    selectProject,
    addTaskDefinitionFile,
    updateTaskDefinitionFileName,
    deleteTaskDefinitionFile,
    expandedFolders,
    toggleFolder,
    generateTaskDefinitionCode,
    invalidateTaskDefinitionCodeCache,
    generateWorkerCode,
    invalidateWorkerCodeCache,
    generateEventHandlerCode,
    invalidateEventHandlerCodeCache,
    addWorkerFile,
    updateWorkerFileName,
    deleteWorkerFile,
    currentTemplate,
    setCurrentTemplate,
  };

  return (
    <WorkflowContext.Provider value={value}>
      <ConfirmDialog />
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}
