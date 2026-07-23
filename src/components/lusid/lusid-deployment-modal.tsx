'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Rocket } from 'lucide-react';
import { useWorkflow } from '@/contexts/workflow-context';
import { useDeployment } from './deployment/hooks/useDeployment';
import { DeploymentProgress } from './deployment-progress';
import { CodeCard } from './deployment/CodeCard';
import { DeploymentStatus } from './deployment/DeploymentStatus';
import { DeploymentPreview } from './deployment/DeploymentPreview';
import { DeploymentHistory } from './deployment/DeploymentHistory';

interface LusidDeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LusidDeploymentModal({
  isOpen,
  onClose,
}: LusidDeploymentModalProps) {
  const {
    nodes,
    edges,
    generateTaskDefinitionCode,
    generateWorkerCode,
    generateEventHandlerCode,
    currentTemplate,
  } = useWorkflow();

  const {
    // API connection state
    isApiConnected,
    isLoading,

    // Deployment package
    deploymentPackage,
    componentDeploymentStatus,

    // Template state
    selectedTemplate,
    hasDeployableContent,

    // Deployment state
    deploymentStarted,
    isDeploying,
    deploymentTemplateVersionId,
    deploymentLogs,
    deploymentStartTime,

    // Deployment history
    previousDeployments,
    isLoadingHistory,

    // Methods
    startDeployment,
    getStatusIndicator,
  } = useDeployment({
    isOpen,
    currentTemplate,
    nodes,
    generateTaskDefinitionCode,
    generateWorkerCode,
    generateEventHandlerCode,
  });

  const statusIndicator = getStatusIndicator();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Deploy Workflow to LUSID</DialogTitle>
          <DialogDescription>
            Review and deploy your workflow components to LUSID
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          {/* Connection Status Indicator */}
          <DeploymentStatus
            color={statusIndicator.color}
            label={statusIndicator.label}
            icon={statusIndicator.icon}
          />

          {/* Template Info */}
          {selectedTemplate ? (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
              <div className="flex items-start">
                <div>
                  <p className="font-medium text-blue-800">
                    Deploying Template: {selectedTemplate.name}
                  </p>
                  <p className="mt-1 text-blue-700">
                    Version: {selectedTemplate.version}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
              <div className="flex items-start">
                <AlertCircle className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                <div>
                  <p className="font-medium text-amber-800">
                    No Template Selected
                  </p>
                  <p className="mt-1 text-amber-700">
                    Please save your workflow as a template first before
                    deploying.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isApiConnected && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
              <div className="flex items-start">
                <AlertCircle className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                <div>
                  <p className="font-medium text-amber-800">
                    API Connection Required
                  </p>
                  <p className="mt-1 text-amber-700">
                    You need to connect to the LUSID API before deploying. Go to
                    Settings to configure your connection.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Current Deployment Section */}
          {deploymentStarted && deploymentLogs.length > 0 && (
            <div className="mt-2 space-y-4">
              <h3 className="text-base font-medium">Current Deployment</h3>
              <DeploymentProgress
                deploymentLogs={deploymentLogs}
                isDeploying={isDeploying}
                deploymentStartTime={deploymentStartTime}
                deploymentId={deploymentTemplateVersionId || 'current'}
              />
            </div>
          )}

          {/* Package Preview (when not yet deployed) */}
          {hasDeployableContent && !deploymentStarted && (
            <DeploymentPreview
              deploymentPackage={deploymentPackage}
              componentDeploymentStatus={componentDeploymentStatus}
            />
          )}

          {/* Deployment History */}
          <DeploymentHistory
            previousDeployments={previousDeployments}
            isLoadingHistory={isLoadingHistory}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading && isDeploying}
          >
            {deploymentStarted && !isDeploying ? 'Close' : 'Cancel'}
          </Button>
          {!deploymentStarted && (
            <Button
              onClick={startDeployment}
              disabled={
                isLoading ||
                !isApiConnected ||
                !hasDeployableContent ||
                !selectedTemplate
              }
              className="bg-green-700 text-white hover:bg-green-800"
            >
              <Rocket className="mr-2 h-4 w-4" />
              {isLoading ? 'Preparing...' : 'Deploy'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
