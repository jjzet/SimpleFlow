'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useWorkflow } from '@/contexts/workflow-context';
import {
  ArrowRight,
  Box,
  Workflow,
  Square,
  ChevronDown,
  GitBranch,
  Bell,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type ElementType =
  | 'task'
  | 'worker'
  | 'state'
  | 'action'
  | 'stateTransition'
  | 'linkChildTask'
  | 'eventHandler';

export interface ElementOption {
  id: string;
  type: ElementType;
  label: string;
  variant?: string;
  description?: string;
  icon: React.ReactNode;
}

// Group task definitions
const taskElements: ElementOption[] = [
  {
    id: 'parent-task',
    type: 'task',
    label: 'Parent Task',
    variant: 'parent',
    description: 'A parent task definition that can contain states and actions',
    icon: <Box className="h-4 w-4 text-yellow-500" />,
  },
  {
    id: 'child-task',
    type: 'task',
    label: 'Child Task',
    variant: 'child',
    description: 'A child task definition that can be created by a parent task',
    icon: <Box className="h-4 w-4 text-orange-500" />,
  },
  {
    id: 'exception-task',
    type: 'task',
    label: 'Exception Task',
    variant: 'exception',
    description: 'A task for handling exceptions in the workflow',
    icon: <Box className="h-4 w-4 text-red-500" />,
  },
];

// Group flow control elements
const flowElements: ElementOption[] = [
  {
    id: 'worker',
    type: 'worker',
    label: 'Worker',
    description: 'A worker that performs a specific task',
    icon: <Workflow className="h-4 w-4 text-purple-600" />,
  },
  {
    id: 'eventHandler',
    type: 'eventHandler',
    label: 'Event Handler',
    description: 'An event handler that triggers a task when an event occurs',
    icon: <Bell className="h-4 w-4 text-blue-600" />,
  },
  {
    id: 'action',
    type: 'action',
    label: 'Action',
    description: 'Connect task definitions to create actions between them',
    icon: <ArrowRight className="h-4 w-4 text-purple-600" />,
  },
  {
    id: 'state-transition',
    type: 'stateTransition',
    label: 'State Transition',
    description: 'Connect states to create transitions between them',
    icon: <ArrowRight className="h-4 w-4 text-black" />,
  },
  {
    id: 'link-child-task',
    type: 'linkChildTask',
    label: 'Link Child Task',
    description: 'Link a worker to its associated child task',
    icon: <GitBranch className="h-4 w-4 text-blue-600" />,
  },
];

// Main elements that stay in the toolbar
const mainElements: ElementOption[] = [
  {
    id: 'state',
    type: 'state',
    label: 'State',
    description: 'A state in the workflow that tasks can transition between',
    icon: <Square className="h-4 w-4 text-gray-600" />,
  },
];

export const elements = [...taskElements, ...flowElements, ...mainElements];

export function ElementSelector() {
  const { setSelectedElement } = useWorkflow();

  const handleElementClick = (element: ElementOption) => {
    setSelectedElement(element);
  };

  return (
    <div className="flex gap-2">
      {/* Task Definitions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Box className="h-4 w-4 text-yellow-500" />
            Task Definition
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-white">
          {taskElements.map((element) => (
            <DropdownMenuItem
              key={element.id}
              onClick={() => handleElementClick(element)}
              className="flex items-center gap-2"
            >
              {element.icon}
              {element.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Flow Control Elements Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-purple-600" />
            Flow Control
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-white">
          {flowElements.map((element) => (
            <DropdownMenuItem
              key={element.id}
              onClick={() => handleElementClick(element)}
              className="flex items-center gap-2"
            >
              {element.icon}
              {element.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Main Elements */}
      {mainElements.map((element) => (
        <Button
          key={element.id}
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => handleElementClick(element)}
        >
          {element.icon}
          {element.label}
        </Button>
      ))}
    </div>
  );
}
