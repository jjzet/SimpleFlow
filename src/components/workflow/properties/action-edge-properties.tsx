'use client';

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Eye, Plus, X, ChevronDown } from 'lucide-react';
import { FieldMappingsView } from '../modals/field-mappings-view';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { OwnerTaskBadge } from '@/components/ui/owner-task-badge';

export type ActionType = 'RunWorker' | 'TriggerParentTask' | 'CreateChildTasks';

interface ChildTaskConfiguration {
  taskDefinitionId: {
    scope: string;
    code: string;
  };
  initialTrigger: string;
  childTaskFields: Record<string, { mapFrom: string }>;
}

export interface ActionEdgeData {
  name: string;
  actionType: ActionType;
  workerId?: {
    scope: string;
    code: string;
  };
  taskDefinitionId?: {
    scope: string;
    code: string;
  };
  trigger?: string;
  workerParameters?: Record<string, { mapFrom: string; setTo?: string }>;
  childTaskFields?: Record<string, { mapFrom: string }>;
  childTaskConfigurations?: ChildTaskConfiguration[];
  ownerTaskDefinition?: {
    scope: string;
    code: string;
  };
}

interface ActionEdgePropertiesProps {
  data: ActionEdgeData;
  onChange: (data: ActionEdgeData) => void;
  onViewWorkerProperties?: (scope: string, code: string) => void;
  onViewTaskDefinitionProperties?: (scope: string, code: string) => void;
}

export function ActionEdgeProperties({
  data,
  onChange,
  onViewWorkerProperties,
  onViewTaskDefinitionProperties,
}: ActionEdgePropertiesProps) {
  const [showFieldMappings, setShowFieldMappings] = useState(false);
  const [isChildTaskExpanded, setIsChildTaskExpanded] = useState(false);

  const handleNameChange = (value: string) => {
    onChange({
      ...data,
      name: value,
    });
  };

  const handleActionTypeChange = (value: ActionType) => {
    // Reset specific fields when action type changes
    const newData: ActionEdgeData = {
      ...data,
      actionType: value,
      // Clear fields specific to other action types
      workerId:
        value === 'RunWorker' && data.workerId?.scope && data.workerId?.code
          ? { scope: data.workerId.scope, code: data.workerId.code }
          : undefined,
      taskDefinitionId:
        value === 'CreateChildTasks' &&
        data.taskDefinitionId?.scope &&
        data.taskDefinitionId?.code
          ? {
              scope: data.taskDefinitionId.scope,
              code: data.taskDefinitionId.code,
            }
          : undefined,
      trigger: value === 'TriggerParentTask' ? data.trigger : undefined,
      // Initialize childTaskConfigurations if switching to CreateChildTasks
      childTaskConfigurations: value === 'CreateChildTasks' ? [] : undefined,
    };
    onChange(newData);
  };

  const handleViewProperties = () => {
    if (
      data.actionType === 'RunWorker' &&
      data.workerId &&
      onViewWorkerProperties
    ) {
      onViewWorkerProperties(data.workerId.scope, data.workerId.code);
    } else if (
      data.actionType === 'CreateChildTasks' &&
      data.taskDefinitionId &&
      onViewTaskDefinitionProperties
    ) {
      onViewTaskDefinitionProperties(
        data.taskDefinitionId.scope,
        data.taskDefinitionId.code
      );
    }
  };

  const handleAddChildTaskConfiguration = () => {
    if (!data.taskDefinitionId?.scope || !data.taskDefinitionId?.code) return;

    const newChildTaskConfig: ChildTaskConfiguration = {
      taskDefinitionId: {
        scope: data.taskDefinitionId.scope,
        code: data.taskDefinitionId.code,
      },
      initialTrigger: 'start',
      childTaskFields: {},
    };

    onChange({
      ...data,
      childTaskConfigurations: [newChildTaskConfig], // Only allow one configuration
    });
  };

  const handleRemoveChildTaskConfiguration = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({
      ...data,
      childTaskConfigurations: undefined,
    });
  };

  return (
    <>
      <OwnerTaskBadge owner={data.ownerTaskDefinition} />
      <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
        {/* Action Type Selector */}
        <div className="space-y-2">
          <Label>Action Type</Label>
          <Select
            value={data.actionType}
            onValueChange={(value) =>
              handleActionTypeChange(value as ActionType)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select action type" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="RunWorker">Run Worker</SelectItem>
              <SelectItem value="TriggerParentTask">
                Trigger Parent Task
              </SelectItem>
              <SelectItem value="CreateChildTasks">
                Create Child Tasks
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Conditional Fields based on Action Type */}
        {data.actionType === 'RunWorker' && (
          <Card className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <Label>Worker Details</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFieldMappings(true)}
                disabled={!data.workerId?.scope || !data.workerId?.code}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Field Mappings
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={data.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Enter action name"
              />
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Input
                value={data.workerId?.scope || ''}
                placeholder="Worker scope"
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={data.workerId?.code || ''}
                placeholder="Worker code"
                disabled
              />
            </div>
          </Card>
        )}

        {data.actionType === 'CreateChildTasks' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={data.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Enter action name"
              />
            </div>

            {/* Child Task Configuration Button */}
            {(!data.childTaskConfigurations ||
              data.childTaskConfigurations.length === 0) && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleAddChildTaskConfiguration}
                disabled={
                  !data.taskDefinitionId?.scope || !data.taskDefinitionId?.code
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Child Task Configuration
              </Button>
            )}

            {/* Child Task Configurations */}
            {data.childTaskConfigurations &&
              data.childTaskConfigurations.length > 0 && (
                <div className="rounded-lg border">
                  <Collapsible
                    open={isChildTaskExpanded}
                    onOpenChange={setIsChildTaskExpanded}
                  >
                    <CollapsibleTrigger className="flex w-full items-center justify-between rounded-t-lg px-4 py-2 font-medium hover:bg-gray-50">
                      <span>Child Task Configuration</span>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleRemoveChildTaskConfiguration}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <ChevronDown
                          className={`h-5 w-5 transition-transform duration-200 ${isChildTaskExpanded ? 'rotate-180 transform' : ''}`}
                        />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 p-4">
                      {data.childTaskConfigurations.map((config, index) => (
                        <div key={index} className="space-y-4">
                          <div className="space-y-2">
                            <Label>Task Definition ID</Label>
                            <Input
                              value={data.taskDefinitionId?.scope || ''}
                              disabled
                              className="bg-gray-50"
                              placeholder="Scope"
                            />
                            <Input
                              value={data.taskDefinitionId?.code || ''}
                              disabled
                              className="bg-gray-50"
                              placeholder="Code"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Initial Trigger</Label>
                            <Input
                              value={config.initialTrigger}
                              onChange={(e) => {
                                const updatedConfigs = [
                                  ...data.childTaskConfigurations!,
                                ];
                                updatedConfigs[index] = {
                                  ...config,
                                  initialTrigger: e.target.value,
                                };
                                onChange({
                                  ...data,
                                  childTaskConfigurations: updatedConfigs,
                                });
                              }}
                              placeholder="Initial trigger (e.g., start)"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Field Mappings</Label>
                            {Object.entries(config.childTaskFields || {}).map(
                              ([childField, mapping], mappingIndex) => (
                                <div
                                  key={mappingIndex}
                                  className="flex items-center space-x-2"
                                >
                                  <Input
                                    value={childField}
                                    onChange={(e) => {
                                      const updatedConfigs = [
                                        ...data.childTaskConfigurations!,
                                      ];
                                      const currentFields = {
                                        ...config.childTaskFields,
                                      };
                                      const currentValue =
                                        currentFields[childField];
                                      delete currentFields[childField];
                                      currentFields[e.target.value] =
                                        currentValue;
                                      updatedConfigs[index] = {
                                        ...config,
                                        childTaskFields: currentFields,
                                      };
                                      onChange({
                                        ...data,
                                        childTaskConfigurations: updatedConfigs,
                                      });
                                    }}
                                    placeholder="Child field"
                                    className="bg-gray-50"
                                  />
                                  <Input
                                    value={mapping.mapFrom}
                                    onChange={(e) => {
                                      const updatedConfigs = [
                                        ...data.childTaskConfigurations!,
                                      ];
                                      const currentFields = {
                                        ...config.childTaskFields,
                                      };
                                      currentFields[childField] = {
                                        mapFrom: e.target.value,
                                      };
                                      updatedConfigs[index] = {
                                        ...config,
                                        childTaskFields: currentFields,
                                      };
                                      onChange({
                                        ...data,
                                        childTaskConfigurations: updatedConfigs,
                                      });
                                    }}
                                    placeholder="Map from"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      const updatedConfigs = [
                                        ...data.childTaskConfigurations!,
                                      ];
                                      const currentFields = {
                                        ...config.childTaskFields,
                                      };
                                      delete currentFields[childField];
                                      updatedConfigs[index] = {
                                        ...config,
                                        childTaskFields: currentFields,
                                      };
                                      onChange({
                                        ...data,
                                        childTaskConfigurations: updatedConfigs,
                                      });
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              )
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                const updatedConfigs = [
                                  ...data.childTaskConfigurations!,
                                ];
                                const currentFields = {
                                  ...config.childTaskFields,
                                };
                                currentFields[''] = { mapFrom: '' };
                                updatedConfigs[index] = {
                                  ...config,
                                  childTaskFields: currentFields,
                                };
                                onChange({
                                  ...data,
                                  childTaskConfigurations: updatedConfigs,
                                });
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add Field Mapping
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}
          </div>
        )}

        {data.actionType === 'TriggerParentTask' && (
          <Card className="space-y-4 p-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={data.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Enter action name"
              />
            </div>
            <div className="space-y-2">
              <Label>Trigger</Label>
              <Input
                value={data.trigger || ''}
                onChange={(e) =>
                  onChange({
                    ...data,
                    trigger: e.target.value,
                  })
                }
                placeholder="Enter trigger name"
              />
            </div>
          </Card>
        )}
      </div>

      {/* Field Mappings Modal */}
      {data.actionType === 'RunWorker' && (
        <FieldMappingsView
          isOpen={showFieldMappings}
          onClose={() => setShowFieldMappings(false)}
          type="worker"
          mappings={{
            workerParameters: data.workerParameters,
            childTaskConfigurations: data.childTaskConfigurations,
          }}
          scope={data.workerId?.scope || ''}
          code={data.workerId?.code || ''}
          onViewProperties={handleViewProperties}
        />
      )}

      {data.actionType === 'CreateChildTasks' && (
        <FieldMappingsView
          isOpen={showFieldMappings}
          onClose={() => setShowFieldMappings(false)}
          type="childTask"
          mappings={{
            childTaskFields: data.childTaskFields || {},
          }}
          scope={data.taskDefinitionId?.scope || ''}
          code={data.taskDefinitionId?.code || ''}
          onViewProperties={handleViewProperties}
        />
      )}
    </>
  );
}
