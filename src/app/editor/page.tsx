'use client';

import React, { useState } from 'react';
import {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  ReactFlowProvider,
} from 'reactflow';
import { WorkflowCanvas } from '@/components/workflow/workflow-canvas';
import { ElementSelector } from '@/components/workflow/element-selector';
import { WorkflowSidebar } from '@/components/workflow/workflow-sidebar';
import {
  WorkflowProvider,
  taskDefaultSizes,
  nodeDefaultSizes,
} from '@/contexts/workflow-context';
import { SidebarProvider } from '@/components/ui/sidebar';
import { WorkflowToolsMenu } from '@/components/workflow/workflow-tools-menu';
import { TemplateModal } from '@/components/workflow/template-modal';
import { SaveTemplateModal } from '@/components/workflow/save-template-modal';
import { useToast } from '@/components/ui/use-toast';
import { templateService } from '@/lib/services/template-service';
import { Template } from '@/types/template';
import { useWorkflow } from '@/contexts/workflow-context';
import { useAuth } from '@/hooks/useAuth';
import { nanoid } from 'nanoid';
import { HierarchicalLayoutEngine } from '@/lib/layout/hierarchical-layout-engine';
import { enhanceNodesWithRelationships } from '@/lib/layout/node-relationship-enhancer';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

// Remove the props interface
interface WorkflowEditorContentProps {
  currentTemplate: Template | null;
  onTemplateChange: (template: Template | null) => void;
}

function WorkflowEditorContent({
  currentTemplate,
  onTemplateChange,
}: WorkflowEditorContentProps) {
  const [isCodeView, setIsCodeView] = React.useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = React.useState(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] =
    React.useState(false);
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { nodes, edges, onNodesChange, onEdgesChange, setCurrentTemplate } =
    useWorkflow();
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);

  // Synchronize the external template prop with the workflow context
  React.useEffect(() => {
    if (currentTemplate) {
      setCurrentTemplate(currentTemplate);
    }
  }, [currentTemplate, setCurrentTemplate]);

  // Load templates when the component mounts
  React.useEffect(() => {
    const loadTemplates = async () => {
      try {
        const templates = await templateService.getAllTemplates();
        setTemplates(templates);
      } catch (error) {
        console.error('Error loading templates:', error);
        toast({
          title: 'Error loading templates',
          description:
            'There was an error loading the templates. Please try again.',
          variant: 'destructive',
        });
      }
    };

    loadTemplates();
  }, [toast]);

  const clearWorkflow = () => {
    onNodesChange(
      nodes.map((node) => ({ type: 'remove' as const, id: node.id }))
    );
    onEdgesChange(
      edges.map((edge) => ({ type: 'remove' as const, id: edge.id }))
    );
  };

  // Function to process task definition and generate state nodes and transitions
  const processTaskDefinition = (
    taskNode: Node
  ): { nodes: Node[]; edges: Edge[] } => {
    // Log the task node style to help with debugging
    console.log('Processing task definition with style:', taskNode.style);

    // Extract width and height from style if available
    const savedSize =
      taskNode.style &&
      typeof taskNode.style.width === 'number' &&
      typeof taskNode.style.height === 'number'
        ? { width: taskNode.style.width, height: taskNode.style.height }
        : undefined;

    const result: { nodes: Node[]; edges: Edge[] } = {
      // Preserve the original task node with all its properties, including style
      nodes: [
        {
          ...taskNode,
          // Store the size in the node data for the TaskDefinitionNode component to use
          data: {
            ...taskNode.data,
            savedSize: savedSize,
          },
          // Ensure we keep the original style exactly as is
          style: taskNode.style
            ? { ...taskNode.style }
            : {
                width:
                  taskDefaultSizes[
                    taskNode.data.type as keyof typeof taskDefaultSizes
                  ]?.width,
                height:
                  taskDefaultSizes[
                    taskNode.data.type as keyof typeof taskDefaultSizes
                  ]?.height,
              },
        },
      ],
      edges: [],
    };

    if (!taskNode.data.states) return result;

    // Calculate positions for state nodes
    const stateSpacing = 150;
    // Get the task width, ensuring it's a number
    const taskWidth =
      taskNode.style && typeof taskNode.style.width === 'number'
        ? taskNode.style.width
        : taskDefaultSizes[taskNode.data.type as keyof typeof taskDefaultSizes]
            ?.width || 200;

    const startX = taskNode.position.x + taskWidth + 100;
    const startY = taskNode.position.y;

    // Create state nodes
    const stateNodes: Node[] = taskNode.data.states.map(
      (
        state: { name: string; position?: { x: number; y: number } },
        index: number
      ) => {
        // Check if the state has a saved position in the template
        const position = state.position || {
          x: startX,
          y: startY + index * stateSpacing,
        };

        return {
          id: `${taskNode.id}-state-${state.name}`,
          type: 'state',
          position,
          data: {
            label: state.name,
            name: state.name,
            isInitial: index === 0, // First state is initial
            ownerTaskDefinition: {
              scope: taskNode.data.scope,
              code: taskNode.data.code,
            },
          },
        };
      }
    );

    // Add state nodes
    result.nodes.push(...stateNodes);

    // Process transitions if they exist
    if (taskNode.data.transitions) {
      taskNode.data.transitions.forEach((transition: any) => {
        const sourceNode = stateNodes.find(
          (n) => n.data.name === transition.fromState
        );
        const targetNode = stateNodes.find(
          (n) => n.data.name === transition.toState
        );

        if (sourceNode && targetNode) {
          // Create state transition edge
          const edge: Edge = {
            id: `${sourceNode.id}-to-${targetNode.id}`,
            source: sourceNode.id,
            target: targetNode.id,
            type: 'stateTransition',
            // Check if there's a saved style for this edge in the template
            style: transition.edgeStyle || {
              stroke: '#000000',
              strokeWidth: 1,
              zIndex: 1000,
            },
            data: {
              trigger: transition.trigger,
              guard: transition.guard,
              ownerTaskDefinition: {
                scope: taskNode.data.scope,
                code: taskNode.data.code,
              },
            },
          };
          result.edges.push(edge);

          // If there's an action, create worker node and action edge
          if (transition.action) {
            const actionConfig = taskNode.data.actions?.find(
              (a: any) => a.name === transition.action
            );
            if (
              actionConfig &&
              actionConfig.actionDetails.type === 'RunWorker'
            ) {
              const workerId = actionConfig.actionDetails.workerId;

              // Check if the worker has a saved position in the template
              const workerPosition = transition.workerPosition || {
                x: startX + 300,
                y: (sourceNode.position.y + targetNode.position.y) / 2,
              };

              const workerNode: Node = {
                id: `${taskNode.id}-worker-${transition.action}`,
                type: 'worker',
                position: workerPosition,
                // Preserve worker node style if it exists
                style: transition.workerStyle,
                data: {
                  label: transition.action,
                  scope: workerId.scope,
                  code: workerId.code,
                  ownerTaskDefinition: {
                    scope: taskNode.data.scope,
                    code: taskNode.data.code,
                  },
                },
              };
              result.nodes.push(workerNode);

              // Create action edge
              const actionEdge: Edge = {
                id: `${sourceNode.id}-action-${workerNode.id}`,
                source: sourceNode.id,
                target: workerNode.id,
                type: 'action',
                animated: true,
                // Check if there's a saved style for this action edge in the template
                style: transition.actionEdgeStyle || {
                  stroke: '#9333ea',
                  strokeWidth: 3,
                  zIndex: 1000,
                },
                data: {
                  name: transition.action,
                  actionType: 'RunWorker',
                  ownerTaskDefinition: {
                    scope: taskNode.data.scope,
                    code: taskNode.data.code,
                  },
                },
              };
              result.edges.push(actionEdge);
            }
          }
        }
      });
    }

    return result;
  };

  const applyWorkflowData = (newNodes: Node[], newEdges: Edge[]) => {
    console.log('Applying template data:', { newNodes, newEdges });

    // Log task definition styles for debugging
    const taskDefinitionNodes = newNodes.filter(
      (node) => node.type === 'taskDefinition'
    );
    console.log(
      'Task definition nodes with styles:',
      taskDefinitionNodes.map((node) => ({
        id: node.id,
        type: node.type,
        style: node.style,
      }))
    );

    // Clear existing workflow first
    clearWorkflow();

    // In case newEdges is undefined, default it to an empty array
    const safeEdges = newEdges || [];

    // Process nodes to ensure they have the correct types and sizes
    const processedNodes: Node[] = [];
    const processedEdges: Edge[] = [];

    // Process each task definition and generate its workflow components
    newNodes.forEach((node) => {
      if (node.type === 'taskDefinition') {
        // Create a deep copy of the node with its style to ensure it's preserved
        const nodeWithPreservedStyle = {
          ...node,
          style: node.style
            ? JSON.parse(JSON.stringify(node.style))
            : undefined,
        };
        const { nodes: taskNodes, edges: taskEdges } = processTaskDefinition(
          nodeWithPreservedStyle
        );
        processedNodes.push(...taskNodes);
        processedEdges.push(...taskEdges);
      } else {
        // For non-task definition nodes, preserve all properties including style
        processedNodes.push({
          ...node,
          id: node.id || nanoid(),
          type: node.type || 'default',
          // Preserve the original position from the template
          position: node.position || { x: 0, y: 0 },
          data: {
            ...node.data,
            label: node.data.label || 'Node',
          },
          // Preserve the original style if it exists, otherwise use default sizes
          style:
            node.style ||
            (nodeDefaultSizes[node.type as keyof typeof nodeDefaultSizes]
              ? {
                  width:
                    nodeDefaultSizes[node.type as keyof typeof nodeDefaultSizes]
                      .width,
                  height:
                    nodeDefaultSizes[node.type as keyof typeof nodeDefaultSizes]
                      .height,
                }
              : undefined),
        });
      }
    });

    // Add any additional edges from the template
    processedEdges.push(
      ...safeEdges.map((edge) => ({
        ...edge,
        id: edge.id || nanoid(),
        type: edge.type || 'default',
        animated:
          edge.animated !== undefined
            ? edge.animated
            : edge.type !== 'stateTransition',
        // Preserve the original style if it exists, otherwise use default styles
        style: edge.style || {
          stroke: edge.type === 'stateTransition' ? '#000000' : '#9333ea',
          strokeWidth: edge.type === 'stateTransition' ? 1 : 3,
          zIndex: 1000,
        },
      }))
    );

    // Skip the hierarchical layout and use the original positions from the template
    const positionedNodes = processedNodes;
    const positionedEdges = processedEdges;

    // Add nodes with a slight delay to ensure the clear operation is complete
    setTimeout(() => {
      // Add positioned nodes
      onNodesChange(
        positionedNodes.map((node) => ({
          type: 'add' as const,
          item: node,
        }))
      );

      // Add edges
      onEdgesChange(
        positionedEdges.map((edge) => ({
          type: 'add' as const,
          item: edge,
        }))
      );

      console.log('Template applied with original positions preserved');
    }, 100);
  };

  // Function to handle updating a template
  const handleUpdateTemplate = async () => {
    if (!currentTemplate || !nodes || !edges) {
      toast({
        title: 'Cannot update template',
        description:
          'No template is currently loaded or workflow data is missing.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdateConfirmOpen(true);
  };

  const handleConfirmUpdate = async () => {
    if (!currentTemplate || !nodes || !edges) return;

    if (!user?.id) {
      toast({
        title: 'Authentication required',
        description: 'You must be logged in to update templates.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const updatedTemplate =
        await templateService.updateTemplateWithNewVersion(
          currentTemplate.id,
          nodes,
          edges,
          user.id
        );

      setTemplates((prev) =>
        prev.map((t) => (t.id === updatedTemplate.id ? updatedTemplate : t))
      );

      // Update current template using the prop method
      onTemplateChange(updatedTemplate);

      setIsUpdateConfirmOpen(false);

      toast({
        title: 'Template updated',
        description: `Template "${updatedTemplate.name}" has been updated to version ${updatedTemplate.version}.`,
      });
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: 'Error updating template',
        description:
          'There was an error updating the template. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onTemplateSelect = (template: Template) => {
    setIsTemplateModalOpen(false);
    // Update both the local state and workflow context
    onTemplateChange(template);
    // Then apply the template data
    clearWorkflow();
    if (template.workflow_data) {
      try {
        applyWorkflowData(
          template.workflow_data.nodes || [],
          template.workflow_data.edges || []
        );
      } catch (error) {
        console.error('Error applying workflow data:', error);
        toast({
          title: 'Error loading template',
          description:
            'There was an error loading the template. The template data may be corrupted.',
          variant: 'destructive',
        });
      }
    }
  };

  const onSaveTemplate = async (
    name: string,
    description: string,
    tags: string[],
    previewImageUrl: string | null
  ) => {
    if (!user?.id) {
      toast({
        title: 'Authentication required',
        description: 'You must be logged in to save templates.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      const template = await templateService.saveCurrentWorkflowAsTemplate(
        name,
        description,
        tags,
        previewImageUrl,
        nodes,
        edges,
        user.id
      );
      setTemplates((prevTemplates) => [...prevTemplates, template]);
      setIsSaveTemplateModalOpen(false);

      // Update current template using the prop method
      onTemplateChange(template);

      toast({
        title: 'Template saved',
        description: `Template "${name}" has been saved.`,
      });
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error saving template',
        description:
          'There was an error saving the template. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SidebarProvider defaultOpen>
      <main className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0">
          <WorkflowCanvas
            className="h-full w-full"
            isCodeView={isCodeView}
            onCodeViewChange={setIsCodeView}
          />
          {!isCodeView && (
            <div className="absolute bottom-8 left-1/2 z-[90] -translate-x-1/2">
              <div className="rounded-md border bg-background/95 p-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <ElementSelector />
              </div>
            </div>
          )}
          <WorkflowSidebar isCodeView={isCodeView} />
          <WorkflowToolsMenu
            onTemplatesClick={() => setIsTemplateModalOpen(true)}
            onSaveAsTemplateClick={() => setIsSaveTemplateModalOpen(true)}
            onUpdateTemplateClick={handleUpdateTemplate}
            currentTemplate={currentTemplate}
            isCodeView={isCodeView}
          />
          <TemplateModal
            isOpen={isTemplateModalOpen}
            onClose={() => setIsTemplateModalOpen(false)}
            onTemplateSelect={onTemplateSelect}
            templates={templates}
            onTemplatesChange={setTemplates}
            currentTemplate={currentTemplate}
            currentNodes={nodes}
            currentEdges={edges}
            userEmail={user?.id || null}
          />
          <SaveTemplateModal
            isOpen={isSaveTemplateModalOpen}
            onClose={() => setIsSaveTemplateModalOpen(false)}
            onSave={onSaveTemplate}
            isSaving={isLoading}
          />
          <AlertDialog
            open={isUpdateConfirmOpen}
            onOpenChange={setIsUpdateConfirmOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Update Template</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to update the template "
                  {currentTemplate?.name}"? This will create a new version with
                  your current workflow. Previous versions will still be
                  accessible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmUpdate}>
                  {isLoading ? 'Updating...' : 'Update Template'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </SidebarProvider>
  );
}

export default function WorkflowEditor() {
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <WorkflowProvider>
        <SidebarProvider defaultOpen={true}>
          <ReactFlowProvider>
            <WorkflowEditorContent
              currentTemplate={currentTemplate}
              onTemplateChange={setCurrentTemplate}
            />
          </ReactFlowProvider>
        </SidebarProvider>
      </WorkflowProvider>
    </main>
  );
}
