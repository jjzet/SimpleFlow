// @ts-nocheck
'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { lusidApiService } from '@/lib/services/lusid-api-service';
import {
  lusidDeploymentService,
  DeploymentLog,
  ComponentType,
} from '@/lib/services/lusid-deployment-service';
import { useToast } from '@/components/ui/use-toast';
import { Template } from '@/types/template';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { supabaseClient } from '@/lib/services/supabase-client-new';
import { getCodeChecksum } from '@/lib/utils/code-checksum';

// Define component types for deployment
export interface DeploymentComponent {
  node: Node;
  code: any;
}

// Interface for deployment package
export interface DeploymentPackage {
  workers: DeploymentComponent[];
  exceptionTasks: DeploymentComponent[];
  childTasks: DeploymentComponent[];
  parentTasks: DeploymentComponent[];
  eventHandlers: DeploymentComponent[];
}

// Interface for deployment history item
export interface DeploymentHistoryItemType {
  templateVersionId: string;
  templateName: string;
  templateVersion: string;
  startTime: Date;
  logs: DeploymentLog[];
}

// Props for useDeployment hook
export interface UseDeploymentProps {
  isOpen: boolean;
  currentTemplate: Template | null;
  nodes: Node[];
  generateTaskDefinitionCode: (nodeId: string) => any;
  generateWorkerCode: (nodeId: string) => any;
  generateEventHandlerCode: (nodeId: string) => any;
}

export const useDeployment = ({
  isOpen,
  currentTemplate,
  nodes,
  generateTaskDefinitionCode,
  generateWorkerCode,
  generateEventHandlerCode,
}: UseDeploymentProps) => {
  const { toast } = useToast();

  const [isApiConnected, setIsApiConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [deploymentPackage, setDeploymentPackage] = useState<DeploymentPackage>(
    {
      workers: [],
      exceptionTasks: [],
      childTasks: [],
      parentTasks: [],
      eventHandlers: [],
    }
  );

  const [componentDeploymentStatus, setComponentDeploymentStatus] = useState<
    Record<
      string,
      {
        status: 'new' | 'modified' | 'deployed';
        lastDeployed?: string;
      }
    >
  >({});

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [hasDeployableContent, setHasDeployableContent] =
    useState<boolean>(false);
  const [deploymentStarted, setDeploymentStarted] = useState<boolean>(false);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [deploymentTemplateVersionId, setDeploymentTemplateVersionId] =
    useState<string | null>(null);
  const [deploymentLogs, setDeploymentLogs] = useState<DeploymentLog[]>([]);
  const [deploymentStartTime, setDeploymentStartTime] = useState<Date>(
    new Date()
  );
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const [previousDeployments, setPreviousDeployments] = useState<
    DeploymentHistoryItemType[]
  >([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historyFetched, setHistoryFetched] = useState<boolean>(false);

  // Helper function to process a group of components and determine their status
  const processComponentGroup = async (
    components: DeploymentComponent[],
    componentType: ComponentType,
    logs: DeploymentLog[],
    statusMap: Record<
      string,
      {
        status: 'new' | 'modified' | 'deployed';
        lastDeployed?: string;
      }
    >
  ) => {
    for (const component of components) {
      const { node, code } = component;

      // Generate checksum for current code
      const currentChecksum = getCodeChecksum(code);

      // Get scope and code from the component
      const scope = code.id?.scope;
      const compCode = code.id?.code;

      if (!scope || !compCode) continue;

      // First try to find deployments for this component in ANY version of the same template
      // by looking up all successful deployments with matching scope/code/component_type
      const { data: previousDeployments, error } = await supabaseClient
        .from('deployment_logs')
        .select(
          'id, template_version_id, code_checksum, updated_at, component_id'
        )
        .eq('scope', scope)
        .eq('code', compCode)
        .eq('component_type', componentType)
        .eq('status', 'success')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching previous deployments:', error);
        statusMap[node.id] = { status: 'new' };
        continue;
      }

      // If there are no previous deployments at all, it's a new component
      if (!previousDeployments || previousDeployments.length === 0) {
        statusMap[node.id] = { status: 'new' };
        continue;
      }

      // Get the most recent successful deployment
      const latestDeployment = previousDeployments[0];

      // Compare the checksum to determine if it has been modified
      if (latestDeployment.code_checksum === currentChecksum) {
        // Code is unchanged - mark as deployed
        statusMap[node.id] = {
          status: 'deployed',
          lastDeployed: latestDeployment.updated_at,
        };
      } else {
        // Code has been modified
        statusMap[node.id] = {
          status: 'modified',
          lastDeployed: latestDeployment.updated_at,
        };
      }
    }
  };

  // Fetch component deployment status
  const fetchComponentDeploymentStatus = async (templateVersionId: string) => {
    try {
      console.log(
        'Fetching component deployment status for version:',
        templateVersionId
      );

      // Get the template ID from the current template
      const templateId = currentTemplate?.id;
      if (!templateId) {
        console.error(
          'No template ID available for fetching deployment status'
        );
        return;
      }

      // Get all deployment logs for this template version
      const logs =
        await lusidDeploymentService.getDeploymentLogs(templateVersionId);
      console.log(
        'Retrieved',
        logs.length,
        'deployment logs for template version',
        templateVersionId,
        logs
      );

      // Also fetch deployment logs from previous versions of the same template
      // to properly determine modified/deployed status
      console.log(
        'Fetching logs from previous template versions for the same template:',
        templateId
      );
      const { data: previousVersions, error: versionError } =
        await supabaseClient
          .from('template_versions')
          .select('id')
          .eq('template_id', templateId)
          .neq('id', templateVersionId) // Exclude current version
          .order('created_at', { ascending: false });

      let allLogs = [...logs];

      if (!versionError && previousVersions && previousVersions.length > 0) {
        for (const version of previousVersions) {
          const versionLogs = await lusidDeploymentService.getDeploymentLogs(
            version.id
          );
          console.log(
            'Retrieved',
            versionLogs.length,
            'deployment logs for previous version',
            version.id
          );
          allLogs = [...allLogs, ...versionLogs];
        }
      }

      console.log('Combined logs from all versions:', allLogs.length);

      // Create a mapping of component IDs to their deployment status
      const statusMap: Record<
        string,
        {
          status: 'new' | 'modified' | 'deployed';
          lastDeployed?: string;
        }
      > = {};

      // Process deployment logs to determine component status
      if (deploymentPackage) {
        // Process workers
        await processComponentGroup(
          deploymentPackage.workers,
          'worker',
          allLogs,
          statusMap
        );

        // Process exception tasks
        await processComponentGroup(
          deploymentPackage.exceptionTasks,
          'task_definition_exception',
          allLogs,
          statusMap
        );

        // Process child tasks
        await processComponentGroup(
          deploymentPackage.childTasks,
          'task_definition_child',
          allLogs,
          statusMap
        );

        // Process parent tasks
        await processComponentGroup(
          deploymentPackage.parentTasks,
          'task_definition_parent',
          allLogs,
          statusMap
        );

        // Process event handlers
        await processComponentGroup(
          deploymentPackage.eventHandlers,
          'event_handler',
          allLogs,
          statusMap
        );
      }

      // Set the component status map
      setComponentDeploymentStatus(statusMap);
      console.log('Component deployment status updated:', statusMap);
    } catch (error) {
      console.error('Error fetching component deployment status:', error);
    }
  };

  // Reset state when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      // Set loading state and API connection status
      setIsLoading(true);
      setIsApiConnected(lusidApiService.getConnectionStatus() === 'connected');

      // Initialize state with the current template
      if (currentTemplate) {
        setSelectedTemplate(currentTemplate);
        prepareDeploymentPackage();

        // Fetch component deployment status
        if (currentTemplate.id && currentTemplate.version) {
          console.log('Checking template version status');
          lusidDeploymentService
            .checkTemplateVersionStatus(
              currentTemplate.id,
              currentTemplate.version
            )
            .then((result) => {
              if (result.exists && result.id) {
                console.log(
                  'Template version exists, fetching component status'
                );
                fetchComponentDeploymentStatus(result.id);

                // Always fetch deployment history for the template
                console.log('Fetching initial deployment history');
                fetchDeploymentHistory(currentTemplate.id);
              }
            });
        } else {
          // Still fetch deployment history even if we don't have a specific version
          if (currentTemplate.id) {
            console.log('Fetching initial deployment history without version');
            fetchDeploymentHistory(currentTemplate.id);
          }
        }
      }
    } else {
      // Reset state when modal is closed
      setDeploymentPackage({
        workers: [],
        exceptionTasks: [],
        childTasks: [],
        parentTasks: [],
        eventHandlers: [],
      });
      setComponentDeploymentStatus({});
      setSelectedTemplate(null);
      setDeploymentStarted(false);
      setIsDeploying(false);
      setDeploymentTemplateVersionId(null);
      setDeploymentLogs([]);
      setPreviousDeployments([]);
      setIsLoadingHistory(false);
      setHistoryFetched(false);
      if (pollInterval) {
        clearInterval(pollInterval);
        setPollInterval(null);
      }
    }
  }, [isOpen, currentTemplate, deploymentPackage?.workers?.length]);

  // Fetch previous deployments for a template
  const fetchDeploymentHistory = async (templateId: string) => {
    try {
      // Query for template versions
      console.log('Fetching deployment history for template:', templateId);
      setIsLoadingHistory(true);

      const { data: versionData, error: versionError } = await supabaseClient
        .from('template_versions')
        .select('id, version, deployment_status, created_at')
        .eq('template_id', templateId)
        .order('created_at', { ascending: false });

      if (versionError) {
        console.error('Error fetching template versions:', versionError);
        setIsLoadingHistory(false);
        return;
      }

      console.log('Template versions found:', versionData?.length, versionData);

      // Early return if no version data found to avoid showing loading state
      if (!versionData || versionData.length === 0) {
        console.log('No template versions found, skipping history fetch');
        setIsLoadingHistory(false);
        return;
      }

      const history: DeploymentHistoryItemType[] = [];

      // For each version, fetch its deployment logs
      for (const version of versionData || []) {
        console.log(
          'Checking version:',
          version.id,
          'Deployment status:',
          version.deployment_status
        );

        try {
          console.log(`Fetching logs for template version: ${version.id}`);
          const logs = await lusidDeploymentService.getDeploymentLogs(
            version.id
          );

          console.log(
            `Found ${logs?.length || 0} logs for version ${version.id}`,
            logs
          );

          if (logs && logs.length > 0) {
            // Get template name if not available
            let templateName = currentTemplate?.name;
            if (!templateName) {
              try {
                const { data: templateData } = await supabaseClient
                  .from('templates')
                  .select('name')
                  .eq('id', templateId)
                  .single();

                if (templateData) {
                  templateName = templateData.name;
                  console.log(`Fetched template name: ${templateName}`);
                }
              } catch (templateError) {
                console.error('Error fetching template name:', templateError);
              }
            }

            history.push({
              templateVersionId: version.id,
              templateName: templateName || 'Unknown Template',
              templateVersion: version.version,
              startTime: new Date(version.created_at),
              logs: logs,
            });

            console.log('Added to history:', version.id);
          } else {
            console.log(`No logs found for version ${version.id} - skipping`);
          }
        } catch (error) {
          console.error(
            `Error fetching logs for version ${version.id}:`,
            error
          );
        }
      }

      console.log('Final history array:', history);
      setPreviousDeployments(history);
      setHistoryFetched(true);
    } catch (error) {
      console.error('Error in fetchDeploymentHistory:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Cleanup poll interval on unmount or close
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  // Prepare the deployment package
  const prepareDeploymentPackage = () => {
    try {
      setIsLoading(true);

      const workers: DeploymentComponent[] = [];
      const exceptionTasks: DeploymentComponent[] = [];
      const childTasks: DeploymentComponent[] = [];
      const parentTasks: DeploymentComponent[] = [];
      const eventHandlers: DeploymentComponent[] = [];

      // Process nodes to organize into deployment categories
      nodes.forEach((node) => {
        try {
          if (node.type === 'worker') {
            const code = generateWorkerCode(node.id);
            workers.push({ node, code });
          } else if (node.type === 'taskDefinition') {
            const code = generateTaskDefinitionCode(node.id);
            if (node.data.type === 'exception') {
              exceptionTasks.push({ node, code });
            } else if (node.data.type === 'child') {
              childTasks.push({ node, code });
            } else if (node.data.type === 'parent') {
              parentTasks.push({ node, code });
            }
          } else if (node.type === 'eventHandler') {
            const code = generateEventHandlerCode(node.id);
            eventHandlers.push({ node, code });
          }
        } catch (error) {
          console.error(`Error generating code for node ${node.id}:`, error);
        }
      });

      setDeploymentPackage({
        workers,
        exceptionTasks,
        childTasks,
        parentTasks,
        eventHandlers,
      });

      // Check if there are components to deploy
      setHasDeployableContent(
        workers.length > 0 ||
          exceptionTasks.length > 0 ||
          childTasks.length > 0 ||
          parentTasks.length > 0 ||
          eventHandlers.length > 0
      );

      setIsLoading(false);
    } catch (error) {
      console.error('Error preparing deployment package:', error);
      setIsLoading(false);
    }
  };

  // Start deployment
  const startDeployment = async () => {
    try {
      if (
        !selectedTemplate ||
        !selectedTemplate.id ||
        !selectedTemplate.version
      ) {
        toast({
          title: 'Error',
          description: 'Template information is missing',
          variant: 'destructive',
        });
        return;
      }

      setIsDeploying(true);
      setDeploymentStarted(true);
      setDeploymentStartTime(new Date());

      // Check if this template version has already been deployed
      const result = await lusidDeploymentService.checkTemplateVersionStatus(
        selectedTemplate.id,
        selectedTemplate.version
      );

      // Get or create a template version ID for deployment logs
      let templateVersionId: string;
      if (result.exists && result.id) {
        templateVersionId = result.id;
        console.log('Using existing template version ID:', templateVersionId);
      } else {
        // Create a new template version entry
        const createResult = await lusidDeploymentService.createTemplateVersion(
          selectedTemplate.id,
          selectedTemplate.version,
          selectedTemplate.workflow_data
        );
        if (!createResult.success || !createResult.id) {
          toast({
            title: 'Error',
            description: 'Failed to create template version',
            variant: 'destructive',
          });
          setIsDeploying(false);
          setDeploymentStarted(false);
          return;
        }
        templateVersionId = createResult.id;
        console.log('Created new template version ID:', templateVersionId);
      }

      setDeploymentTemplateVersionId(templateVersionId);

      // Create deployment logs for all components
      await createDeploymentLogs(templateVersionId);

      // Start the deployment process
      await executeDeployment(templateVersionId);

      // Start polling for deployment log updates
      const interval = setInterval(() => {
        if (templateVersionId) {
          lusidDeploymentService
            .getDeploymentLogs(templateVersionId)
            .then((logs) => {
              setDeploymentLogs(logs);

              // Check if all components are deployed
              const pendingCount = logs.filter(
                (log) => log.status === 'pending'
              ).length;
              if (pendingCount === 0 && logs.length > 0) {
                // All components have been processed
                clearInterval(interval);
                setIsDeploying(false);

                // Count successes and failures
                const successCount = logs.filter(
                  (log) => log.status === 'success'
                ).length;
                const failedCount = logs.filter(
                  (log) => log.status === 'failed'
                ).length;
                const skippedCount = logs.filter(
                  (log) => log.status === 'skipped'
                ).length;

                console.log(
                  `Deployment complete! ${successCount} successful, ${failedCount} failed, ${skippedCount} skipped`
                );

                // Update deployment summary after completion
                console.log(
                  `Updating deployment summary for template version ${templateVersionId}`
                );
                lusidDeploymentService
                  .updateDeploymentSummaryAfterCompletion(templateVersionId)
                  .then((updated) => {
                    if (updated) {
                      console.log('Successfully updated deployment summary');
                    } else {
                      console.error('Failed to update deployment summary');
                    }
                  });

                // Refresh deployment history if template ID is available
                if (selectedTemplate?.id) {
                  console.log('Refreshing deployment history after completion');
                  fetchDeploymentHistory(selectedTemplate.id);
                } else {
                  console.log(
                    'Deployment history already fetched or no template ID available'
                  );
                }
              }
            });
        }
      }, 2000);

      setPollInterval(interval);
    } catch (error) {
      console.error('Error in startDeployment:', error);
      setIsDeploying(false);
      setDeploymentStarted(false);

      toast({
        title: 'Error',
        description: 'Failed to start deployment',
        variant: 'destructive',
      });
    }
  };

  // Create initial deployment logs for all components
  const createDeploymentLogs = async (templateVersionId: string) => {
    try {
      const allLogs: DeploymentLog[] = [];

      // Create logs for workers
      for (const worker of deploymentPackage.workers) {
        const { node, code } = worker;
        const checksum = getCodeChecksum(code);

        const log = await lusidDeploymentService.createDeploymentLog(
          templateVersionId,
          'worker',
          node.id,
          node.data?.name || 'Unnamed Worker',
          code.id?.scope || '',
          code.id?.code || '',
          checksum,
          code
        );

        if (log) allLogs.push(log);
      }

      // Create logs for exception tasks
      for (const task of deploymentPackage.exceptionTasks) {
        const { node, code } = task;
        const checksum = getCodeChecksum(code);

        const log = await lusidDeploymentService.createDeploymentLog(
          templateVersionId,
          'task_definition_exception',
          node.id,
          node.data?.name || 'Unnamed Exception Task',
          code.id?.scope || '',
          code.id?.code || '',
          checksum,
          code
        );

        if (log) allLogs.push(log);
      }

      // Create logs for child tasks
      for (const task of deploymentPackage.childTasks) {
        const { node, code } = task;
        const checksum = getCodeChecksum(code);

        const log = await lusidDeploymentService.createDeploymentLog(
          templateVersionId,
          'task_definition_child',
          node.id,
          node.data?.name || 'Unnamed Child Task',
          code.id?.scope || '',
          code.id?.code || '',
          checksum,
          code
        );

        if (log) allLogs.push(log);
      }

      // Create logs for parent tasks
      for (const task of deploymentPackage.parentTasks) {
        const { node, code } = task;
        const checksum = getCodeChecksum(code);

        const log = await lusidDeploymentService.createDeploymentLog(
          templateVersionId,
          'task_definition_parent',
          node.id,
          node.data?.name || 'Unnamed Parent Task',
          code.id?.scope || '',
          code.id?.code || '',
          checksum,
          code
        );

        if (log) allLogs.push(log);
      }

      // Create logs for event handlers
      for (const handler of deploymentPackage.eventHandlers) {
        const { node, code } = handler;
        const checksum = getCodeChecksum(code);

        const log = await lusidDeploymentService.createDeploymentLog(
          templateVersionId,
          'event_handler',
          node.id,
          node.data?.name || 'Unnamed Event Handler',
          code.id?.scope || '',
          code.id?.code || '',
          checksum,
          code
        );

        if (log) allLogs.push(log);
      }

      setDeploymentLogs(allLogs);
    } catch (error) {
      console.error('Error creating deployment logs:', error);
    }
  };

  // Execute the deployment of all components
  const executeDeployment = async (templateVersionId: string) => {
    try {
      // Deploy workers first
      for (const worker of deploymentPackage.workers) {
        const result = await lusidDeploymentService.deployWorker(
          templateVersionId,
          worker.node.id,
          worker.code
        );
        console.log(`Worker deployment result:`, result);
      }

      // Deploy exception tasks next
      for (const task of deploymentPackage.exceptionTasks) {
        const result = await lusidDeploymentService.deployTaskDefinition(
          templateVersionId,
          task.node.id,
          task.code,
          'exception'
        );
        console.log(`Exception task deployment result:`, result);
      }

      // Deploy child tasks next
      for (const task of deploymentPackage.childTasks) {
        const result = await lusidDeploymentService.deployTaskDefinition(
          templateVersionId,
          task.node.id,
          task.code,
          'child'
        );
        console.log(`Child task deployment result:`, result);
      }

      // Deploy parent tasks next
      for (const task of deploymentPackage.parentTasks) {
        const result = await lusidDeploymentService.deployTaskDefinition(
          templateVersionId,
          task.node.id,
          task.code,
          'parent'
        );
        console.log(`Parent task deployment result:`, result);
      }

      // Deploy event handlers last
      for (const handler of deploymentPackage.eventHandlers) {
        const result = await lusidDeploymentService.deployEventHandler(
          templateVersionId,
          handler.node.id,
          handler.code
        );
        console.log(`Event handler deployment result:`, result);
      }
    } catch (error) {
      console.error('Error executing deployment:', error);
    }
  };

  // Get status indicator color and label
  const getStatusIndicator = () => {
    switch (lusidApiService.getConnectionStatus()) {
      case 'connected':
        return {
          color: 'text-green-500',
          label: 'Connected',
          icon: <CheckCircle2 className="mr-2 h-4 w-4" />,
        };
      case 'disconnected':
        return {
          color: 'text-red-500',
          label: 'Disconnected',
          icon: <AlertCircle className="mr-2 h-4 w-4" />,
        };
      default:
        return {
          color: 'text-gray-400',
          label: 'Status Unknown',
          icon: <AlertCircle className="mr-2 h-4 w-4" />,
        };
    }
  };

  return {
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
  };
};
