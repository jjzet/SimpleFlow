'use client';

import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileJson,
  Plus,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useWorkflow } from '@/contexts/workflow-context';
import {
  Sidebar,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Project, TaskDefinitionFile } from '@/types/workflow';
import { cn } from '@/lib/utils';

interface FormData {
  name: string;
  description: string;
}

interface WorkflowSidebarProps {
  isCodeView?: boolean;
}

export function WorkflowSidebar({ isCodeView }: WorkflowSidebarProps) {
  const {
    projects,
    selectedProject,
    expandedFolders,
    toggleFolder,
    createProject,
    selectProject,
  } = useWorkflow();
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    createProject(formData.name, formData.description);
    setIsCreateProjectOpen(false);
    setFormData({ name: '', description: '' });
  };

  const handleProjectClick = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation(); // Prevent triggering the folder toggle
    selectProject(selectedProject?.id === projectId ? null : projectId);
  };

  const getTaskDefinitionIcon = (type: string) => {
    // TODO: Implement different icons for different task types
    return <div className="h-4 w-4 rounded bg-muted" />;
  };

  return (
    <div className="absolute left-0 top-0 z-[100]">
      <Sidebar
        className={cn(
          'flex h-screen flex-col border-r backdrop-blur supports-[backdrop-filter]:bg-background/80',
          isCodeView
            ? 'border-[#404040] bg-[#1E1E1E]/95 text-gray-300'
            : 'border-border bg-background/95'
        )}
      >
        <SidebarHeader
          className={cn(
            'flex-shrink-0 border-b',
            isCodeView && 'border-[#404040]'
          )}
        >
          <div className="px-4 py-2">
            <h2 className="text-lg font-semibold">SimpleFlow</h2>
          </div>
        </SidebarHeader>
        <div className="flex-1 overflow-y-auto">
          <SidebarGroup>
            <div className="flex flex-shrink-0 items-center justify-between px-4 py-2">
              <SidebarGroupLabel>Projects</SidebarGroupLabel>
              <Dialog
                open={isCreateProjectOpen}
                onOpenChange={setIsCreateProjectOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-6 w-6',
                      isCodeView && 'hover:bg-[#404040]'
                    )}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleCreateProject}>
                    <DialogHeader>
                      <DialogTitle>Create New Project</DialogTitle>
                      <DialogDescription>
                        Create a new workflow project to organize your task
                        definitions.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">
                          Project Name
                        </label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder="Enter project name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor="description"
                          className="text-sm font-medium"
                        >
                          Description
                        </label>
                        <Input
                          id="description"
                          value={formData.description}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          placeholder="Enter project description"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Create Project</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <SidebarGroupContent className="space-y-1">
              {projects.map((project: Project) => (
                <div key={project.id} className="px-2">
                  <div className="flex items-center">
                    <button
                      onClick={() => toggleFolder(project.id)}
                      className={cn(
                        'rounded-md p-1 hover:bg-accent',
                        isCodeView && 'hover:bg-[#404040]'
                      )}
                    >
                      {expandedFolders[project.id] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={(e) => handleProjectClick(e, project.id)}
                      className={cn(
                        'flex flex-1 items-center rounded-md px-2 py-1 text-sm',
                        selectedProject?.id === project.id
                          ? isCodeView
                            ? 'bg-[#404040]'
                            : 'bg-accent'
                          : '',
                        isCodeView
                          ? 'hover:bg-[#404040]'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      {expandedFolders[project.id] ? (
                        <FolderOpen className="mr-2 h-4 w-4" />
                      ) : (
                        <Folder className="mr-2 h-4 w-4" />
                      )}
                      <span>{project.name}</span>
                    </button>
                  </div>
                  {expandedFolders[project.id] && (
                    <div className="ml-4 mt-1 space-y-1">
                      <div
                        className={cn(
                          'px-2 py-1 text-sm font-medium',
                          isCodeView ? 'text-gray-400' : 'text-muted-foreground'
                        )}
                      >
                        Task Definitions
                      </div>
                      {project.taskDefinitions.map(
                        (file: TaskDefinitionFile) => (
                          <div
                            key={file.id}
                            className={cn(
                              'flex items-center rounded-md px-2 py-1 text-sm',
                              isCodeView && 'hover:bg-[#404040]'
                            )}
                          >
                            <FileJson className="mr-2 h-4 w-4" />
                            <span>{`${file.type}Task_${file.name}.json`}</span>
                          </div>
                        )
                      )}

                      <div
                        className={cn(
                          'mt-4 px-2 py-1 text-sm font-medium',
                          isCodeView ? 'text-gray-400' : 'text-muted-foreground'
                        )}
                      >
                        Workers
                      </div>
                      {project.workers?.map((file) => (
                        <div
                          key={file.id}
                          className={cn(
                            'flex items-center rounded-md px-2 py-1 text-sm',
                            isCodeView && 'hover:bg-[#404040]'
                          )}
                        >
                          <FileJson className="mr-2 h-4 w-4" />
                          <span>{`worker_${file.name}.json`}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </Sidebar>
      <SidebarTrigger
        className={cn(
          'absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rounded-full border p-1.5',
          isCodeView
            ? 'border-[#404040] bg-[#2D2D2D] text-gray-300 hover:bg-[#3D3D3D]'
            : 'bg-background hover:bg-accent'
        )}
      />
    </div>
  );
}
