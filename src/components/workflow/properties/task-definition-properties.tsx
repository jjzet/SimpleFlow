'use client';

import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Plus,
  X,
  ChevronDown,
  GitBranch,
  Info,
  AlertCircle,
  GripVertical,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TaskDefinitionData, WorkerNodeData } from '@/types/workflow';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScopeInput } from '@/components/ui/scope-input';
import { useWorkflow } from '@/contexts/workflow-context';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from 'react-beautiful-dnd';

interface FieldSchema {
  name: string;
  type: FieldType;
  description?: string;
  required: boolean;
  manualEntry?: boolean;
}

interface TaskDefinitionPropertiesProps {
  data: TaskDefinitionData;
  onChange: (data: Partial<TaskDefinitionData>) => void;
  nodeId: string;
}

type FieldType = 'DateTime' | 'String' | 'Decimal' | 'Boolean';

interface LinkedWorkerField {
  name: string;
  type: FieldType;
  description?: string;
  workerId: string;
  workerLabel: string;
}

export function TaskDefinitionProperties({
  data,
  onChange,
  nodeId,
}: TaskDefinitionPropertiesProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const { nodes, edges } = useWorkflow();
  const [linkedWorkerFields, setLinkedWorkerFields] = useState<
    LinkedWorkerField[]
  >([]);
  // Track which fields are in manual entry mode
  const [manualEntryFields, setManualEntryFields] = useState<number[]>([]);

  // Function to check if a field in the schema is from a linked worker
  const isLinkedWorkerField = (
    fieldName: string
  ): LinkedWorkerField | undefined => {
    return linkedWorkerFields.find((field) => field.name === fieldName);
  };

  // Find workers that link to this task definition
  useEffect(() => {
    // Find edges that link workers to this task definition
    const linkEdges = edges.filter(
      (edge) => edge.type === 'linkChildTask' && edge.target === nodeId
    );

    if (linkEdges.length === 0) {
      setLinkedWorkerFields([]);
      return;
    }

    // Find worker nodes that are linked to this task definition
    const linkedWorkerNodes = linkEdges
      .map((edge) => {
        return nodes.find((node) => node.id === edge.source);
      })
      .filter(Boolean);

    // Extract field information from linked workers
    const fields: LinkedWorkerField[] = [];
    linkedWorkerNodes.forEach((worker) => {
      if (
        worker &&
        worker.data.childTask &&
        worker.data.childTask.fieldMappings
      ) {
        worker.data.childTask.fieldMappings.forEach(
          (mapping: {
            childField: string;
            mapFrom: string;
            fieldType?: string;
            description?: string;
          }) => {
            // First try to get type directly from the field mapping
            let fieldType: FieldType = 'String';
            let description = mapping.description || '';

            // If fieldType is available directly in the mapping, use that
            if (mapping.fieldType) {
              fieldType = mapLusidToFieldType(mapping.fieldType);
            }
            // Otherwise try to find the type from worker parameters
            else if (worker.data.parameters) {
              const parameterField = worker.data.parameters.find(
                (param: {
                  name: string;
                  type?: string;
                  description?: string;
                }) => param.name === mapping.mapFrom
              );

              if (parameterField) {
                // Map parameter type to field type
                if (parameterField.type) {
                  fieldType = (parameterField.type as FieldType) || 'String';
                }

                // Get description if not already set
                if (!description) {
                  description = parameterField.description || '';
                }
              } else {
                // If no exact parameter match found, try to match by patterns in the mapFrom name
                const parts = mapping.mapFrom.split('.');
                if (parts.length > 1) {
                  const fieldName = parts[parts.length - 1];
                  const possibleParam = worker.data.parameters.find(
                    (param: { name: string }) => param.name === fieldName
                  );

                  if (possibleParam) {
                    if (possibleParam.type) {
                      fieldType = (possibleParam.type as FieldType) || 'String';
                    }
                    if (!description) {
                      description = possibleParam.description || '';
                    }
                  }
                }
              }
            }

            fields.push({
              name: mapping.childField,
              type: fieldType,
              description: description,
              workerId: worker.id,
              workerLabel: worker.data.label || 'Worker',
            });
          }
        );
      }
    });

    setLinkedWorkerFields(fields);
  }, [nodeId, edges, nodes]);

  // Add a helper function to map LUSID data types to field types
  const mapLusidToFieldType = (lusidType: string): FieldType => {
    const typeMap: Record<string, FieldType> = {
      Text: 'String',
      DateTime: 'DateTime',
      Decimal: 'Decimal',
      Int: 'Decimal',
      Boolean: 'Boolean',
      String: 'String', // Handle cases where the type is already in our format
    };

    return typeMap[lusidType] || 'String';
  };

  // Maps LUSID field types to task definition field types
  const mapFieldType = (lusidType: string): FieldType => {
    const typeMap: Record<string, FieldType> = {
      Text: 'String',
      DateTime: 'DateTime',
      Decimal: 'Decimal',
      Int: 'Decimal',
      Boolean: 'Boolean',
    };

    return typeMap[lusidType] || 'String';
  };

  const handleFieldSchemaChange = (
    fieldSchema: TaskDefinitionData['fieldSchema']
  ) => {
    onChange({ fieldSchema });
  };

  // Function to get field options for dropdown
  const getFieldOptions = () => {
    return linkedWorkerFields.map((field) => ({
      value: field.name,
      label: field.name,
      type: field.type,
      description: field.description,
      workerId: field.workerId,
      workerLabel: field.workerLabel,
    }));
  };

  // Function to add a new field
  const handleAddField = () => {
    const newSchema = [
      ...(data.fieldSchema || []),
      { name: '', type: 'String' as const, required: false },
    ];
    const newData = { ...data, fieldSchema: newSchema };
    onChange(newData);
  };

  // Check if a field is in manual entry mode
  const isManualEntry = (index: number): boolean => {
    return manualEntryFields.includes(index);
  };

  // Handle the end of a drag operation
  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    // If dropped outside the droppable area or at the same position, do nothing
    if (!destination || source.index === destination.index) {
      return;
    }

    // Create a copy of the field schema array
    const newFieldSchema = [...(data.fieldSchema || [])];

    // Remove the dragged item from its original position
    const [movedItem] = newFieldSchema.splice(source.index, 1);

    // Insert the dragged item at the new position
    newFieldSchema.splice(destination.index, 0, movedItem);

    // Update the state with the reordered field schema
    onChange({ fieldSchema: newFieldSchema });

    // Update the manual entry fields indices to reflect the new order
    if (manualEntryFields.length > 0) {
      const updatedManualEntryFields = manualEntryFields.map((index) => {
        if (index === source.index) {
          return destination.index;
        } else if (index > source.index && index <= destination.index) {
          return index - 1; // Shift up items that were after the source and before/at the destination
        } else if (index < source.index && index >= destination.index) {
          return index + 1; // Shift down items that were before the source and after/at the destination
        }
        return index;
      });

      setManualEntryFields(updatedManualEntryFields);
    }
  };

  return (
    <div className="max-h-[60vh] space-y-6 overflow-y-auto pr-2">
      {/* Label Field */}
      <div className="space-y-2">
        <Label htmlFor="label">Label</Label>
        <Input
          id="label"
          value={data.label || ''}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Enter label"
        />
      </div>

      {/* Identification Section */}
      <div className="space-y-4">
        <ScopeInput
          id="scope"
          label="Scope"
          value={data.scope || ''}
          onChange={(value) => {
            const newData = { ...data, scope: value };
            onChange(newData);
          }}
          placeholder="Enter scope"
        />

        <div className="space-y-2">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            value={data.code || ''}
            onChange={(e) => {
              const newData = { ...data, code: e.target.value };
              onChange(newData);
            }}
            placeholder="Enter code"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={data.displayName || ''}
            onChange={(e) => {
              const newData = { ...data, displayName: e.target.value };
              onChange(newData);
            }}
            placeholder="Enter display name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={data.description || ''}
            onChange={(e) => {
              const newData = { ...data, description: e.target.value };
              onChange(newData);
            }}
            placeholder="Enter description"
            className="h-20"
          />
        </div>
      </div>

      {/* Field Schema Section */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-2 py-2 font-medium hover:bg-gray-50">
          <span>Field Schema</span>
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? 'rotate-180 transform' : ''}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4">
          {linkedWorkerFields.length > 0 && (
            <div className="flex items-center space-x-2 rounded-md border border-blue-100 bg-blue-50 p-2 text-sm text-blue-700">
              <Info className="h-4 w-4" />
              <span>
                Fields imported from linked workers have a{' '}
                <GitBranch className="inline h-3 w-3" /> icon and cannot be
                edited
              </span>
            </div>
          )}

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="fieldsDroppable">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-3"
                >
                  {(data.fieldSchema || []).map((field, index) => {
                    const linkedField = isLinkedWorkerField(field.name);
                    const isLinked = !!linkedField;
                    const showNameSelect =
                      field.name === '' &&
                      !isManualEntry(index) &&
                      linkedWorkerFields.length > 0;

                    return (
                      <Draggable
                        key={index}
                        draggableId={`field-${index}`}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              'flex items-start space-x-2 rounded-md border p-2',
                              isLinked && 'border-blue-100 bg-blue-50',
                              snapshot.isDragging && 'border-dashed shadow-lg'
                            )}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="flex h-full cursor-grab items-center justify-center px-1"
                            >
                              <GripVertical className="h-4 w-4 text-gray-400" />
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center space-x-2">
                                {isLinked && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <GitBranch className="h-4 w-4 text-blue-500" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>
                                          This field is imported from worker
                                          &quot;{linkedField.workerLabel}&quot;
                                        </p>
                                        <p>Type: {linkedField.type}</p>
                                        {linkedField.description && (
                                          <p>
                                            Description:{' '}
                                            {linkedField.description}
                                          </p>
                                        )}
                                        <p>It cannot be edited here</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {showNameSelect ? (
                                  <Select
                                    value="select"
                                    onValueChange={(value) => {
                                      if (value === '__manual__') {
                                        // Set flag for manual entry
                                        setManualEntryFields((prev) => [
                                          ...prev,
                                          index,
                                        ]);
                                      } else {
                                        // Handle linked worker field selection
                                        const selectedOption =
                                          getFieldOptions().find(
                                            (opt) => opt.value === value
                                          );
                                        if (selectedOption) {
                                          const newSchema = [
                                            ...(data.fieldSchema || []),
                                          ];
                                          newSchema[index] = {
                                            name: selectedOption.value,
                                            type: selectedOption.type,
                                            description:
                                              selectedOption.description || '',
                                            required: false,
                                          };
                                          const newData = {
                                            ...data,
                                            fieldSchema: newSchema,
                                          };
                                          onChange(newData);
                                        }
                                      }
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Field name" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__manual__">
                                        Enter manually
                                      </SelectItem>
                                      {getFieldOptions()
                                        .filter(
                                          (option) =>
                                            !(data.fieldSchema || []).some(
                                              (field) =>
                                                field.name === option.value
                                            )
                                        )
                                        .map((option) => (
                                          <SelectItem
                                            key={option.value}
                                            value={option.value}
                                            title={`Type: ${option.type}, Description: ${option.description || 'None'}`}
                                          >
                                            <div className="flex flex-col">
                                              <span>{option.label}</span>
                                              <span className="text-xs text-muted-foreground">
                                                {option.type} - from{' '}
                                                {option.workerLabel}
                                              </span>
                                            </div>
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    value={field.name}
                                    onChange={(e) => {
                                      const newSchema = [
                                        ...(data.fieldSchema || []),
                                      ];
                                      newSchema[index] = {
                                        ...field,
                                        name: e.target.value,
                                      };
                                      const newData = {
                                        ...data,
                                        fieldSchema: newSchema,
                                      };
                                      onChange(newData);
                                    }}
                                    placeholder="Field name"
                                    disabled={isLinked}
                                    className={cn(
                                      isLinked &&
                                        'bg-blue-50 font-medium text-blue-700'
                                    )}
                                  />
                                )}
                              </div>
                              <Select
                                value={field.type}
                                onValueChange={(value: FieldType) => {
                                  const newSchema = [
                                    ...(data.fieldSchema || []),
                                  ];
                                  newSchema[index] = { ...field, type: value };
                                  const newData = {
                                    ...data,
                                    fieldSchema: newSchema,
                                  };
                                  onChange(newData);
                                }}
                                disabled={isLinked}
                              >
                                <SelectTrigger
                                  className={cn(isLinked && 'bg-blue-50')}
                                >
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent className="border bg-white shadow-md">
                                  <SelectItem value="DateTime">
                                    DateTime
                                  </SelectItem>
                                  <SelectItem value="String">String</SelectItem>
                                  <SelectItem value="Decimal">
                                    Decimal
                                  </SelectItem>
                                  <SelectItem value="Boolean">
                                    Boolean
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                value={field.description || ''}
                                onChange={(e) => {
                                  const newSchema = [
                                    ...(data.fieldSchema || []),
                                  ];
                                  newSchema[index] = {
                                    ...field,
                                    description: e.target.value,
                                  };
                                  const newData = {
                                    ...data,
                                    fieldSchema: newSchema,
                                  };
                                  onChange(newData);
                                }}
                                placeholder="Field description (optional)"
                                disabled={isLinked}
                                className={cn(isLinked && 'bg-blue-50')}
                              />
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={field.required}
                                  onCheckedChange={(checked) => {
                                    const newSchema = [
                                      ...(data.fieldSchema || []),
                                    ];
                                    newSchema[index] = {
                                      ...field,
                                      required: checked,
                                    };
                                    const newData = {
                                      ...data,
                                      fieldSchema: newSchema,
                                    };
                                    onChange(newData);
                                  }}
                                  disabled={isLinked}
                                />
                                <Label>Required</Label>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newSchema = [...(data.fieldSchema || [])];
                                newSchema.splice(index, 1);
                                const newData = {
                                  ...data,
                                  fieldSchema: newSchema,
                                };
                                onChange(newData);

                                // Remove from manual entry tracking if it was there
                                if (isManualEntry(index)) {
                                  setManualEntryFields((prev) =>
                                    prev.filter((i) => i !== index)
                                  );
                                }
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleAddField}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Field
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
