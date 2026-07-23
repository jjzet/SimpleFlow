export interface TaskDefinitionData {
  label: string;
  type: 'parent' | 'child' | 'exception';
  scope?: string;
  code?: string;
  displayName?: string;
  description?: string;
  fieldSchema?: Array<{
    name: string;
    type: 'DateTime' | 'String' | 'Decimal' | 'Boolean';
    description?: string;
    required: boolean;
  }>;
}

export interface StateNodeData {
  name?: string;
  label?: string;
  isInitial?: boolean;
  ownerTaskDefinition?: {
    scope: string;
    code: string;
  };
  ownerTaskDefinitionId?: string;
}

export interface WorkerNodeData {
  label: string;
  displayName?: string;
  description?: string;
  scope?: string;
  code?: string;
  workerViewName?: string;
  parameters?: Array<{
    name: string;
    type?: 'DateTime' | 'String' | 'Decimal' | 'Boolean';
    displayName?: string;
    mapFrom: string;
    setTo?: string;
    required?: boolean;
    description?: string;
  }>;
  childTask?: {
    scope: string;
    code: string;
    initialTrigger: string;
    fieldMappings: Array<{
      childField: string;
      mapFrom: string;
      fieldType?: string;
      description?: string;
    }>;
  };
  statusTriggers?: {
    completedWithResults?: string;
    completedNoResults?: string;
    failed?: string;
  };
  actionType?: 'RunWorker' | 'TriggerParentTask' | 'CreateChildTasks';
  ownerTaskDefinition?: {
    scope: string;
    code: string;
  };
  ownerTaskDefinitionId?: string;
}

export interface GuardNodeData {
  label: string;
  subject?: 'childTasks' | 'parentTask' | 'currentTask';
  operator?: 'all' | 'any' | 'none';
  condition?: {
    property: string;
    comparison: 'eq' | 'neq' | 'gt' | 'lt';
    value: string;
  };
}

export interface TriggerNodeData {
  label: string;
  name?: string;
  type?: 'External';
}

export interface EventHandlerNodeData {
  // Basic properties
  label: string;
  scope?: string;
  code?: string;
  displayName?: string;
  description?: string;

  // Event matching pattern
  eventType?: string;
  filter?: string;

  // Task definition reference
  taskDefinitionId?: {
    scope: string;
    code: string;
  };

  // Task activity
  initialTrigger?: string;
  correlationIds?: Array<{
    mapFrom: string | null;
    setTo: string;
  }>;

  // Task fields mapping
  taskFields?: Record<
    string,
    {
      mapFrom?: string;
      setTo?: string;
    }
  >;

  // Owner task definition (for canvas organization)
  ownerTaskDefinition?: {
    scope: string;
    code: string;
  };
  ownerTaskDefinitionId?: string;
}

export interface EventHandlerEdgeData {
  label?: string;
  ownerTaskDefinition?: {
    scope: string;
    code: string;
  };
  ownerTaskDefinitionId?: string;
  sourceNodeId?: string;
  targetNodeId?: string;
}

export type NodeData =
  | TaskDefinitionData
  | StateNodeData
  | WorkerNodeData
  | GuardNodeData
  | TriggerNodeData
  | EventHandlerNodeData;

export interface TaskDefinitionFile {
  id: string;
  name: string;
  type: 'parent' | 'child' | 'exception';
  nodeId: string;
}

export interface WorkerFile {
  id: string;
  name: string;
  nodeId: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  taskDefinitions: TaskDefinitionFile[];
  workers: WorkerFile[];
}
