import { Node, Edge } from 'reactflow';
import { TaskDefinitionCode } from '@/lib/code-generation/types';
import { WorkerCode } from '@/lib/code-generation/worker-code-generator';

export interface Template {
  id: string;
  name: string;
  description: string;
  preview_image_url: string | null;
  is_user_template: boolean;
  user_id: string | null;
  created_at: string;
  version: string;
  tags: string[];
  workflow_data: {
    nodes: Node[];
    edges: Edge[];
  };
}

export interface TemplateVersion {
  id: string;
  template_id: string;
  version: string;
  workflow_data: {
    nodes: Node[];
    edges: Edge[];
  };
  created_at: string;
  created_by: string | null;
}

export interface TemplateCreate
  extends Omit<Template, 'id' | 'created_at' | 'version'> {
  version?: string;
}
