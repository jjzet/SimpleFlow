import { Node, Edge } from 'reactflow';

export interface TaskDefinitionCode {
  id: {
    scope: string;
    code: string;
  };
  displayName: string;
  description: string;
  states: Array<{ name: string }>;
  fieldSchema: Array<{
    name: string;
    type: string;
    description?: string;
    required?: boolean;
  }>;
  initialState: {
    name: string;
    requiredFields: string[];
  };
  triggers: Array<{
    name: string;
    trigger: {
      type: string;
    };
  }>;
  transitions: Array<{
    fromState: string;
    toState: string;
    trigger: string;
    action?: string;
    guard?: string;
  }>;
  actions?: Array<{
    name: string;
    actionDetails: {
      type: string;
      workerId?: {
        scope: string;
        code: string;
      };
      workerParameters?: Record<
        string,
        {
          mapFrom: string;
          setTo: string | null;
        }
      >;
      workerStatusTriggers?: {
        completedWithResults?: string;
        completedNoResults?: string;
        failed?: string;
      };
      childTaskConfigurations?: Array<{
        taskDefinitionId: {
          scope: string;
          code: string;
        };
        initialTrigger: string;
        childTaskFields: Record<
          string,
          {
            mapFrom: string;
          }
        >;
      }>;
      trigger?: string;
    };
  }>;
}

export interface EventHandlerCode {
  id: {
    scope: string;
    code: string;
  };
  displayName: string;
  description: string;
  status: string;
  eventMatchingPattern: {
    eventType: string;
    filter?: string;
  };
  runAsUserId: {
    setTo: string;
  };
  taskDefinitionId: {
    scope: string;
    code: string;
  };
  taskActivity: {
    type: string;
    initialTrigger: string;
    correlationIds?: Array<{
      mapFrom: string | null;
      setTo: string;
    }>;
    taskFields?: Record<
      string,
      {
        mapFrom?: string;
        setTo?: string;
      }
    >;
  };
}

export interface CodeCache {
  [taskDefinitionId: string]: {
    code: TaskDefinitionCode;
    timestamp: number;
  };
}

export interface EventHandlerCodeCache {
  [key: string]: {
    code: EventHandlerCode;
    timestamp: number;
  };
}

export interface NodeHandler {
  canHandle(node: Node): boolean;
  updateCode(node: Node, code: TaskDefinitionCode): void;
}
