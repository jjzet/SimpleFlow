'use client';

import React, { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import Editor from '@monaco-editor/react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Component to render an expandable/collapsible code card
export interface CodeCardProps {
  title: string;
  type: 'worker' | 'exception' | 'child' | 'parent' | 'eventHandler';
  code: any;
  deploymentStatus?: 'new' | 'modified' | 'deployed' | null;
  lastDeployed?: string | null;
}

// Text colors for task types
const taskTypeColors = {
  parent: 'text-yellow-800',
  child: 'text-orange-800',
  exception: 'text-red-800',
  worker: 'text-purple-800',
  eventHandler: 'text-blue-800',
};

// Task type display names
const taskTypeDisplayNames = {
  parent: 'Parent',
  child: 'Child',
  exception: 'Exception',
};

export const CodeCard = ({
  title,
  type,
  code,
  deploymentStatus,
  lastDeployed,
}: CodeCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Define color styles based on node type
  const getCardStyles = () => {
    switch (type) {
      case 'worker':
        return 'border-purple-500 bg-purple-50 hover:bg-purple-100';
      case 'exception':
        return 'border-red-500 bg-red-50 hover:bg-red-100';
      case 'child':
        return 'border-orange-500 bg-orange-50 hover:bg-orange-100';
      case 'parent':
        return 'border-yellow-500 bg-yellow-50 hover:bg-yellow-100';
      case 'eventHandler':
        return 'border-blue-500 bg-blue-50 hover:bg-blue-100';
      default:
        return 'border-gray-200 bg-white hover:bg-gray-50';
    }
  };

  // Get color for task type badge
  const getTaskTypeColor = () => {
    switch (type) {
      case 'parent':
        return 'text-yellow-800 bg-yellow-50 border-yellow-200';
      case 'child':
        return 'text-orange-800 bg-orange-50 border-orange-200';
      case 'exception':
        return 'text-red-800 bg-red-50 border-red-200';
      default:
        return '';
    }
  };

  // Get the appropriate text color for the task type
  const getTitleColor = () => {
    return taskTypeColors[type] || '';
  };

  // Get status badge
  const getDeploymentStatusBadge = () => {
    if (!deploymentStatus) return null;

    switch (deploymentStatus) {
      case 'deployed':
        return (
          <Badge
            variant="outline"
            className="ml-2 border-green-300 bg-green-100 text-xs text-green-800"
          >
            Deployed
          </Badge>
        );
      case 'modified':
        return (
          <Badge
            variant="outline"
            className="ml-2 border-yellow-300 bg-yellow-100 text-xs text-yellow-800"
          >
            Modified
          </Badge>
        );
      case 'new':
        return (
          <Badge
            variant="outline"
            className="ml-2 border-blue-300 bg-blue-100 text-xs text-blue-800"
          >
            New
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={`mb-2 rounded-md border ${getCardStyles()}`}
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between p-3 hover:bg-opacity-80">
        <div className="flex items-center">
          <span className={`font-medium ${getTitleColor()}`}>{title}</span>
          {type !== 'worker' && type !== 'eventHandler' && (
            <Badge
              variant="outline"
              className={`ml-2 text-xs ${getTaskTypeColor()}`}
            >
              {taskTypeDisplayNames[type as keyof typeof taskTypeDisplayNames]}
            </Badge>
          )}
          {getDeploymentStatusBadge()}
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          {lastDeployed && deploymentStatus === 'deployed' && (
            <span className="mr-3 text-xs text-gray-500">
              Last deployed: {new Date(lastDeployed).toLocaleString()}
            </span>
          )}
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="rounded-b-md border-t bg-white p-0">
          <div className="h-[300px] w-full">
            <Editor
              height="300px"
              language="json"
              value={JSON.stringify(code, null, 2)}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                wordWrap: 'on',
                fontSize: 12,
                automaticLayout: true,
              }}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
