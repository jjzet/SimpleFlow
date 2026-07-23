'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowRight, ExternalLink, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FieldMapping {
  mapFrom: string;
  setTo?: string;
}

interface ChildTaskConfiguration {
  taskDefinitionId: {
    scope: string;
    code: string;
  };
  initialTrigger: string;
  childTaskFields: Record<string, FieldMapping>;
}

interface WorkerFieldMappings {
  workerParameters?: Record<string, FieldMapping>;
  childTaskConfigurations?: ChildTaskConfiguration[];
}

interface ChildTaskFieldMappings {
  childTaskFields: Record<string, FieldMapping>;
}

interface FieldMappingsViewProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'worker' | 'childTask';
  mappings: WorkerFieldMappings | ChildTaskFieldMappings;
  scope: string;
  code: string;
  onViewProperties?: () => void;
}

export function FieldMappingsView({
  isOpen,
  onClose,
  type,
  mappings,
  scope,
  code,
  onViewProperties,
}: FieldMappingsViewProps) {
  const renderFieldMapping = (field: string, mapping: FieldMapping) => (
    <div key={field} className="flex items-center gap-2">
      <div className="flex-1">
        <Label className="text-xs text-gray-500">Field</Label>
        <div className="text-sm font-medium">{field}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-gray-400" />
      <div className="flex-1">
        <Label className="text-xs text-gray-500">Maps From</Label>
        <div className="text-sm font-medium">{mapping.mapFrom}</div>
      </div>
      {mapping.setTo && (
        <>
          <ArrowRight className="h-4 w-4 text-gray-400" />
          <div className="flex-1">
            <Label className="text-xs text-gray-500">Default Value</Label>
            <div className="text-sm font-medium">{mapping.setTo}</div>
          </div>
        </>
      )}
    </div>
  );

  const isWorkerMappings = (
    m: WorkerFieldMappings | ChildTaskFieldMappings
  ): m is WorkerFieldMappings => {
    return 'workerParameters' in m || 'childTaskConfigurations' in m;
  };

  const isChildTaskMappings = (
    m: WorkerFieldMappings | ChildTaskFieldMappings
  ): m is ChildTaskFieldMappings => {
    return 'childTaskFields' in m;
  };

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Field Mappings</DialogTitle>
            <DialogDescription>
              {type === 'worker'
                ? 'These parameters are defined and managed in the worker properties.'
                : 'These field mappings are defined and managed in the task definition properties.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Header with scope and code */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs text-gray-500">Scope</Label>
                <div className="text-sm font-medium">{scope}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Code</Label>
                <div className="text-sm font-medium">{code}</div>
              </div>
              <Button variant="outline" size="sm" onClick={onViewProperties}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View Properties
              </Button>
            </div>

            {/* Worker Parameters Section */}
            {type === 'worker' &&
              isWorkerMappings(mappings) &&
              mappings.workerParameters && (
                <Card className="p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <h3 className="font-medium">Worker Parameters</h3>
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertCircle className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Parameters are managed in worker properties
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="space-y-4">
                    {Object.entries(mappings.workerParameters).map(
                      ([field, mapping]) => renderFieldMapping(field, mapping)
                    )}
                    {Object.keys(mappings.workerParameters).length === 0 && (
                      <div className="text-sm text-gray-500">
                        No parameters defined in worker properties
                      </div>
                    )}
                  </div>
                </Card>
              )}

            {/* Child Task Fields Section */}
            {((type === 'childTask' && isChildTaskMappings(mappings)) ||
              (type === 'worker' &&
                isWorkerMappings(mappings) &&
                mappings.childTaskConfigurations)) && (
              <Card className="p-4">
                <div className="mb-4 flex items-center gap-2">
                  <h3 className="font-medium">
                    {type === 'childTask'
                      ? 'Field Mappings'
                      : 'Child Task Fields'}
                  </h3>
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertCircle className="h-4 w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Fields are managed in task definition properties
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="space-y-4">
                  {type === 'childTask' && isChildTaskMappings(mappings) ? (
                    // Render child task fields for CreateChildTasks action
                    <>
                      <div className="mb-2 text-sm text-gray-500">
                        These fields are mapped from the parent task to the
                        child task
                      </div>
                      {Object.entries(mappings.childTaskFields).map(
                        ([field, mapping]) => renderFieldMapping(field, mapping)
                      )}
                    </>
                  ) : (
                    // Render child task configurations for RunWorker action
                    isWorkerMappings(mappings) &&
                    mappings.childTaskConfigurations?.map((config, index) => (
                      <div key={index} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-xs text-gray-500">
                              Task Definition
                            </Label>
                            <div className="text-sm font-medium">
                              {config.taskDefinitionId.scope}/
                              {config.taskDefinitionId.code}
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">
                              Initial Trigger
                            </Label>
                            <div className="text-sm font-medium">
                              {config.initialTrigger}
                            </div>
                          </div>
                        </div>
                        <div className="mb-2 text-sm text-gray-500">
                          Fields mapped to this child task
                        </div>
                        {Object.entries(config.childTaskFields).map(
                          ([field, mapping]) =>
                            renderFieldMapping(field, mapping)
                        )}
                      </div>
                    ))
                  )}
                  {(type === 'childTask' &&
                    isChildTaskMappings(mappings) &&
                    Object.keys(mappings.childTaskFields).length === 0) ||
                    (type === 'worker' &&
                      isWorkerMappings(mappings) &&
                      (!mappings.childTaskConfigurations ||
                        mappings.childTaskConfigurations.length === 0) && (
                        <div className="text-sm text-gray-500">
                          No field mappings defined in task definition
                          properties
                        </div>
                      ))}
                </div>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
