import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Template, TemplateVersion } from '@/types/template';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Filter,
  History,
  Undo2,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { SaveTemplateModal } from './save-template-modal';
import { templateService } from '@/lib/services/template-service';
import { useToast } from '@/components/ui/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateSelect: (template: Template) => void;
  templates: Template[];
  onTemplatesChange: (templates: Template[]) => void;
  currentNodes?: any[];
  currentEdges?: any[];
  currentTemplate?: Template | null;
  userEmail?: string | null;
}

interface TemplateCardProps {
  template: Template;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onVersion: () => void;
  onUpdate?: () => void;
  isCurrentTemplate?: boolean;
}

interface VersionHistoryProps {
  templateId: string;
  isOpen: boolean;
  onClose: () => void;
  onVersionRestore: (versionId: string) => void;
  currentVersion: string;
}

interface UpdateTemplateConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  templateName: string;
}

// Predefined tags for filtering
const PREDEFINED_TAGS = [
  'Has Workers',
  'Three Level Workflow',
  'Two Level Workflow',
  'Single Level Workflow',
  'Data Processing',
  'Approval Flow',
  'Exception Handling',
];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function VersionHistoryDialog({
  templateId,
  isOpen,
  onClose,
  onVersionRestore,
  currentVersion,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchVersions = async () => {
      if (isOpen) {
        try {
          setLoading(true);
          const fetchedVersions =
            await templateService.getTemplateVersions(templateId);
          setVersions(fetchedVersions);
        } catch (error) {
          console.error('Error fetching template versions:', error);
          toast({
            title: 'Error loading versions',
            description: 'There was an error loading the template versions.',
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      }
    };

    fetchVersions();
  }, [isOpen, templateId, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>
            View and restore previous versions of this template
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : versions.length > 0 ? (
            <div className="space-y-3 pt-2">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={cn(
                    'flex items-center justify-between rounded-md border p-3',
                    version.version === currentVersion
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={cn(
                        'h-3 w-3 rounded-full',
                        version.version === currentVersion
                          ? 'bg-green-500'
                          : 'bg-amber-500'
                      )}
                    />
                    <div>
                      <div className="font-medium">
                        Version {version.version}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(version.created_at)}
                      </div>
                    </div>
                  </div>

                  {version.version !== currentVersion && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onVersionRestore(version.id)}
                      className="flex items-center gap-1"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      <span>Restore</span>
                    </Button>
                  )}

                  {version.version === currentVersion && (
                    <Badge
                      variant="outline"
                      className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                    >
                      Current
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-center">
              <div>
                <p className="text-muted-foreground">
                  No version history found
                </p>
                <p className="text-sm text-muted-foreground">
                  This template doesn't have any saved versions yet
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function UpdateTemplateConfirm({
  isOpen,
  onClose,
  onConfirm,
  templateName,
}: UpdateTemplateConfirmProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update Template</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to update the template "{templateName}"? This
            will create a new version with your current workflow. Previous
            versions will still be accessible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Update Template
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TemplateCard({
  template,
  onClick,
  onEdit,
  onDelete,
  onVersion,
  onUpdate,
  isCurrentTemplate = false,
}: TemplateCardProps) {
  const isSystemTemplate = !template.is_user_template;

  return (
    <div
      className={cn(
        'group relative cursor-pointer rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md',
        'hover:scale-[1.02] active:scale-[0.98]',
        isCurrentTemplate && 'ring-2 ring-primary ring-opacity-60'
      )}
    >
      {!isSystemTemplate && (
        <div className="absolute right-2 top-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-70 hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onVersion();
                }}
              >
                <History className="mr-2 h-4 w-4" />
                Version History
              </DropdownMenuItem>
              {onUpdate && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate();
                    }}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Update Template
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <div onClick={onClick} className="flex h-full flex-col">
        <div className="relative aspect-[16/9] overflow-hidden rounded-t-lg bg-muted">
          {template.preview_image_url ? (
            <Image
              src={template.preview_image_url}
              alt={template.name}
              width={400}
              height={225}
              className="h-full w-full object-cover"
              unoptimized={true}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Preview Coming Soon
            </div>
          )}
          {isSystemTemplate && (
            <div className="absolute left-2 top-2">
              <Badge variant="default" className="bg-blue-500">
                System
              </Badge>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold">{template.name}</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="ml-2">
                    v{template.version}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Version {template.version}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {template.description}
          </p>
          {template.tags && template.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {template.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {template.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{template.tags.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TemplateModal({
  isOpen,
  onClose,
  onTemplateSelect,
  templates,
  onTemplatesChange,
  currentNodes,
  currentEdges,
  currentTemplate,
  userEmail,
}: TemplateModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [selectedTemplateForVersions, setSelectedTemplateForVersions] =
    useState<Template | null>(null);
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);
  const [templateToUpdate, setTemplateToUpdate] = useState<Template | null>(
    null
  );
  const { toast } = useToast();

  const handleTemplateSelect = (template: Template) => {
    console.log('Selected template:', template);
    console.log('Template workflow data:', template.workflow_data);
    onTemplateSelect(template);
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setIsEditModalOpen(true);
  };

  const handleDeleteTemplate = async (template: Template) => {
    if (
      window.confirm(
        `Are you sure you want to delete the template "${template.name}"?`
      )
    ) {
      try {
        await templateService.deleteTemplate(template.id);
        const updatedTemplates = templates.filter((t) => t.id !== template.id);
        onTemplatesChange(updatedTemplates);
        toast({
          title: 'Template deleted',
          description: `The template "${template.name}" has been deleted.`,
        });
      } catch (error) {
        console.error('Error deleting template:', error);
        toast({
          title: 'Error deleting template',
          description:
            'There was an error deleting the template. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleUpdateTemplate = async (template: Template) => {
    if (!currentNodes || !currentEdges) {
      toast({
        title: 'Cannot update template',
        description: 'Current workflow data is not available.',
        variant: 'destructive',
      });
      return;
    }

    setTemplateToUpdate(template);
    setIsUpdateConfirmOpen(true);
  };

  const handleConfirmUpdate = async () => {
    if (!templateToUpdate || !currentNodes || !currentEdges) return;

    if (!userEmail) {
      toast({
        title: 'Authentication required',
        description: 'You must be logged in to update templates.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      // Note: userEmail is actually the user.id passed from workflow-editor
      const updatedTemplate =
        await templateService.updateTemplateWithNewVersion(
          templateToUpdate.id,
          currentNodes,
          currentEdges,
          userEmail
        );

      // Update the templates list
      const updatedTemplates = templates.map((t) =>
        t.id === updatedTemplate.id ? updatedTemplate : t
      );
      onTemplatesChange(updatedTemplates);

      setIsUpdateConfirmOpen(false);
      setTemplateToUpdate(null);

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
      setIsSaving(false);
    }
  };

  const handleUpdateTemplateFields = async (
    name: string,
    description: string,
    tags: string[],
    previewImageUrl: string | null
  ) => {
    if (!editingTemplate) return;

    try {
      setIsSaving(true);
      const updatedTemplate = await templateService.updateWorkflowTemplate(
        editingTemplate.id,
        name,
        description,
        tags,
        previewImageUrl,
        editingTemplate.workflow_data.nodes,
        editingTemplate.workflow_data.edges
      );

      // Update the templates list
      const updatedTemplates = templates.map((t) =>
        t.id === updatedTemplate.id ? updatedTemplate : t
      );
      onTemplatesChange(updatedTemplates);

      setIsEditModalOpen(false);
      setEditingTemplate(null);
      return Promise.resolve();
    } catch (error) {
      console.error('Error updating template:', error);
      return Promise.reject(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShowVersionHistory = (template: Template) => {
    setSelectedTemplateForVersions(template);
    setIsVersionHistoryOpen(true);
  };

  const handleVersionRestore = async (versionId: string) => {
    if (!selectedTemplateForVersions) return;

    if (!userEmail) {
      toast({
        title: 'Authentication required',
        description: 'You must be logged in to restore template versions.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const restoredTemplate = await templateService.restoreTemplateVersion(
        selectedTemplateForVersions.id,
        versionId,
        userEmail
      );

      // Update the templates list
      const updatedTemplates = templates.map((t) =>
        t.id === restoredTemplate.id ? restoredTemplate : t
      );
      onTemplatesChange(updatedTemplates);

      // Close the version history modal
      setIsVersionHistoryOpen(false);

      toast({
        title: 'Version restored',
        description: `Template has been restored to version ${restoredTemplate.version}.`,
      });
    } catch (error) {
      console.error('Error restoring template version:', error);
      toast({
        title: 'Error restoring version',
        description:
          'There was an error restoring the template version. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const toggleTagFilter = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Filter templates based on search term and selected tags
  const filteredTemplates = templates
    .filter((template) => {
      // Filter by search term
      const matchesSearch =
        searchTerm === '' ||
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase());

      // Filter by selected tags
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((tag) => template.tags?.includes(tag));

      return matchesSearch && matchesTags;
    })
    .sort((a, b) => {
      // Sort by created_at descending (newest first)
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[1000px]">
          <DialogHeader>
            <DialogTitle>Choose a Template</DialogTitle>
            <DialogDescription>
              Select a template to start building your workflow
            </DialogDescription>
          </DialogHeader>

          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                  <span className="sr-only">Filter</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="p-2">
                  <div className="mb-2 font-medium">Filter by tags</div>
                  <div className="space-y-2">
                    {PREDEFINED_TAGS.map((tag) => (
                      <div key={tag} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`filter-${tag}`}
                          checked={selectedTags.includes(tag)}
                          onChange={() => toggleTagFilter(tag)}
                          className="mr-2"
                        />
                        <label htmlFor={`filter-${tag}`} className="text-sm">
                          {tag}
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedTags.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => setSelectedTags([])}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {selectedTags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1">
              {selectedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => toggleTagFilter(tag)}
                    className="ml-1 rounded-full hover:bg-secondary-foreground/10"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                    <span className="sr-only">Remove {tag} filter</span>
                  </button>
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setSelectedTags([])}
              >
                Clear All
              </Button>
            </div>
          )}

          <ScrollArea className="h-[500px] pr-4">
            {filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 pb-4">
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onClick={() => handleTemplateSelect(template)}
                    onEdit={() => handleEditTemplate(template)}
                    onDelete={() => handleDeleteTemplate(template)}
                    onVersion={() => handleShowVersionHistory(template)}
                    onUpdate={
                      currentTemplate &&
                      currentTemplate.id === template.id &&
                      currentNodes &&
                      currentEdges
                        ? () => handleUpdateTemplate(template)
                        : undefined
                    }
                    isCurrentTemplate={currentTemplate?.id === template.id}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center text-center">
                <p className="mb-2 text-muted-foreground">No templates found</p>
                <p className="text-sm text-muted-foreground">
                  {searchTerm || selectedTags.length > 0
                    ? 'Try adjusting your search or filters'
                    : 'Create a workflow and save it as a template to get started'}
                </p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {editingTemplate && (
        <SaveTemplateModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingTemplate(null);
          }}
          onSave={handleUpdateTemplateFields}
          isSaving={isSaving}
          template={editingTemplate}
        />
      )}

      {selectedTemplateForVersions && (
        <VersionHistoryDialog
          templateId={selectedTemplateForVersions.id}
          isOpen={isVersionHistoryOpen}
          onClose={() => setIsVersionHistoryOpen(false)}
          onVersionRestore={handleVersionRestore}
          currentVersion={selectedTemplateForVersions.version}
        />
      )}

      {templateToUpdate && (
        <UpdateTemplateConfirm
          isOpen={isUpdateConfirmOpen}
          onClose={() => setIsUpdateConfirmOpen(false)}
          onConfirm={handleConfirmUpdate}
          templateName={templateToUpdate.name}
        />
      )}
    </>
  );
}
