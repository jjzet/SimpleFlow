import { nanoid } from 'nanoid';
import { Template, TemplateCreate, TemplateVersion } from '@/types/template';

// Browser-storage template backend for local-first mode. Mirrors the
// primitive CRUD surface of templateService so the composite operations
// (save-as-template, versioning, restore) work unchanged without Supabase.
const TEMPLATES_KEY = 'simpleflow.templates.v1';
const VERSIONS_KEY = 'simpleflow.template-versions.v1';

// The user id recorded on locally created templates and versions.
export const LOCAL_USER_ID = 'local';

function readJson<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch (error) {
    console.error(`Failed to read ${key} from localStorage:`, error);
    return [];
  }
}

function writeJson<T>(key: string, value: T[]): void {
  if (typeof window === 'undefined') {
    throw new Error('Local template storage is only available in the browser.');
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    throw new Error(
      'Could not save to browser storage. It may be full — try deleting unused templates or removing large preview images.'
    );
  }
}

export const localTemplateStore = {
  async getAllTemplates(): Promise<Template[]> {
    return readJson<Template>(TEMPLATES_KEY).sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    );
  },

  async getTemplateById(id: string): Promise<Template | null> {
    return (
      readJson<Template>(TEMPLATES_KEY).find(
        (template) => template.id === id
      ) ?? null
    );
  },

  async getTemplateVersions(templateId: string): Promise<TemplateVersion[]> {
    return readJson<TemplateVersion>(VERSIONS_KEY)
      .filter((version) => version.template_id === templateId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async getTemplateVersionById(
    versionId: string
  ): Promise<TemplateVersion | null> {
    return (
      readJson<TemplateVersion>(VERSIONS_KEY).find(
        (version) => version.id === versionId
      ) ?? null
    );
  },

  async createTemplate(template: TemplateCreate): Promise<Template> {
    const templates = readJson<Template>(TEMPLATES_KEY);
    const created: Template = {
      ...template,
      id: nanoid(),
      created_at: new Date().toISOString(),
      version: template.version || '1.0.0',
      user_id: template.user_id || LOCAL_USER_ID,
    };
    writeJson(TEMPLATES_KEY, [...templates, created]);
    return created;
  },

  async createTemplateVersion(
    templateId: string,
    version: string,
    workflowData: Template['workflow_data'],
    userId: string
  ): Promise<TemplateVersion> {
    const versions = readJson<TemplateVersion>(VERSIONS_KEY);
    const created: TemplateVersion = {
      id: nanoid(),
      template_id: templateId,
      version,
      workflow_data: workflowData,
      created_at: new Date().toISOString(),
      created_by: userId || LOCAL_USER_ID,
    };
    writeJson(VERSIONS_KEY, [...versions, created]);
    return created;
  },

  async updateTemplate(
    id: string,
    updates: Partial<TemplateCreate>
  ): Promise<Template> {
    const templates = readJson<Template>(TEMPLATES_KEY);
    const index = templates.findIndex((template) => template.id === id);
    if (index === -1) {
      throw new Error('Template not found');
    }
    const updated = { ...templates[index], ...updates } as Template;
    templates[index] = updated;
    writeJson(TEMPLATES_KEY, templates);
    return updated;
  },

  async deleteTemplate(id: string): Promise<void> {
    writeJson(
      TEMPLATES_KEY,
      readJson<Template>(TEMPLATES_KEY).filter((template) => template.id !== id)
    );
    writeJson(
      VERSIONS_KEY,
      readJson<TemplateVersion>(VERSIONS_KEY).filter(
        (version) => version.template_id !== id
      )
    );
  },

  async uploadTemplateImage(file: File): Promise<string> {
    // Stored inline as a data URL; local mode has no object storage.
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    });
  },
};
