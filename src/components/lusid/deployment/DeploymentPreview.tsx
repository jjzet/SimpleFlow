'use client';

import React from 'react';
import { CodeCard } from './CodeCard';
import { DeploymentPackage } from './hooks/useDeployment';

interface DeploymentPreviewProps {
  deploymentPackage: DeploymentPackage;
  componentDeploymentStatus: Record<
    string,
    {
      status: 'new' | 'modified' | 'deployed';
      lastDeployed?: string;
    }
  >;
}

export const DeploymentPreview: React.FC<DeploymentPreviewProps> = ({
  deploymentPackage,
  componentDeploymentStatus,
}) => {
  const hasComponents =
    deploymentPackage.workers.length > 0 ||
    deploymentPackage.exceptionTasks.length > 0 ||
    deploymentPackage.childTasks.length > 0 ||
    deploymentPackage.parentTasks.length > 0 ||
    deploymentPackage.eventHandlers.length > 0;

  if (!hasComponents) {
    return (
      <div className="text-sm italic text-muted-foreground">
        No deployable components found in this workflow.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Deployment Package</h3>

      {/* Workers Section */}
      {deploymentPackage.workers.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs uppercase text-gray-500">Workers</h4>
          {deploymentPackage.workers.map(({ node, code }) => (
            <CodeCard
              key={node.id}
              title={node.data.label}
              type="worker"
              code={code}
              deploymentStatus={
                componentDeploymentStatus[node.id]?.status || 'new'
              }
              lastDeployed={componentDeploymentStatus[node.id]?.lastDeployed}
            />
          ))}
        </div>
      )}

      {/* Task Definitions Section */}
      {(deploymentPackage.exceptionTasks.length > 0 ||
        deploymentPackage.childTasks.length > 0 ||
        deploymentPackage.parentTasks.length > 0) && (
        <div>
          <h4 className="mb-2 text-xs uppercase text-gray-500">
            Task Definitions
          </h4>

          {/* Exception Tasks */}
          {deploymentPackage.exceptionTasks.map(({ node, code }) => (
            <CodeCard
              key={node.id}
              title={node.data.label}
              type="exception"
              code={code}
              deploymentStatus={
                componentDeploymentStatus[node.id]?.status || 'new'
              }
              lastDeployed={componentDeploymentStatus[node.id]?.lastDeployed}
            />
          ))}

          {/* Child Tasks */}
          {deploymentPackage.childTasks.map(({ node, code }) => (
            <CodeCard
              key={node.id}
              title={node.data.label}
              type="child"
              code={code}
              deploymentStatus={
                componentDeploymentStatus[node.id]?.status || 'new'
              }
              lastDeployed={componentDeploymentStatus[node.id]?.lastDeployed}
            />
          ))}

          {/* Parent Tasks */}
          {deploymentPackage.parentTasks.map(({ node, code }) => (
            <CodeCard
              key={node.id}
              title={node.data.label}
              type="parent"
              code={code}
              deploymentStatus={
                componentDeploymentStatus[node.id]?.status || 'new'
              }
              lastDeployed={componentDeploymentStatus[node.id]?.lastDeployed}
            />
          ))}
        </div>
      )}

      {/* Event Handlers Section */}
      {deploymentPackage.eventHandlers.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs uppercase text-gray-500">
            Event Handlers
          </h4>
          {deploymentPackage.eventHandlers.map(({ node, code }) => (
            <CodeCard
              key={node.id}
              title={node.data.label}
              type="eventHandler"
              code={code}
              deploymentStatus={
                componentDeploymentStatus[node.id]?.status || 'new'
              }
              lastDeployed={componentDeploymentStatus[node.id]?.lastDeployed}
            />
          ))}
        </div>
      )}
    </div>
  );
};
