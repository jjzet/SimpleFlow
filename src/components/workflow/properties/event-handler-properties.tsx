import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Node, Edge } from 'reactflow';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, X, ChevronDown, Filter, Shield } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { eventTypesByApplication, eventTypes } from '@/data/eventTypes';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useWorkflow } from '@/contexts/workflow-context';
import { ScopeInput } from '@/components/ui/scope-input';

interface EventHandlerPropertiesProps {
  node: Node;
  onChange: (id: string, data: any) => void;
}

// Simple filter expression interface
interface FilterExpression {
  field: string;
  operator: string;
  value: string;
}

// Simple correlation ID interface
interface CorrelationId {
  id: string;
  mapFrom: string | null;
  setTo: string;
}

// Simple task field mapping interface
interface TaskFieldMapping {
  id: string;
  field: string;
  mappingType: 'mapFrom' | 'setTo';
  value: string;
}

export function EventHandlerProperties({
  node,
  onChange,
}: EventHandlerPropertiesProps) {
  const [isEventTypeExpanded, setIsEventTypeExpanded] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isTaskActivityExpanded, setIsTaskActivityExpanded] = useState(false);
  const [isCorrelationIdsExpanded, setIsCorrelationIdsExpanded] =
    useState(false);
  const [isTaskFieldsExpanded, setIsTaskFieldsExpanded] = useState(false);
  const [showFilterBuilder, setShowFilterBuilder] = useState(false);
  const [filterExpressions, setFilterExpressions] = useState<
    FilterExpression[]
  >([]);
  const [taskDefinitionData, setTaskDefinitionData] = useState<{
    scope: string;
    code: string;
  } | null>(null);
  // Add state for tracking field name edits to prevent focus loss
  const [editingFieldNames, setEditingFieldNames] = useState<
    Record<string, string>
  >({});

  // Get task definition data from the node or from connected edges
  const { edges, nodes } = useWorkflow();

  // Find the connected edge and target node
  const connectedEdge = edges.find(
    (edge) => edge.source === node.id && edge.type === 'eventHandler'
  );

  const targetNodeId = connectedEdge?.target;
  const targetNode = targetNodeId
    ? nodes.find((n) => n.id === targetNodeId)
    : null;

  // Effect to set task definition data
  useEffect(() => {
    // First try to get from target node (highest priority to ensure we always have the latest data)
    if (targetNode?.data?.scope && targetNode?.data?.code) {
      const newTaskDefinitionData = {
        scope: targetNode.data.scope,
        code: targetNode.data.code,
      };

      setTaskDefinitionData(newTaskDefinitionData);

      // Update the node data with the task definition ID from the target node
      // Only update if the data has changed to avoid infinite loops
      if (
        node.data.taskDefinitionId?.scope !== newTaskDefinitionData.scope ||
        node.data.taskDefinitionId?.code !== newTaskDefinitionData.code
      ) {
        onChange(node.id, {
          ...node.data,
          taskDefinitionId: newTaskDefinitionData,
        });
      }
      return;
    }

    // Then try to get from edge data
    if (
      connectedEdge?.data?.taskDefinitionId?.scope &&
      connectedEdge?.data?.taskDefinitionId?.code
    ) {
      setTaskDefinitionData({
        scope: connectedEdge.data.taskDefinitionId.scope,
        code: connectedEdge.data.taskDefinitionId.code,
      });

      // Update the node data with the task definition ID from the edge
      if (
        node.data.taskDefinitionId?.scope !==
          connectedEdge.data.taskDefinitionId.scope ||
        node.data.taskDefinitionId?.code !==
          connectedEdge.data.taskDefinitionId.code
      ) {
        onChange(node.id, {
          ...node.data,
          taskDefinitionId: {
            scope: connectedEdge.data.taskDefinitionId.scope,
            code: connectedEdge.data.taskDefinitionId.code,
          },
        });
      }
      return;
    }

    // Finally try to get from node data
    if (node.data.taskDefinitionId?.scope && node.data.taskDefinitionId?.code) {
      setTaskDefinitionData({
        scope: node.data.taskDefinitionId.scope,
        code: node.data.taskDefinitionId.code,
      });
      return;
    }

    setTaskDefinitionData(null);
  }, [node.id, node.data, connectedEdge, targetNode, onChange, nodes]);

  // Initialize editing field names when task fields change
  useEffect(() => {
    if (node.data.taskFields) {
      const fieldNames = Object.keys(node.data.taskFields);
      const newEditingFieldNames: Record<string, string> = {};

      fieldNames.forEach((fieldName) => {
        if (!editingFieldNames[fieldName]) {
          newEditingFieldNames[fieldName] = '';
        } else {
          newEditingFieldNames[fieldName] = editingFieldNames[fieldName];
        }
      });

      setEditingFieldNames(newEditingFieldNames);
    }
  }, [node.data.taskFields]);

  const handleChange = (key: string, value: any) => {
    onChange(node.id, { ...node.data, [key]: value });
  };

  // Get the selected event type
  const selectedEventType = node.data.eventType
    ? eventTypes.find((et) => et.id === node.data.eventType)
    : null;

  // Add a correlation ID
  const handleAddCorrelationId = () => {
    const correlationIds = [...(node.data.correlationIds || [])];
    correlationIds.push({
      id: Math.random().toString(36).substring(2, 9),
      mapFrom: null,
      setTo: '',
    });
    handleChange('correlationIds', correlationIds);
  };

  // Remove a correlation ID
  const handleRemoveCorrelationId = (id: string) => {
    const correlationIds = (node.data.correlationIds || []).filter(
      (cid: CorrelationId) => cid.id !== id
    );
    handleChange('correlationIds', correlationIds);
  };

  // Update a correlation ID
  const handleUpdateCorrelationId = (
    id: string,
    field: 'mapFrom' | 'setTo',
    value: string
  ) => {
    const correlationIds = (node.data.correlationIds || []).map(
      (cid: CorrelationId) => {
        if (cid.id === id) {
          return { ...cid, [field]: value };
        }
        return cid;
      }
    );
    handleChange('correlationIds', correlationIds);
  };

  // Add a task field mapping
  const handleAddTaskField = () => {
    const taskFields = { ...(node.data.taskFields || {}) };

    // Generate a unique ID for the field
    const fieldId = `field_${Math.random().toString(36).substring(2, 9)}`;

    // Use an empty string as the field name to allow free-form entry
    taskFields[fieldId] = { mapFrom: '', setTo: undefined };
    handleChange('taskFields', taskFields);

    // Add to editing field names with empty string
    setEditingFieldNames((prev) => ({
      ...prev,
      [fieldId]: '',
    }));
  };

  // Remove a task field mapping
  const handleRemoveTaskField = (fieldName: string) => {
    const taskFields = { ...(node.data.taskFields || {}) };
    delete taskFields[fieldName];
    handleChange('taskFields', taskFields);

    // Remove from editing field names
    setEditingFieldNames((prev) => {
      const newEditingFieldNames = { ...prev };
      delete newEditingFieldNames[fieldName];
      return newEditingFieldNames;
    });
  };

  // Update a task field mapping
  const handleUpdateTaskField = (
    fieldName: string,
    type: 'mapFrom' | 'setTo',
    value: string
  ) => {
    const taskFields = { ...(node.data.taskFields || {}) };
    if (type === 'mapFrom') {
      taskFields[fieldName] = { mapFrom: value, setTo: undefined };
    } else {
      taskFields[fieldName] = { mapFrom: undefined, setTo: value };
    }
    handleChange('taskFields', taskFields);
  };

  // Handle field name change without losing focus
  const handleFieldNameInputChange = (
    oldFieldName: string,
    newFieldName: string
  ) => {
    setEditingFieldNames((prev) => ({
      ...prev,
      [oldFieldName]: newFieldName,
    }));
  };

  // Apply field name change when input loses focus
  const handleFieldNameBlur = (oldFieldName: string) => {
    const newFieldName = editingFieldNames[oldFieldName];

    // If the field name is empty, generate a placeholder name
    if (!newFieldName || newFieldName.trim() === '') {
      const placeholderName = `field_${Math.random().toString(36).substring(2, 7)}`;
      setEditingFieldNames((prev) => ({
        ...prev,
        [oldFieldName]: placeholderName,
      }));

      // Update the task fields with the placeholder name
      const taskFields = { ...(node.data.taskFields || {}) };
      taskFields[placeholderName] = taskFields[oldFieldName];
      delete taskFields[oldFieldName];
      handleChange('taskFields', taskFields);

      return;
    }

    // If the field name hasn't changed, do nothing
    if (newFieldName === oldFieldName) {
      return;
    }

    const taskFields = { ...(node.data.taskFields || {}) };

    // Check if the new field name already exists
    if (taskFields[newFieldName] && newFieldName !== oldFieldName) {
      // Reset to the old field name
      setEditingFieldNames((prev) => ({
        ...prev,
        [oldFieldName]: oldFieldName,
      }));
      return;
    }

    // Copy the mapping to the new field name
    taskFields[newFieldName] = taskFields[oldFieldName];
    // Delete the old field name
    delete taskFields[oldFieldName];

    // Update the task fields
    handleChange('taskFields', taskFields);

    // Update editing field names
    setEditingFieldNames((prev) => {
      const newEditingFieldNames = { ...prev };
      delete newEditingFieldNames[oldFieldName];
      newEditingFieldNames[newFieldName] = newFieldName;
      return newEditingFieldNames;
    });
  };

  // Add a filter expression
  const handleAddFilterExpression = () => {
    setFilterExpressions([
      ...filterExpressions,
      { field: '', operator: 'eq', value: '' },
    ]);
  };

  // Remove a filter expression
  const handleRemoveFilterExpression = (index: number) => {
    const newExpressions = [...filterExpressions];
    newExpressions.splice(index, 1);
    setFilterExpressions(newExpressions);
  };

  // Update a filter expression
  const handleUpdateFilterExpression = (
    index: number,
    field: keyof FilterExpression,
    value: string
  ) => {
    const newExpressions = [...filterExpressions];
    newExpressions[index] = { ...newExpressions[index], [field]: value };
    setFilterExpressions(newExpressions);
  };

  // Build the filter string from expressions
  const buildFilterString = () => {
    if (filterExpressions.length === 0) return '';

    return filterExpressions
      .map((expr) => {
        // Add Body. prefix to field name
        const fieldWithPrefix = expr.field ? `Body.${expr.field}` : '';
        return `${fieldWithPrefix} ${expr.operator} '${expr.value}'`;
      })
      .join(' AND ');
  };

  // Save the filter
  const handleSaveFilter = () => {
    const filterString = buildFilterString();
    handleChange('filter', filterString);
    setShowFilterBuilder(false);
  };

  // Parse the filter string into expressions
  const parseFilterString = (filterString: string) => {
    if (!filterString) return [];

    const expressions = filterString.split(' AND ').map((expr) => {
      const match = expr.match(/Body\.([^\s]+)\s+([^\s]+)\s+'([^']+)'/);
      if (match) {
        return {
          field: match[1],
          operator: match[2],
          value: match[3],
        };
      }
      return { field: '', operator: 'eq', value: '' };
    });

    return expressions;
  };

  // Initialize filter expressions from the filter string
  useEffect(() => {
    if (node.data.filter) {
      setFilterExpressions(parseFilterString(node.data.filter));
    }
  }, [node.data.filter]);

  // Helper to create a clean filter summary display
  const createFilterSummary = (filter: string): React.ReactNode => {
    if (!filter) return null;

    const conditions = filter.split(' AND ');
    if (conditions.length === 1) {
      // For a single condition, show it directly
      return (
        <span className="inline-block max-w-[200px] truncate text-sm text-gray-600">
          {filter}
        </span>
      );
    }

    // For multiple conditions, show a badge with the count
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700">
        {conditions.length} conditions
      </Badge>
    );
  };

  return (
    <div className="max-h-[60vh] space-y-6 overflow-y-auto pr-2">
      {/* Basic Properties */}
      <div className="space-y-2">
        <Label htmlFor="label">Label</Label>
        <Input
          id="label"
          value={node.data.label || ''}
          onChange={(e) => handleChange('label', e.target.value)}
        />
      </div>

      <div className="space-y-4">
        <ScopeInput
          id="scope"
          label="Scope"
          value={node.data.scope || ''}
          onChange={(value) => handleChange('scope', value)}
        />

        <div className="space-y-2">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            value={node.data.code || ''}
            onChange={(e) => handleChange('code', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayName">Display Name</Label>
        <Input
          id="displayName"
          value={node.data.displayName || ''}
          onChange={(e) => handleChange('displayName', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={node.data.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
        />
      </div>

      {/* Event Type Section */}
      <Card className="overflow-hidden rounded-lg border">
        <Collapsible
          open={isEventTypeExpanded}
          onOpenChange={setIsEventTypeExpanded}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2 font-medium hover:bg-gray-50">
            <span>Event Type</span>
            <ChevronDown
              className={`h-5 w-5 transition-transform duration-200 ${isEventTypeExpanded ? 'rotate-180 transform' : ''}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t p-4">
            <div className="space-y-4">
              <Select
                value={node.data.eventType || ''}
                onValueChange={(value) => handleChange('eventType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an event type" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {Object.entries(eventTypesByApplication).map(
                    ([application, events]) => (
                      <SelectGroup key={application}>
                        <SelectLabel className="bg-gray-50 px-2 py-2 text-sm font-semibold">
                          {application}
                        </SelectLabel>
                        {events.map((event) => (
                          <SelectItem
                            key={event.id}
                            value={event.id}
                            className="text-sm"
                          >
                            {event.displayName}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )
                  )}
                </SelectContent>
              </Select>

              {selectedEventType && (
                <div className="text-sm text-gray-600">
                  <p>{selectedEventType.description}</p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Filter Section */}
      <Card className="overflow-hidden rounded-lg border">
        <Collapsible open={isFilterExpanded} onOpenChange={setIsFilterExpanded}>
          <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2 font-medium hover:bg-gray-50">
            <div className="flex items-center space-x-2">
              <span>Filter</span>
              {node.data.filter && (
                <div className="ml-2">
                  {createFilterSummary(node.data.filter)}
                </div>
              )}
            </div>
            <ChevronDown
              className={`h-5 w-5 transition-transform duration-200 ${isFilterExpanded ? 'rotate-180 transform' : ''}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t p-4">
            <div className="space-y-4">
              {node.data.filter ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="max-h-[100px] flex-1 overflow-auto rounded-md border bg-gray-50 p-2 text-sm text-gray-600">
                      <pre className="whitespace-pre-wrap">
                        {node.data.filter}
                      </pre>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilterBuilder(true)}
                      className="ml-2 flex-shrink-0"
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilterBuilder(true)}
                  className="w-full"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Add Filter
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Task Activity Section */}
      <Card className="overflow-hidden rounded-lg border">
        <Collapsible
          open={isTaskActivityExpanded}
          onOpenChange={setIsTaskActivityExpanded}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2 font-medium hover:bg-gray-50">
            <div className="flex items-center space-x-2">
              <span>Task Activity</span>
            </div>
            <ChevronDown
              className={`h-5 w-5 transition-transform duration-200 ${isTaskActivityExpanded ? 'rotate-180 transform' : ''}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t p-4">
            <div className="space-y-4">
              {taskDefinitionData ? (
                <>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Task Definition Scope</Label>
                      <Input
                        value={taskDefinitionData.scope}
                        disabled
                        className="w-full bg-gray-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Task Definition Code</Label>
                      <Input
                        value={taskDefinitionData.code}
                        disabled
                        className="w-full bg-gray-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="initialTrigger">Initial Trigger</Label>
                      <Input
                        id="initialTrigger"
                        value={node.data.initialTrigger || 'start'}
                        onChange={(e) =>
                          handleChange('initialTrigger', e.target.value)
                        }
                        placeholder="e.g., start, complete"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-md bg-gray-50 p-2 text-sm text-gray-600">
                  Connect this event handler to a task definition to configure
                  task activity.
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Correlation IDs Section */}
      <Card className="overflow-hidden rounded-lg border">
        <Collapsible
          open={isCorrelationIdsExpanded}
          onOpenChange={setIsCorrelationIdsExpanded}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2 font-medium hover:bg-gray-50">
            <span>Correlation IDs</span>
            <ChevronDown
              className={`h-5 w-5 transition-transform duration-200 ${isCorrelationIdsExpanded ? 'rotate-180 transform' : ''}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t p-4">
            <div className="space-y-4">
              {(node.data.correlationIds || []).map((cid: CorrelationId) => (
                <div
                  key={cid.id}
                  className="flex items-start space-x-2 rounded-md border p-2"
                >
                  <div className="flex-grow space-y-3">
                    <div className="w-full space-y-1">
                      <Label className="text-xs">Map From</Label>
                      <Input
                        value={cid.mapFrom || ''}
                        onChange={(e) =>
                          handleUpdateCorrelationId(
                            cid.id,
                            'mapFrom',
                            e.target.value
                          )
                        }
                        placeholder="Event field"
                        className="w-full"
                      />
                    </div>
                    <div className="w-full space-y-1">
                      <Label className="text-xs">Set To</Label>
                      <Input
                        value={cid.setTo || ''}
                        onChange={(e) =>
                          handleUpdateCorrelationId(
                            cid.id,
                            'setTo',
                            e.target.value
                          )
                        }
                        placeholder="Correlation ID"
                        className="w-full"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCorrelationId(cid.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddCorrelationId}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Correlation ID
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Task Fields Section */}
      <Card className="overflow-hidden rounded-lg border">
        <Collapsible
          open={isTaskFieldsExpanded}
          onOpenChange={setIsTaskFieldsExpanded}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2 font-medium hover:bg-gray-50">
            <span>Task Fields</span>
            <ChevronDown
              className={`h-5 w-5 transition-transform duration-200 ${isTaskFieldsExpanded ? 'rotate-180 transform' : ''}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t p-4">
            <div className="space-y-4">
              {Object.entries(node.data.taskFields || {}).map(
                ([fieldName, mapping]: [string, any]) => (
                  <div
                    key={fieldName}
                    className="flex items-start space-x-2 rounded-md border p-2"
                  >
                    <div className="flex-grow space-y-2">
                      <div className="flex items-center space-x-2">
                        <Label className="w-24">Field Name</Label>
                        <Input
                          value={editingFieldNames[fieldName] || ''}
                          onChange={(e) =>
                            handleFieldNameInputChange(
                              fieldName,
                              e.target.value
                            )
                          }
                          onBlur={() => handleFieldNameBlur(fieldName)}
                          className="flex-grow"
                          placeholder="Enter custom field name"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label className="w-24">Mapping Type</Label>
                        <Select
                          value={
                            mapping.mapFrom !== undefined ? 'mapFrom' : 'setTo'
                          }
                          onValueChange={(value: 'mapFrom' | 'setTo') => {
                            handleUpdateTaskField(
                              fieldName,
                              value,
                              value === 'mapFrom'
                                ? mapping.mapFrom || ''
                                : mapping.setTo || ''
                            );
                          }}
                        >
                          <SelectTrigger className="flex-grow">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mapFrom">Map From</SelectItem>
                            <SelectItem value="setTo">Set To</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label className="w-24">Value</Label>
                        {mapping.mapFrom !== undefined &&
                        selectedEventType &&
                        selectedEventType.bodySchema.length > 0 ? (
                          <Select
                            value={mapping.mapFrom}
                            onValueChange={(value) => {
                              handleUpdateTaskField(
                                fieldName,
                                'mapFrom',
                                value
                              );
                            }}
                          >
                            <SelectTrigger className="flex-grow">
                              <SelectValue placeholder="Select event field" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedEventType.bodySchema.map((field) => (
                                <SelectItem key={field.name} value={field.name}>
                                  {field.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={
                              mapping.mapFrom !== undefined
                                ? mapping.mapFrom
                                : mapping.setTo || ''
                            }
                            onChange={(e) => {
                              handleUpdateTaskField(
                                fieldName,
                                mapping.mapFrom !== undefined
                                  ? 'mapFrom'
                                  : 'setTo',
                                e.target.value
                              );
                            }}
                            placeholder={
                              mapping.mapFrom !== undefined
                                ? 'Event field'
                                : 'Value'
                            }
                            className="flex-grow"
                          />
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveTaskField(fieldName)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddTaskField}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Task Field
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Filter Builder Dialog */}
      <Dialog open={showFilterBuilder} onOpenChange={setShowFilterBuilder}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Build Filter Expression</DialogTitle>
            <DialogDescription>
              Create a filter to match specific events based on their
              properties.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-4">
            {filterExpressions.map((expr, index) => (
              <div
                key={index}
                className="flex items-start space-x-2 rounded-md border p-2"
              >
                <div className="grid flex-grow grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Field</Label>
                    {selectedEventType &&
                    selectedEventType.bodySchema.length > 0 ? (
                      <Select
                        value={expr.field}
                        onValueChange={(value) =>
                          handleUpdateFilterExpression(index, 'field', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedEventType.bodySchema.map((field) => (
                            <SelectItem key={field.name} value={field.name}>
                              {field.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={expr.field}
                        onChange={(e) =>
                          handleUpdateFilterExpression(
                            index,
                            'field',
                            e.target.value
                          )
                        }
                        placeholder="Field name"
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Operator</Label>
                    <Select
                      value={expr.operator}
                      onValueChange={(value) =>
                        handleUpdateFilterExpression(index, 'operator', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eq">equals</SelectItem>
                        <SelectItem value="ne">not equals</SelectItem>
                        <SelectItem value="gt">greater than</SelectItem>
                        <SelectItem value="lt">less than</SelectItem>
                        <SelectItem value="ge">
                          greater than or equal
                        </SelectItem>
                        <SelectItem value="le">less than or equal</SelectItem>
                        <SelectItem value="startsWith">starts with</SelectItem>
                        <SelectItem value="endsWith">ends with</SelectItem>
                        <SelectItem value="contains">contains</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Value</Label>
                    <Input
                      value={expr.value}
                      onChange={(e) =>
                        handleUpdateFilterExpression(
                          index,
                          'value',
                          e.target.value
                        )
                      }
                      placeholder="Value"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFilterExpression(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={handleAddFilterExpression}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Expression
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowFilterBuilder(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveFilter}>Apply Filter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
