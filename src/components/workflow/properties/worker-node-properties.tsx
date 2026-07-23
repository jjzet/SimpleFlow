'use client';

import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Plus,
  X,
  ChevronDown,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { WorkerNodeData } from '@/types/workflow';
import { OwnerTaskBadge } from '@/components/ui/owner-task-badge';
import { useWorkflow } from '@/contexts/workflow-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScopeInput } from '@/components/ui/scope-input';
import {
  lusidApiService,
  LusidProvider,
  LusidField,
  PROVIDERS_CHANGED_EVENT,
} from '@/lib/services/lusid-api-service';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { LUSID_SETTINGS_CHANGED_EVENT } from '@/components/workflow/workflow-tools-menu';
import { HierarchicalSelect } from '@/components/ui/hierarchical-select';
import { Textarea } from '@/components/ui/textarea';

interface WorkerNodePropertiesProps {
  data: WorkerNodeData;
  onChange: (data: Partial<WorkerNodeData>) => void;
  nodeId: string;
}

export function WorkerNodeProperties({
  data,
  onChange,
  nodeId,
}: WorkerNodePropertiesProps) {
  // State for collapsible sections
  const [isParametersExpanded, setIsParametersExpanded] = React.useState(true);
  const [isChildTaskExpanded, setIsChildTaskExpanded] = React.useState(false);
  const { edges, updateEdgeData } = useWorkflow();
  const { toast } = useToast();

  // LUSID providers state
  const [lusidProviders, setLusidProviders] = useState<LusidProvider[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [providersError, setProvidersError] = useState<string | null>(null);

  // Store the selected provider separately to persist it
  const [selectedProvider, setSelectedProvider] = useState<string | null>(
    data.workerViewName || null
  );

  // LUSID fields state
  const [lusidFields, setLusidFields] = useState<LusidField[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [fieldsError, setFieldsError] = useState<string | null>(null);

  // Function to fetch LUSID providers with aggregation
  const fetchLusidProviders = React.useCallback(async () => {
    if (!lusidApiService.hasSettings()) {
      setProvidersError('LUSID connection not configured');
      return;
    }

    setIsLoadingProviders(true);
    setProvidersError(null);

    try {
      // Use the aggregation method to get a more complete set of providers
      const providers = await lusidApiService.aggregateProviders();
      setLusidProviders(providers);
    } catch (error) {
      console.error('Failed to fetch LUSID providers:', error);
      setProvidersError('Failed to load LUSID providers');
      toast({
        title: 'Error Loading Providers',
        description:
          'Could not load LUSID providers. Please check your connection settings.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingProviders(false);
    }
  }, [toast]);

  // Function to fetch LUSID fields for a specific table
  const fetchLusidFields = React.useCallback(
    async (tableName: string) => {
      if (!lusidApiService.hasSettings()) {
        setFieldsError('LUSID connection not configured');
        return;
      }

      if (!tableName) {
        setLusidFields([]);
        return;
      }

      setIsLoadingFields(true);
      setFieldsError(null);

      try {
        const fields = await lusidApiService.fetchFields(tableName);
        setLusidFields(fields);
      } catch (error) {
        console.error(`Failed to fetch LUSID fields for ${tableName}:`, error);
        setFieldsError('Failed to load LUSID fields');
        toast({
          title: 'Error Loading Fields',
          description:
            'Could not load LUSID fields. Please check your connection settings.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingFields(false);
      }
    },
    [toast]
  );

  // Load LUSID providers on component mount
  useEffect(() => {
    // First, immediately set providers from cache (if any)
    const cachedProviders = lusidApiService.getCachedProviders();
    if (cachedProviders.length > 0) {
      setLusidProviders(cachedProviders);
    }

    // Then fetch fresh providers
    fetchLusidProviders();

    // Listen for LUSID settings changed events
    const handleSettingsChanged = () => {
      fetchLusidProviders();
      // Reload fields if a table is selected
      if (data.workerViewName) {
        fetchLusidFields(data.workerViewName);
      }
    };

    // Listen for provider list changes
    const handleProvidersChanged = (
      event: CustomEvent<{ providers: LusidProvider[] }>
    ) => {
      setLusidProviders(event.detail.providers);
    };

    window.addEventListener(
      LUSID_SETTINGS_CHANGED_EVENT,
      handleSettingsChanged
    );
    window.addEventListener(
      PROVIDERS_CHANGED_EVENT,
      handleProvidersChanged as EventListener
    );

    // Clean up event listeners on unmount
    return () => {
      window.removeEventListener(
        LUSID_SETTINGS_CHANGED_EVENT,
        handleSettingsChanged
      );
      window.removeEventListener(
        PROVIDERS_CHANGED_EVENT,
        handleProvidersChanged as EventListener
      );
    };
  }, [fetchLusidProviders, fetchLusidFields, data.workerViewName]);

  // Update selected provider when data changes (e.g. on initial load)
  useEffect(() => {
    if (data.workerViewName) {
      setSelectedProvider(data.workerViewName);
    }
  }, [data.workerViewName]);

  // Compute display providers that include the selected provider
  const displayProviders = React.useMemo(() => {
    // If no selected provider or no providers, just return the providers list
    if (!selectedProvider || lusidProviders.length === 0) {
      return lusidProviders;
    }

    // Check if selected provider exists in the list
    const selectedExists = lusidProviders.some(
      (provider) => provider.TableName === selectedProvider
    );

    // If not in the list, add it to ensure it's always selectable
    if (!selectedExists) {
      return [...lusidProviders, { TableName: selectedProvider }];
    }

    return lusidProviders;
  }, [lusidProviders, selectedProvider]);

  // Fetch fields when worker view name changes
  useEffect(() => {
    if (data.workerViewName) {
      fetchLusidFields(data.workerViewName);
    } else {
      setLusidFields([]);
    }
  }, [data.workerViewName, fetchLusidFields]);

  // Helper function to update connected action edges
  const updateConnectedActionEdges = React.useCallback(
    (scope: string, code: string) => {
      edges.forEach((edge) => {
        if (edge.type === 'action' && edge.target === nodeId) {
          updateEdgeData(edge.id, {
            workerId: {
              scope,
              code,
            },
          });
        }
      });
    },
    [edges, updateEdgeData, nodeId]
  );

  const handleScopeChange = (newScope: string) => {
    onChange({ scope: newScope });
    if (newScope && data.code) {
      updateConnectedActionEdges(newScope, data.code);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCode = e.target.value;
    onChange({ code: newCode });
    if (data.scope && newCode) {
      updateConnectedActionEdges(data.scope, newCode);
    }
  };

  const handleWorkerViewChange = (value: string) => {
    // Update the workerViewName in the node data
    onChange({ workerViewName: value });

    // Also update our local selected provider state
    setSelectedProvider(value);
  };

  const handleParameterAdd = () => {
    const newParameters = [
      ...(data.parameters || []),
      { name: '', mapFrom: '', setTo: '' },
    ];
    onChange({ parameters: newParameters });
  };

  const handleParameterRemove = (index: number) => {
    const newParameters = [...(data.parameters || [])];
    newParameters.splice(index, 1);
    onChange({ parameters: newParameters });
  };

  const handleParameterChange = (
    index: number,
    field:
      | 'name'
      | 'mapFrom'
      | 'setTo'
      | 'type'
      | 'displayName'
      | 'required'
      | 'description',
    value: string | boolean
  ) => {
    const newParameters = [...(data.parameters || [])];
    newParameters[index] = { ...newParameters[index], [field]: value };
    onChange({ parameters: newParameters });
  };

  // When parameter name is selected, auto-populate other fields from LUSID data
  const handleParameterNameSelect = (index: number, fieldName: string) => {
    const newParameters = [...(data.parameters || [])];

    // Find the corresponding LUSID field
    const lusidField = lusidFields.find(
      (field) => field.FieldName === fieldName
    );

    if (lusidField) {
      // Map LUSID data types to SimpleFlow types
      const typeMap: Record<
        string,
        'DateTime' | 'String' | 'Decimal' | 'Boolean'
      > = {
        Text: 'String',
        DateTime: 'DateTime',
        Decimal: 'Decimal',
        Int: 'Decimal',
        Boolean: 'Boolean',
      };

      newParameters[index] = {
        ...newParameters[index],
        name: fieldName,
        type: typeMap[lusidField.DataType] || 'String',
        description: lusidField.Description || '',
        setTo: lusidField.ParamDefaultValue || '',
      };

      onChange({ parameters: newParameters });
    } else {
      // Just set the name if no matching field found
      newParameters[index] = { ...newParameters[index], name: fieldName };
      onChange({ parameters: newParameters });
    }
  };

  const handleAddChildTaskConfiguration = () => {
    onChange({
      childTask: {
        scope: '',
        code: '',
        initialTrigger: 'start',
        fieldMappings: [],
      },
    });
  };

  const handleRemoveChildTaskConfiguration = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ childTask: undefined });
  };

  const handleFieldMappingAdd = () => {
    const childTask = data.childTask || {
      scope: '',
      code: '',
      initialTrigger: 'start',
      fieldMappings: [],
    };
    childTask.fieldMappings.push({ childField: '', mapFrom: '' });
    onChange({ childTask });
  };

  const handleFieldMappingRemove = (mappingIndex: number) => {
    const childTask = { ...data.childTask! };
    childTask.fieldMappings.splice(mappingIndex, 1);
    onChange({ childTask });
  };

  // Get parameters from LUSID fields
  const getParameterOptions = () => {
    return lusidFields
      .filter((field) => field.FieldType === 'Parameter')
      .map((field) => ({
        value: field.FieldName,
        label: field.FieldName,
        dataType: field.DataType,
        description: field.Description || '',
        defaultValue: field.ParamDefaultValue,
      }));
  };

  // Get all LUSID fields for child field dropdowns
  const getAllFieldOptions = () => {
    return lusidFields.map((field) => ({
      value: field.FieldName,
      label: field.FieldName,
    }));
  };

  return (
    <div className="max-h-[60vh] space-y-6 overflow-y-auto pr-2">
      {/* Display Owner Task Definition at the top */}
      <OwnerTaskBadge owner={data.ownerTaskDefinition} />

      {/* Label Field */}
      <div className="w-full space-y-2">
        <Label htmlFor="label">Label</Label>
        <Input
          id="label"
          value={data.label || ''}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Enter label"
          className="w-full"
        />
      </div>

      {/* Display Name Field */}
      <div className="w-full space-y-2">
        <Label htmlFor="displayName">Display Name</Label>
        <Input
          id="displayName"
          value={data.displayName || ''}
          onChange={(e) => onChange({ displayName: e.target.value })}
          placeholder="Enter display name"
          className="w-full"
        />
      </div>

      {/* Description Field */}
      <div className="w-full space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={data.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Enter description"
          className="min-h-[60px] w-full"
        />
      </div>

      {/* Worker Identity Section */}
      <div className="w-full space-y-4">
        <ScopeInput
          id="scope"
          label="Scope"
          value={data.scope || ''}
          onChange={handleScopeChange}
          placeholder="Enter worker scope"
        />

        <div className="space-y-2">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            value={data.code || ''}
            onChange={handleCodeChange}
            placeholder="Enter worker code"
          />
        </div>

        {/* Worker View Name section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="workerViewName">Worker View Name</Label>
            <div className="flex items-center space-x-2">
              {providersError && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center text-xs text-amber-500">
                        <AlertCircle className="mr-1 h-4 w-4" />
                        <span>Connection error</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{providersError}</p>
                      <p className="mt-1 text-xs">
                        Configure LUSID connection in Settings menu
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault();
                  fetchLusidProviders();
                }}
                disabled={isLoadingProviders}
                title="Refresh provider list"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoadingProviders ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
          </div>

          {displayProviders.length > 0 ? (
            <HierarchicalSelect
              items={displayProviders}
              value={data.workerViewName || ''}
              onChange={(value) => handleWorkerViewChange(value)}
              placeholder="Select a LUSID provider"
              className="w-full"
            />
          ) : (
            <div className="relative">
              <Input
                id="workerViewName"
                value={data.workerViewName || ''}
                onChange={(e) => handleWorkerViewChange(e.target.value)}
                placeholder={
                  isLoadingProviders
                    ? 'Loading providers...'
                    : 'worker.imports.quotes'
                }
                disabled={isLoadingProviders}
              />
              {isLoadingProviders && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 transform">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
            </div>
          )}

          {isLoadingFields && (
            <div className="mt-1 flex items-center text-xs text-muted-foreground">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              <span>Loading fields...</span>
            </div>
          )}

          {fieldsError && (
            <div className="mt-1 flex items-center text-xs text-amber-500">
              <AlertCircle className="mr-1 h-3 w-3" />
              <span>{fieldsError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Parameters Section */}
      <Collapsible
        open={isParametersExpanded}
        onOpenChange={setIsParametersExpanded}
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-2 py-2 font-medium hover:bg-gray-50">
          <span>Parameters</span>
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-200 ${isParametersExpanded ? 'rotate-180 transform' : ''}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4">
          {(data.parameters || []).map((param, index) => (
            <div
              key={index}
              className="flex items-start space-x-2 rounded-md border p-2"
            >
              <div className="w-full flex-1 space-y-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  {getParameterOptions().length > 0 ? (
                    <Select
                      value={param.name}
                      onValueChange={(value) =>
                        handleParameterNameSelect(index, value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select parameter" />
                      </SelectTrigger>
                      <SelectContent>
                        {getParameterOptions().map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={param.name}
                      onChange={(e) =>
                        handleParameterChange(index, 'name', e.target.value)
                      }
                      placeholder="Parameter name"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={param.type || 'String'}
                    onValueChange={(value) =>
                      handleParameterChange(index, 'type', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="String">String</SelectItem>
                      <SelectItem value="DateTime">DateTime</SelectItem>
                      <SelectItem value="Decimal">Decimal</SelectItem>
                      <SelectItem value="Boolean">Boolean</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default Value</Label>
                  <Input
                    value={param.setTo || ''}
                    onChange={(e) =>
                      handleParameterChange(index, 'setTo', e.target.value)
                    }
                    placeholder="Default value (optional)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Map From</Label>
                  <Input
                    value={param.mapFrom}
                    onChange={(e) =>
                      handleParameterChange(index, 'mapFrom', e.target.value)
                    }
                    placeholder="Map from"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    value={param.displayName || ''}
                    onChange={(e) =>
                      handleParameterChange(
                        index,
                        'displayName',
                        e.target.value
                      )
                    }
                    placeholder="Parameter display name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={param.description || ''}
                    onChange={(e) =>
                      handleParameterChange(
                        index,
                        'description',
                        e.target.value
                      )
                    }
                    placeholder="Parameter description"
                    className="min-h-[100px] resize-y"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={param.required !== false}
                    onCheckedChange={(checked) =>
                      handleParameterChange(index, 'required', checked)
                    }
                  />
                  <Label>Required</Label>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleParameterRemove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleParameterAdd}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Parameter
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {/* Status Triggers Section */}
      <div className="w-full space-y-4">
        <Label>Status Triggers</Label>
        <div className="space-y-2">
          <Input
            value={data.statusTriggers?.completedWithResults || ''}
            onChange={(e) =>
              onChange({
                statusTriggers: {
                  ...data.statusTriggers,
                  completedWithResults: e.target.value,
                },
              })
            }
            placeholder="Completed with results trigger"
            className="w-full"
          />
          <Input
            value={data.statusTriggers?.completedNoResults || ''}
            onChange={(e) =>
              onChange({
                statusTriggers: {
                  ...data.statusTriggers,
                  completedNoResults: e.target.value,
                },
              })
            }
            placeholder="Completed with no results trigger"
            className="w-full"
          />
          <Input
            value={data.statusTriggers?.failed || ''}
            onChange={(e) =>
              onChange({
                statusTriggers: {
                  ...data.statusTriggers,
                  failed: e.target.value,
                },
              })
            }
            placeholder="Failed trigger"
            className="w-full"
          />
        </div>
      </div>

      {/* Child Task Configuration Button */}
      {!data.childTask && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleAddChildTaskConfiguration}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Child Task Configuration
        </Button>
      )}

      {/* Child Task Configuration Section */}
      {data.childTask && (
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
              <div className="w-full space-y-4">
                <div className="space-y-2">
                  <Label>Task Definition ID</Label>
                  <Input
                    value={data.childTask.scope}
                    readOnly
                    className="w-full bg-gray-50"
                    placeholder="Scope (set by linked child task)"
                  />
                  <Input
                    value={data.childTask.code}
                    readOnly
                    className="w-full bg-gray-50"
                    placeholder="Code (set by linked child task)"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Initial Trigger</Label>
                  <Input
                    value={data.childTask.initialTrigger}
                    onChange={(e) => {
                      onChange({
                        childTask: {
                          ...data.childTask!,
                          initialTrigger: e.target.value,
                        },
                      });
                    }}
                    placeholder="Initial trigger (e.g., start)"
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Field Mappings</Label>
                  <div className="space-y-4">
                    {data.childTask.fieldMappings.map(
                      (mapping, mappingIndex) => (
                        <div
                          key={mappingIndex}
                          className="rounded-md border bg-slate-50 p-3"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">
                              Mapping {mappingIndex + 1}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleFieldMappingRemove(mappingIndex)
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <Input
                              value={mapping.childField}
                              onChange={(e) => {
                                const newChildTask = { ...data.childTask! };
                                newChildTask.fieldMappings[
                                  mappingIndex
                                ].childField = e.target.value;
                                onChange({ childTask: newChildTask });
                              }}
                              placeholder="Child field"
                            />

                            {lusidFields.length > 0 ? (
                              <>
                                <Select
                                  value={mapping.mapFrom}
                                  onValueChange={(value) => {
                                    const newChildTask = { ...data.childTask! };
                                    newChildTask.fieldMappings[
                                      mappingIndex
                                    ].mapFrom = value;

                                    // Find the selected field to display its metadata
                                    const selectedField = lusidFields.find(
                                      (field) => field.FieldName === value
                                    );
                                    if (selectedField) {
                                      // Store the field metadata in the mapping
                                      newChildTask.fieldMappings[
                                        mappingIndex
                                      ].fieldType = selectedField.DataType;
                                      newChildTask.fieldMappings[
                                        mappingIndex
                                      ].description = selectedField.Description;
                                    }

                                    onChange({ childTask: newChildTask });
                                  }}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Map from" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getAllFieldOptions().map((option) => (
                                      <SelectItem
                                        key={option.value}
                                        value={option.value}
                                      >
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                {mapping.mapFrom && (
                                  <div className="space-y-1 rounded border bg-white p-2">
                                    {(() => {
                                      const selectedField = lusidFields.find(
                                        (field) =>
                                          field.FieldName === mapping.mapFrom
                                      );
                                      if (selectedField) {
                                        return (
                                          <>
                                            <div className="flex items-center">
                                              <span className="w-20 text-xs font-medium text-muted-foreground">
                                                Data Type:
                                              </span>
                                              <span className="text-xs">
                                                {selectedField.DataType}
                                              </span>
                                            </div>
                                            {selectedField.Description && (
                                              <div className="flex items-start">
                                                <span className="w-20 text-xs font-medium text-muted-foreground">
                                                  Description:
                                                </span>
                                                <span className="flex-1 text-xs">
                                                  {selectedField.Description}
                                                </span>
                                              </div>
                                            )}
                                          </>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                )}
                              </>
                            ) : (
                              <Input
                                value={mapping.mapFrom}
                                onChange={(e) => {
                                  const newChildTask = { ...data.childTask! };
                                  newChildTask.fieldMappings[
                                    mappingIndex
                                  ].mapFrom = e.target.value;
                                  onChange({ childTask: newChildTask });
                                }}
                                placeholder="Map from"
                              />
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleFieldMappingAdd}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Field Mapping
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
