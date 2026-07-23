'use client';

import React, { useState } from 'react';
import { DeploymentLog } from '@/lib/services/lusid-deployment-service';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

// Component to render a historical deployment
export interface DeploymentHistoryItemProps {
  templateVersionId: string;
  templateName: string;
  templateVersion: string;
  deploymentStartTime: Date;
  deploymentLogs: DeploymentLog[];
}

export const DeploymentHistoryItem = ({
  templateVersionId,
  templateName,
  templateVersion,
  deploymentStartTime,
  deploymentLogs,
}: DeploymentHistoryItemProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate deployment stats
  const totalComponents = deploymentLogs.length;
  const successfulComponents = deploymentLogs.filter(
    (log: DeploymentLog) => log.status === 'success'
  ).length;
  const failedComponents = deploymentLogs.filter(
    (log: DeploymentLog) => log.status === 'failed'
  ).length;
  const skippedComponents = deploymentLogs.filter(
    (log: DeploymentLog) => log.status === 'skipped'
  ).length;

  // Group logs by component type
  const workerLogs = deploymentLogs.filter(
    (log: DeploymentLog) => log.component_type === 'worker'
  );
  const taskParentLogs = deploymentLogs.filter(
    (log: DeploymentLog) => log.component_type === 'task_definition_parent'
  );
  const taskChildLogs = deploymentLogs.filter(
    (log: DeploymentLog) => log.component_type === 'task_definition_child'
  );
  const taskExceptionLogs = deploymentLogs.filter(
    (log: DeploymentLog) => log.component_type === 'task_definition_exception'
  );
  const eventHandlerLogs = deploymentLogs.filter(
    (log: DeploymentLog) => log.component_type === 'event_handler'
  );

  // Determine overall status color
  const getStatusColor = () => {
    if (failedComponents > 0) {
      if (successfulComponents > 0) {
        return 'text-yellow-600'; // Partially successful
      }
      return 'text-red-600'; // All failed
    }
    return 'text-green-600'; // All successful
  };

  // Format components by group
  const formatComponentGroup = (logs: DeploymentLog[], title: string) => {
    if (logs.length === 0) return null;

    return (
      <div className="mt-3">
        <h5 className="mb-1 text-xs uppercase text-gray-500">{title}</h5>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {logs.map((log: DeploymentLog) => (
            <div
              key={log.id}
              className={`rounded border p-2 text-xs ${
                log.status === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : log.status === 'failed'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-gray-200 bg-gray-50 text-gray-700'
              } `}
            >
              <div className="font-medium">{log.component_name}</div>
              <div className="mt-0.5 flex items-center justify-between text-xs opacity-80">
                <span>
                  {log.scope}/{log.code}
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    log.status === 'success'
                      ? 'border-green-200 bg-green-100 text-green-800'
                      : log.status === 'failed'
                        ? 'border-red-200 bg-red-100 text-red-800'
                        : 'border-gray-200 bg-gray-100 text-gray-800'
                  } `}
                >
                  {log.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="mb-3 overflow-hidden rounded-md border bg-white shadow-sm"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between p-3 text-left hover:bg-gray-50">
        <div>
          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${getStatusColor()}`}
              title={`${successfulComponents} of ${totalComponents} components deployed successfully`}
            />
            <span className="font-medium">{templateName}</span>
            <Badge variant="outline" className="text-xs">
              v{templateVersion}
            </Badge>
          </div>
          <p className="mt-1 flex items-center text-xs text-muted-foreground">
            <span className="mr-2">Deployed:</span>
            <span className="font-semibold">
              {format(new Date(deploymentStartTime), 'MMM d, yyyy HH:mm')}
            </span>
          </p>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <div className="mr-4 flex items-center gap-1">
            <Badge
              variant="outline"
              className={`text-xs ${
                successfulComponents === totalComponents
                  ? 'border-green-200 bg-green-100 text-green-800'
                  : failedComponents === totalComponents
                    ? 'border-red-200 bg-red-100 text-red-800'
                    : 'border-yellow-200 bg-yellow-100 text-yellow-800'
              } `}
            >
              {successfulComponents}/{totalComponents}
            </Badge>
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t bg-gray-50 px-3 pb-3 pt-2">
        <div className="mb-3 flex flex-wrap gap-2">
          <div className="flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs">
            <div className="mr-1 h-2 w-2 rounded-full bg-green-600" />
            <span>{successfulComponents} successful</span>
          </div>
          {failedComponents > 0 && (
            <div className="flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs">
              <div className="mr-1 h-2 w-2 rounded-full bg-red-600" />
              <span>{failedComponents} failed</span>
            </div>
          )}
          {skippedComponents > 0 && (
            <div className="flex items-center rounded-full border border-gray-200 bg-gray-100 px-2 py-1 text-xs">
              <div className="mr-1 h-2 w-2 rounded-full bg-gray-400" />
              <span>{skippedComponents} skipped</span>
            </div>
          )}
        </div>

        {/* Components by type */}
        {formatComponentGroup(workerLogs, 'Workers')}
        {(taskParentLogs.length > 0 ||
          taskChildLogs.length > 0 ||
          taskExceptionLogs.length > 0) && (
          <div className="mt-3">
            <h5 className="mb-1 text-xs uppercase text-gray-500">
              Task Definitions
            </h5>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {taskExceptionLogs.map((log: DeploymentLog) => (
                <div
                  key={log.id}
                  className={`rounded border p-2 text-xs ${
                    log.status === 'success'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : log.status === 'failed'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-gray-200 bg-gray-50 text-gray-700'
                  } `}
                >
                  <div className="flex items-center font-medium">
                    {log.component_name}
                    <Badge
                      variant="outline"
                      className="ml-1 border-red-200 bg-red-50 text-xs text-red-800"
                    >
                      Exception
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-xs opacity-80">
                    <span>
                      {log.scope}/{log.code}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        log.status === 'success'
                          ? 'border-green-200 bg-green-100 text-green-800'
                          : log.status === 'failed'
                            ? 'border-red-200 bg-red-100 text-red-800'
                            : 'border-gray-200 bg-gray-100 text-gray-800'
                      } `}
                    >
                      {log.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {taskChildLogs.map((log: DeploymentLog) => (
                <div
                  key={log.id}
                  className={`rounded border p-2 text-xs ${
                    log.status === 'success'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : log.status === 'failed'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-gray-200 bg-gray-50 text-gray-700'
                  } `}
                >
                  <div className="flex items-center font-medium">
                    {log.component_name}
                    <Badge
                      variant="outline"
                      className="ml-1 border-orange-200 bg-orange-50 text-xs text-orange-800"
                    >
                      Child
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-xs opacity-80">
                    <span>
                      {log.scope}/{log.code}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        log.status === 'success'
                          ? 'border-green-200 bg-green-100 text-green-800'
                          : log.status === 'failed'
                            ? 'border-red-200 bg-red-100 text-red-800'
                            : 'border-gray-200 bg-gray-100 text-gray-800'
                      } `}
                    >
                      {log.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {taskParentLogs.map((log: DeploymentLog) => (
                <div
                  key={log.id}
                  className={`rounded border p-2 text-xs ${
                    log.status === 'success'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : log.status === 'failed'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-gray-200 bg-gray-50 text-gray-700'
                  } `}
                >
                  <div className="flex items-center font-medium">
                    {log.component_name}
                    <Badge
                      variant="outline"
                      className="ml-1 border-yellow-200 bg-yellow-50 text-xs text-yellow-800"
                    >
                      Parent
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-xs opacity-80">
                    <span>
                      {log.scope}/{log.code}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        log.status === 'success'
                          ? 'border-green-200 bg-green-100 text-green-800'
                          : log.status === 'failed'
                            ? 'border-red-200 bg-red-100 text-red-800'
                            : 'border-gray-200 bg-gray-100 text-gray-800'
                      } `}
                    >
                      {log.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {formatComponentGroup(eventHandlerLogs, 'Event Handlers')}
      </CollapsibleContent>
    </Collapsible>
  );
};
