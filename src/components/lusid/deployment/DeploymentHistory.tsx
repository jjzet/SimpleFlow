'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { DeploymentHistoryItemType } from './hooks/useDeployment';
import { DeploymentHistoryItem } from './DeploymentHistoryItem';

interface DeploymentHistoryProps {
  previousDeployments: DeploymentHistoryItemType[];
  isLoadingHistory: boolean;
}

export const DeploymentHistory: React.FC<DeploymentHistoryProps> = ({
  previousDeployments,
  isLoadingHistory,
}) => {
  return (
    <div className="mt-6 border-t border-gray-200 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-medium text-blue-800">
          Deployment History
        </h3>
        {isLoadingHistory ? (
          <div className="flex items-center">
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-blue-500" />
            <span className="text-sm text-gray-500">Loading history...</span>
          </div>
        ) : previousDeployments.length > 0 ? (
          <Badge variant="outline" className="bg-blue-50">
            {previousDeployments.length} past deployment
            {previousDeployments.length !== 1 ? 's' : ''}
          </Badge>
        ) : null}
      </div>

      {isLoadingHistory ? (
        <div className="py-4 text-center text-sm text-gray-500">
          Loading deployment history...
        </div>
      ) : previousDeployments.length > 0 ? (
        <div className="space-y-3">
          {previousDeployments.map((deployment) => (
            <DeploymentHistoryItem
              key={deployment.templateVersionId}
              templateVersionId={deployment.templateVersionId}
              templateName={deployment.templateName}
              templateVersion={deployment.templateVersion}
              deploymentStartTime={deployment.startTime}
              deploymentLogs={deployment.logs}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm italic text-gray-500">
          No deployment history available yet. History will appear after your
          first deployment.
        </p>
      )}
    </div>
  );
};
