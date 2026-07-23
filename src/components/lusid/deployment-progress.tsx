import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  ComponentStatus,
  ComponentType,
  DeploymentLog,
} from '@/lib/services/lusid-deployment-service';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  XCircle,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

// Component type display names
const componentTypeDisplayNames: Record<ComponentType, string> = {
  worker: 'Worker',
  task_definition_parent: 'Parent Task Definition',
  task_definition_child: 'Child Task Definition',
  task_definition_exception: 'Exception Task Definition',
  event_handler: 'Event Handler',
};

// Component to render a deployment log entry
interface DeploymentLogItemProps {
  log: DeploymentLog;
  isCurrentlyDeploying?: boolean;
}

// Component type colors for badges
const componentTypeColors: Record<ComponentType, string> = {
  worker: 'bg-purple-100 text-purple-800 border-purple-200',
  task_definition_parent: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  task_definition_child: 'bg-orange-100 text-orange-800 border-orange-200',
  task_definition_exception: 'bg-red-100 text-red-800 border-red-200',
  event_handler: 'bg-blue-100 text-blue-800 border-blue-200',
};

// Component status icons and colors
const statusConfig: Record<
  ComponentStatus,
  {
    icon: React.ReactNode;
    color: string;
    text: string;
  }
> = {
  pending: {
    icon: <Clock className="h-4 w-4" />,
    color: 'text-amber-500',
    text: 'Pending',
  },
  success: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'text-green-500',
    text: 'Success',
  },
  failed: {
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-500',
    text: 'Failed',
  },
  skipped: {
    icon: <ChevronRight className="h-4 w-4" />,
    color: 'text-gray-500',
    text: 'Skipped',
  },
};

function DeploymentLogItem({
  log,
  isCurrentlyDeploying,
}: DeploymentLogItemProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const status = statusConfig[log.status];

  // Show expanded view by default for failed items
  React.useEffect(() => {
    if (log.status === 'failed') {
      setIsOpen(true);
    }
  }, [log.status]);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn(
        'mb-2 w-full overflow-hidden rounded-md border',
        isCurrentlyDeploying &&
          log.status === 'pending' &&
          'animate-pulse border-amber-400'
      )}
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/30">
        <div className="flex items-center">
          <div className={cn('mr-2', status.color)}>
            {isCurrentlyDeploying && log.status === 'pending' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              status.icon
            )}
          </div>
          <span className="font-medium">{log.component_name}</span>
          <Badge
            variant="outline"
            className={cn(
              'ml-2 text-xs',
              componentTypeColors[log.component_type]
            )}
          >
            {componentTypeDisplayNames[log.component_type]}
          </Badge>
        </div>
        <div className="flex items-center">
          <span className={cn('mr-2 text-sm', status.color)}>
            {isCurrentlyDeploying && log.status === 'pending'
              ? 'Deploying...'
              : status.text}
          </span>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t bg-gray-50 p-3 text-sm dark:bg-gray-800/30">
        <div className="mb-2 grid grid-cols-2 gap-4">
          <div>
            <p className="text-muted-foreground">Scope</p>
            <p className="font-mono">{log.scope}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Code</p>
            <p className="font-mono">{log.code}</p>
          </div>
        </div>

        {log.status === 'failed' && log.response_data && (
          <div className="mt-4">
            <p className="mb-1 text-muted-foreground">Error Details</p>
            <div className="max-h-[200px] overflow-auto rounded border border-red-200 bg-red-50 p-2 font-mono text-xs dark:border-red-800 dark:bg-red-900/20">
              {typeof log.response_data === 'object'
                ? JSON.stringify(log.response_data, null, 2)
                : log.response_data.toString()}
            </div>
          </div>
        )}

        {log.status === 'success' && log.response_data && (
          <div className="mt-4">
            <p className="mb-1 text-muted-foreground">Response</p>
            <div className="max-h-[200px] overflow-auto rounded border border-green-200 bg-green-50 p-2 font-mono text-xs dark:border-green-800 dark:bg-green-900/20">
              {typeof log.response_data === 'object'
                ? JSON.stringify(log.response_data, null, 2)
                : log.response_data.toString()}
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// Timer component to track elapsed deployment time
function ElapsedTimeCounter({
  startTime,
  isActive,
}: {
  startTime: Date;
  isActive: boolean;
}) {
  const [elapsedTime, setElapsedTime] = useState<string>('00:00');

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diffMs = now.getTime() - startTime.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffSec = Math.floor((diffMs % 60000) / 1000);

      setElapsedTime(
        `${diffMin.toString().padStart(2, '0')}:${diffSec.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isActive]);

  return (
    <div className="flex items-center text-xs text-muted-foreground">
      <Clock className="mr-1 h-3 w-3" />
      Elapsed: {elapsedTime}
    </div>
  );
}

// Deployment progress summary
interface DeploymentProgressSummaryProps {
  totalComponents: number;
  completedComponents: number; // success + failed + skipped
  successfulComponents: number;
  failedComponents: number;
  pendingComponents: number;
  skippedComponents: number;
  isDeploying: boolean;
  deploymentStartTime: Date;
}

function DeploymentProgressSummary({
  totalComponents,
  completedComponents,
  successfulComponents,
  failedComponents,
  pendingComponents,
  skippedComponents,
  isDeploying,
  deploymentStartTime,
}: DeploymentProgressSummaryProps) {
  // Calculate progress percentage
  const progressPercentage =
    totalComponents > 0
      ? Math.round((completedComponents / totalComponents) * 100)
      : 0;

  // Determine progress bar color
  let progressColor = isDeploying ? 'bg-amber-500' : 'bg-amber-500';
  if (completedComponents === totalComponents) {
    progressColor = failedComponents > 0 ? 'bg-red-500' : 'bg-green-500';
  }

  return (
    <div className="mb-4">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center text-sm font-medium">
          Deployment Progress: {progressPercentage}%
          {isDeploying && (
            <span className="ml-2 flex items-center text-amber-500">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              <span className="animate-pulse">Deploying...</span>
            </span>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {completedComponents} of {totalComponents} components
        </div>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={cn(
            'h-full transition-all duration-500',
            progressColor,
            isDeploying && 'animate-pulse'
          )}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <div className="mt-2 flex justify-between">
        <div className="flex gap-3 text-sm">
          <div className="flex items-center">
            <div className="mr-1.5 h-2 w-2 rounded-full bg-green-500" />
            <span>{successfulComponents} successful</span>
          </div>
          <div className="flex items-center">
            <div className="mr-1.5 h-2 w-2 rounded-full bg-red-500" />
            <span>{failedComponents} failed</span>
          </div>
          <div className="flex items-center">
            <div className="mr-1.5 h-2 w-2 rounded-full bg-amber-500" />
            <span>{pendingComponents} pending</span>
          </div>
          <div className="flex items-center">
            <div className="mr-1.5 h-2 w-2 rounded-full bg-gray-400" />
            <span>{skippedComponents} skipped</span>
          </div>
        </div>

        {/* Elapsed time counter */}
        <ElapsedTimeCounter
          startTime={deploymentStartTime}
          isActive={isDeploying}
        />
      </div>
    </div>
  );
}

// Find the first pending component that would be currently deploying
function findCurrentlyDeployingComponent(logs: DeploymentLog[]): string | null {
  // Order of deployment: workers -> exceptions -> child -> parent -> event handlers
  const componentTypeOrder = [
    'worker',
    'task_definition_exception',
    'task_definition_child',
    'task_definition_parent',
    'event_handler',
  ];

  // For each type, check if there's a pending component
  for (const type of componentTypeOrder) {
    const pendingComponent = logs
      .filter((log) => log.component_type === type && log.status === 'pending')
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      .shift();

    if (pendingComponent) return pendingComponent.component_id;
  }

  return null;
}

// Main deployment progress component
interface DeploymentProgressProps {
  deploymentLogs: DeploymentLog[];
  isDeploying: boolean;
  deploymentStartTime?: Date;
  deploymentId: string;
}

export function DeploymentProgress({
  deploymentLogs,
  isDeploying,
  deploymentStartTime = new Date(),
  deploymentId,
}: DeploymentProgressProps) {
  // Find the currently deploying component
  const currentlyDeployingId = isDeploying
    ? findCurrentlyDeployingComponent(deploymentLogs)
    : null;

  // Group logs by component type for organization
  const workerLogs = deploymentLogs.filter(
    (log) => log.component_type === 'worker'
  );
  const taskParentLogs = deploymentLogs.filter(
    (log) => log.component_type === 'task_definition_parent'
  );
  const taskChildLogs = deploymentLogs.filter(
    (log) => log.component_type === 'task_definition_child'
  );
  const taskExceptionLogs = deploymentLogs.filter(
    (log) => log.component_type === 'task_definition_exception'
  );
  const eventHandlerLogs = deploymentLogs.filter(
    (log) => log.component_type === 'event_handler'
  );

  // Calculate summary statistics
  const totalComponents = deploymentLogs.length;
  const successfulComponents = deploymentLogs.filter(
    (log) => log.status === 'success'
  ).length;
  const failedComponents = deploymentLogs.filter(
    (log) => log.status === 'failed'
  ).length;
  const pendingComponents = deploymentLogs.filter(
    (log) => log.status === 'pending'
  ).length;
  const skippedComponents = deploymentLogs.filter(
    (log) => log.status === 'skipped'
  ).length;
  const completedComponents =
    successfulComponents + failedComponents + skippedComponents;

  return (
    <div className="mt-4" id={`deployment-${deploymentId}`}>
      <h3 className="mb-3 flex items-center text-sm font-semibold">
        Deployment Status
        {isDeploying && pendingComponents > 0 && (
          <span className="ml-2 flex items-center text-xs text-amber-500">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Processing components...
          </span>
        )}
      </h3>

      <DeploymentProgressSummary
        totalComponents={totalComponents}
        completedComponents={completedComponents}
        successfulComponents={successfulComponents}
        failedComponents={failedComponents}
        pendingComponents={pendingComponents}
        skippedComponents={skippedComponents}
        isDeploying={isDeploying}
        deploymentStartTime={deploymentStartTime}
      />

      <ScrollArea className="h-[300px] pr-4">
        {/* Workers */}
        {workerLogs.length > 0 && (
          <div className="mb-4">
            <h4 className="mb-2 text-xs uppercase text-gray-500">Workers</h4>
            {workerLogs.map((log) => (
              <DeploymentLogItem
                key={log.id}
                log={log}
                isCurrentlyDeploying={
                  log.component_id === currentlyDeployingId && isDeploying
                }
              />
            ))}
          </div>
        )}

        {/* Task Definitions */}
        {(taskParentLogs.length > 0 ||
          taskChildLogs.length > 0 ||
          taskExceptionLogs.length > 0) && (
          <div className="mb-4">
            <h4 className="mb-2 text-xs uppercase text-gray-500">
              Task Definitions
            </h4>

            {/* Exception Tasks */}
            {taskExceptionLogs.map((log) => (
              <DeploymentLogItem
                key={log.id}
                log={log}
                isCurrentlyDeploying={
                  log.component_id === currentlyDeployingId && isDeploying
                }
              />
            ))}

            {/* Child Tasks */}
            {taskChildLogs.map((log) => (
              <DeploymentLogItem
                key={log.id}
                log={log}
                isCurrentlyDeploying={
                  log.component_id === currentlyDeployingId && isDeploying
                }
              />
            ))}

            {/* Parent Tasks */}
            {taskParentLogs.map((log) => (
              <DeploymentLogItem
                key={log.id}
                log={log}
                isCurrentlyDeploying={
                  log.component_id === currentlyDeployingId && isDeploying
                }
              />
            ))}
          </div>
        )}

        {/* Event Handlers */}
        {eventHandlerLogs.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs uppercase text-gray-500">
              Event Handlers
            </h4>
            {eventHandlerLogs.map((log) => (
              <DeploymentLogItem
                key={log.id}
                log={log}
                isCurrentlyDeploying={
                  log.component_id === currentlyDeployingId && isDeploying
                }
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
