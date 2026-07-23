import { createClient, isSupabaseConfigured } from '@/lib/supabase';
import { localTemplateStore, LOCAL_USER_ID } from './local-template-store';
import { Template, TemplateCreate, TemplateVersion } from '@/types/template';
import { TaskDefinitionCodeGenerator } from '@/lib/code-generation/task-definition-code-generator';
import { WorkerCodeGenerator } from '@/lib/code-generation/worker-code-generator';
import { Node, Edge } from 'reactflow';

const taskDefinitionCodeGenerator = new TaskDefinitionCodeGenerator();
const workerCodeGenerator = new WorkerCodeGenerator();

// Helper function to sanitize workflow data for JSON serialization
const sanitizeWorkflowData = (nodes: Node[], edges: Edge[]) => {
  // Helper function to deeply sanitize an object
  const sanitizeObject = (obj: any): any => {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => sanitizeObject(item));
    }

    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Skip functions and undefined values
      if (typeof value === 'function' || value === undefined) {
        continue;
      }

      // Recursively sanitize objects
      if (typeof value === 'object' && value !== null) {
        result[key] = sanitizeObject(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  };

  // Create a deep copy of nodes and edges to avoid circular references
  // and ensure proper JSON serialization
  const sanitizedNodes = nodes.map((node) => {
    // Create a clean copy of the node, preserving all position and style information
    const cleanNode = {
      ...node,
      // Ensure position is preserved exactly as is
      position: {
        x: node.position.x,
        y: node.position.y,
      },
      // Preserve style information
      style: node.style ? sanitizeObject(node.style) : undefined,
      // Sanitize data
      data: node.data ? sanitizeObject(node.data) : {},
    };

    return cleanNode;
  });

  const sanitizedEdges = edges.map((edge) => {
    // Create a clean copy of the edge, preserving all style information
    const cleanEdge = {
      ...edge,
      // Preserve style information
      style: edge.style ? sanitizeObject(edge.style) : undefined,
      // Sanitize data
      data: edge.data ? sanitizeObject(edge.data) : undefined,
    };

    return cleanEdge;
  });

  return { sanitizedNodes, sanitizedEdges };
};

// Helper to increment semantic version
const incrementVersion = (version: string): string => {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3) {
    // Default to 1.0.0 if invalid version format
    return '1.0.0';
  }

  // Increment the patch version (1.0.0 -> 1.0.1)
  parts[2] += 1;
  return parts.join('.');
};

export const templateService = {
  async getAllTemplates(): Promise<Template[]> {
    if (!isSupabaseConfigured) return localTemplateStore.getAllTemplates();
    const supabase = createClient();
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Template[];
  },

  async getTemplateById(id: string): Promise<Template | null> {
    if (!isSupabaseConfigured) return localTemplateStore.getTemplateById(id);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Template;
  },

  async getTemplateVersions(templateId: string): Promise<TemplateVersion[]> {
    if (!isSupabaseConfigured)
      return localTemplateStore.getTemplateVersions(templateId);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('template_versions')
      .select('*')
      .eq('template_id', templateId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as TemplateVersion[];
  },

  async getTemplateVersionById(
    versionId: string
  ): Promise<TemplateVersion | null> {
    if (!isSupabaseConfigured)
      return localTemplateStore.getTemplateVersionById(versionId);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('template_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error) throw error;
    return data as TemplateVersion;
  },

  async createTemplate(template: TemplateCreate): Promise<Template> {
    if (!isSupabaseConfigured) {
      const created = await localTemplateStore.createTemplate(template);
      await localTemplateStore.createTemplateVersion(
        created.id,
        created.version,
        created.workflow_data,
        created.user_id ?? LOCAL_USER_ID
      );
      return created;
    }
    const supabase = createClient();
    try {
      // Set initial version if not provided
      const templateWithVersion = {
        ...template,
        version: template.version || '1.0.0',
      };

      // Log the template data for debugging
      console.log('Creating template with data:', {
        name: templateWithVersion.name,
        description: templateWithVersion.description,
        tags: templateWithVersion.tags,
        preview_image_url: templateWithVersion.preview_image_url,
        is_user_template: templateWithVersion.is_user_template,
        user_id: templateWithVersion.user_id,
        version: templateWithVersion.version,
        workflow_data_size: JSON.stringify(templateWithVersion.workflow_data)
          .length,
      });

      const { data, error } = await supabase
        .from('templates')
        .insert([templateWithVersion])
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating template:', error);

        // Check for RLS policy violation
        if (
          error.code === '42501' &&
          error.message.includes('violates row-level security policy')
        ) {
          throw new Error(
            'Permission denied: You do not have permission to create templates. Please check your Supabase RLS policies.'
          );
        }

        throw error;
      }

      // Create initial version in template_versions table
      await this.createTemplateVersion(
        data.id,
        '1.0.0',
        data.workflow_data,
        data.user_id
      );

      return data as Template;
    } catch (error) {
      console.error('Error in createTemplate:', error);
      throw error;
    }
  },

  async createTemplateVersion(
    templateId: string,
    version: string,
    workflowData: any,
    userId: string
  ): Promise<TemplateVersion> {
    if (!isSupabaseConfigured) {
      return localTemplateStore.createTemplateVersion(
        templateId,
        version,
        workflowData,
        userId || LOCAL_USER_ID
      );
    }
    const supabase = createClient();
    if (!userId) {
      throw new Error('User ID is required to create a template version');
    }
    try {
      const { data, error } = await supabase
        .from('template_versions')
        .insert([
          {
            template_id: templateId,
            version,
            workflow_data: workflowData,
            created_by: userId,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating template version:', error);

        // Check for RLS policy violation
        if (
          error.code === '42501' &&
          error.message.includes('violates row-level security policy')
        ) {
          throw new Error(
            'Permission denied: RLS policy violation when creating template version. Please check your Supabase RLS policies or contact an administrator.'
          );
        }

        throw error;
      }
      return data as TemplateVersion;
    } catch (error) {
      console.error('Error in createTemplateVersion:', error);
      throw error;
    }
  },

  async updateTemplate(
    id: string,
    template: Partial<TemplateCreate>
  ): Promise<Template> {
    if (!isSupabaseConfigured)
      return localTemplateStore.updateTemplate(id, template);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('templates')
      .update(template)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Template;
  },

  async deleteTemplate(id: string): Promise<void> {
    if (!isSupabaseConfigured) return localTemplateStore.deleteTemplate(id);
    const supabase = createClient();
    const { error } = await supabase.from('templates').delete().eq('id', id);

    if (error) throw error;
  },

  async uploadTemplateImage(file: File): Promise<string> {
    if (!isSupabaseConfigured)
      return localTemplateStore.uploadTemplateImage(file);
    const supabase = createClient();
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `template-images/${fileName}`;

      console.log('Uploading template image to Supabase:', {
        bucket: 'templates',
        filePath: filePath,
        fileType: file.type,
        fileSize: file.size,
      });

      const { error, data } = await supabase.storage
        .from('templates')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading image to Supabase:', error);
        throw error;
      }

      console.log('Upload successful, getting public URL');
      const { data: urlData } = supabase.storage
        .from('templates')
        .getPublicUrl(filePath);

      console.log('Image public URL:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Template image upload failed:', error);
      throw error;
    }
  },

  async saveCurrentWorkflowAsTemplate(
    name: string,
    description: string,
    tags: string[],
    previewImageUrl: string | null,
    nodes: Node[],
    edges: Edge[],
    userId: string
  ): Promise<Template> {
    if (!userId) {
      if (!isSupabaseConfigured) {
        userId = LOCAL_USER_ID;
      } else {
        throw new Error('User ID is required to save a template');
      }
    }

    // First, enhance task definitions with state and worker positions
    const enhancedNodes = this.enhanceTaskDefinitionsWithPositions(
      nodes,
      edges
    );

    // Then sanitize the enhanced nodes
    const { sanitizedNodes, sanitizedEdges } = sanitizeWorkflowData(
      enhancedNodes,
      edges
    );

    const template: TemplateCreate = {
      name,
      description,
      preview_image_url: previewImageUrl,
      is_user_template: true,
      user_id: userId,
      tags,
      workflow_data: {
        nodes: sanitizedNodes,
        edges: sanitizedEdges,
      },
    };

    try {
      // Validate that the template can be properly serialized
      const serializedData = JSON.stringify(template);

      // Check if the serialized data is too large (Supabase has a 1MB limit for JSON columns)
      // We'll use 900KB as a safe limit
      const MAX_SIZE = 900 * 1024; // 900KB in bytes
      if (serializedData.length > MAX_SIZE) {
        throw new Error(
          `Template data is too large (${Math.round(serializedData.length / 1024)}KB). Please simplify your workflow or remove unnecessary nodes.`
        );
      }

      return await this.createTemplate(template);
    } catch (error) {
      console.error('Error serializing template:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(
          'Failed to serialize workflow data. The workflow may contain circular references or invalid data.'
        );
      }
    }
  },

  async updateTemplateWithNewVersion(
    id: string,
    nodes: Node[],
    edges: Edge[],
    userId: string
  ): Promise<Template> {
    if (!userId) {
      if (!isSupabaseConfigured) {
        userId = LOCAL_USER_ID;
      } else {
        throw new Error('User ID is required to update a template');
      }
    }
    try {
      // Get the current template
      const currentTemplate = await this.getTemplateById(id);
      if (!currentTemplate) {
        throw new Error('Template not found');
      }

      // Increment the version
      const newVersion = incrementVersion(currentTemplate.version);

      // First, enhance task definitions with state and worker positions
      const enhancedNodes = this.enhanceTaskDefinitionsWithPositions(
        nodes,
        edges
      );

      // Then sanitize the enhanced nodes
      const { sanitizedNodes, sanitizedEdges } = sanitizeWorkflowData(
        enhancedNodes,
        edges
      );

      const workflowData = {
        nodes: sanitizedNodes,
        edges: sanitizedEdges,
      };

      // Validate that the workflow data can be properly serialized
      const serializedData = JSON.stringify(workflowData);

      // Check if the serialized data is too large
      const MAX_SIZE = 900 * 1024; // 900KB in bytes
      if (serializedData.length > MAX_SIZE) {
        throw new Error(
          `Template data is too large (${Math.round(serializedData.length / 1024)}KB). Please simplify your workflow or remove unnecessary nodes.`
        );
      }

      // Create a new version record
      await this.createTemplateVersion(id, newVersion, workflowData, userId);

      // Update the main template record with the new version and workflow data
      const updatedTemplate = await this.updateTemplate(id, {
        version: newVersion,
        workflow_data: workflowData,
      });

      return updatedTemplate;
    } catch (error) {
      console.error('Error updating template with new version:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(
          'Failed to update template. The workflow may contain circular references or invalid data.'
        );
      }
    }
  },

  async restoreTemplateVersion(
    templateId: string,
    versionId: string,
    userId: string
  ): Promise<Template> {
    if (!userId) {
      if (!isSupabaseConfigured) {
        userId = LOCAL_USER_ID;
      } else {
        throw new Error('User ID is required to restore a template version');
      }
    }
    try {
      // Get the version to restore
      const versionToRestore = await this.getTemplateVersionById(versionId);
      if (!versionToRestore) {
        throw new Error('Template version not found');
      }

      // Get the current template
      const currentTemplate = await this.getTemplateById(templateId);
      if (!currentTemplate) {
        throw new Error('Template not found');
      }

      // Increment the version
      const newVersion = incrementVersion(currentTemplate.version);

      // Update the main template record with the restored workflow data and new version
      const updatedTemplate = await this.updateTemplate(templateId, {
        version: newVersion,
        workflow_data: versionToRestore.workflow_data,
      });

      // Create a new version record for the restoration
      await this.createTemplateVersion(
        templateId,
        newVersion,
        versionToRestore.workflow_data,
        userId
      );

      return updatedTemplate;
    } catch (error) {
      console.error('Error restoring template version:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Failed to restore template version.');
      }
    }
  },

  // Helper method to enhance task definitions with state and worker positions
  enhanceTaskDefinitionsWithPositions(nodes: Node[], edges: Edge[]): Node[] {
    // Create a deep copy of nodes to avoid modifying the original
    const enhancedNodes = JSON.parse(JSON.stringify(nodes));

    // Find all task definition nodes
    const taskDefinitionNodes = enhancedNodes.filter(
      (node: Node) => node.type === 'taskDefinition'
    );

    // For each task definition, find its states and workers and store their positions
    taskDefinitionNodes.forEach((taskNode: Node) => {
      // Find the original task node to get its style
      const originalTaskNode = nodes.find(
        (node) => node.id === taskNode.id && node.type === 'taskDefinition'
      );

      // Ensure we preserve the style information
      if (originalTaskNode && originalTaskNode.style) {
        taskNode.style = { ...originalTaskNode.style };
      }

      if (!taskNode.data.states) return;

      // Find all state nodes for this task
      const stateNodes = nodes.filter(
        (node) =>
          node.type === 'state' &&
          node.data.ownerTaskDefinition &&
          node.data.ownerTaskDefinition.scope === taskNode.data.scope &&
          node.data.ownerTaskDefinition.code === taskNode.data.code
      );

      // Store state positions in the task definition
      taskNode.data.states = taskNode.data.states.map((state: any) => {
        const stateNode = stateNodes.find(
          (node) => node.data.name === state.name
        );
        if (stateNode) {
          return {
            ...state,
            position: { ...stateNode.position },
          };
        }
        return state;
      });

      // If there are transitions with actions, store worker positions
      if (taskNode.data.transitions) {
        taskNode.data.transitions = taskNode.data.transitions.map(
          (transition: any) => {
            const enhancedTransition = { ...transition };

            // Find state transition edges to store their styles
            const fromStateNode = stateNodes.find(
              (node) => node.data.name === transition.fromState
            );
            const toStateNode = stateNodes.find(
              (node) => node.data.name === transition.toState
            );

            if (fromStateNode && toStateNode) {
              // Find the edge between these states
              const stateEdge = edges.find(
                (edge) =>
                  edge.source === fromStateNode.id &&
                  edge.target === toStateNode.id &&
                  edge.type === 'stateTransition'
              );

              if (stateEdge && stateEdge.style) {
                enhancedTransition.edgeStyle = { ...stateEdge.style };
              }
            }

            if (transition.action) {
              // Find the worker node for this action
              const workerNode = nodes.find(
                (node) =>
                  node.type === 'worker' &&
                  node.data.label === transition.action &&
                  node.data.ownerTaskDefinition &&
                  node.data.ownerTaskDefinition.scope === taskNode.data.scope &&
                  node.data.ownerTaskDefinition.code === taskNode.data.code
              );

              if (workerNode) {
                enhancedTransition.workerPosition = { ...workerNode.position };

                // Store worker style if it exists
                if (workerNode.style) {
                  enhancedTransition.workerStyle = { ...workerNode.style };
                }

                // Find action edge to store its style
                if (fromStateNode) {
                  const actionEdge = edges.find(
                    (edge) =>
                      edge.source === fromStateNode.id &&
                      edge.target === workerNode.id &&
                      edge.type === 'action'
                  );

                  if (actionEdge && actionEdge.style) {
                    enhancedTransition.actionEdgeStyle = {
                      ...actionEdge.style,
                    };
                  }
                }
              }
            }

            return enhancedTransition;
          }
        );
      }
    });

    return enhancedNodes;
  },

  async updateWorkflowTemplate(
    id: string,
    name: string,
    description: string,
    tags: string[],
    previewImageUrl: string | null,
    nodes: Node[],
    edges: Edge[]
  ): Promise<Template> {
    // First, enhance task definitions with state and worker positions
    const enhancedNodes = this.enhanceTaskDefinitionsWithPositions(
      nodes,
      edges
    );

    // Then sanitize the enhanced nodes
    const { sanitizedNodes, sanitizedEdges } = sanitizeWorkflowData(
      enhancedNodes,
      edges
    );

    const template: Partial<TemplateCreate> = {
      name,
      description,
      preview_image_url: previewImageUrl,
      tags,
      workflow_data: {
        nodes: sanitizedNodes,
        edges: sanitizedEdges,
      },
    };

    try {
      // Validate that the template can be properly serialized
      const serializedData = JSON.stringify(template);

      // Check if the serialized data is too large (Supabase has a 1MB limit for JSON columns)
      // We'll use 900KB as a safe limit
      const MAX_SIZE = 900 * 1024; // 900KB in bytes
      if (serializedData.length > MAX_SIZE) {
        throw new Error(
          `Template data is too large (${Math.round(serializedData.length / 1024)}KB). Please simplify your workflow or remove unnecessary nodes.`
        );
      }

      return await this.updateTemplate(id, template);
    } catch (error) {
      console.error('Error serializing template:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(
          'Failed to serialize workflow data. The workflow may contain circular references or invalid data.'
        );
      }
    }
  },
};
