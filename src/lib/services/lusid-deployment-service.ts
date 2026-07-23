import { lusidApiService } from './lusid-api-service';
import { supabaseClient } from './supabase-client-new';
import { Node } from 'reactflow';
import { getCodeChecksum } from '../utils/code-checksum';

// Component types
export type ComponentType =
  | 'worker'
  | 'task_definition_parent'
  | 'task_definition_child'
  | 'task_definition_exception'
  | 'event_handler';

// Status types
export type DeploymentStatus =
  | 'not_deployed'
  | 'deployed'
  | 'partially_deployed'
  | 'deployment_failed';

export type ComponentStatus = 'pending' | 'success' | 'failed' | 'skipped';

// Component change status
export type ComponentChangeStatus =
  | 'new' // Component never deployed before
  | 'modified' // Component deployed before but modified
  | 'deployed'; // Component deployed and unchanged

// Interface for deployment logs
export interface DeploymentLog {
  id: string;
  template_version_id: string;
  component_type: ComponentType;
  component_id: string;
  component_name: string;
  scope: string;
  code: string;
  code_checksum?: string; // Checksum to track changes
  status: ComponentStatus;
  request_body?: any;
  response_data?: any;
  created_at: string;
  updated_at: string;
}

// Interface for deployment summary
export interface DeploymentSummary {
  template_version_id: string;
  template_id: string;
  template_name: string;
  version: string;
  deployment_status: DeploymentStatus;
  last_deployment_at: string | null;
  total_components: number;
  successful_components: number;
  failed_components: number;
  pending_components: number;
  skipped_components: number;
  component_details: Array<{
    id: string;
    component_type: ComponentType;
    component_name: string;
    scope: string;
    code: string;
    status: ComponentStatus;
    created_at: string;
    updated_at: string;
  }>;
}

class LusidDeploymentService {
  // Check if a template version exists and is ready for deployment
  async checkTemplateVersionStatus(
    templateId: string,
    version: string
  ): Promise<{
    exists: boolean;
    id?: string;
    deployment_status?: DeploymentStatus;
  }> {
    try {
      const { data, error } = await supabaseClient
        .from('template_versions')
        .select('id, deployment_status')
        .eq('template_id', templateId)
        .eq('version', version)
        .single();

      if (error) {
        console.error('Error checking template version status:', error);
        return { exists: false };
      }

      if (data) {
        return {
          exists: true,
          id: data.id,
          deployment_status: data.deployment_status as DeploymentStatus,
        };
      }

      return { exists: false };
    } catch (error) {
      console.error('Error in checkTemplateVersionStatus:', error);
      return { exists: false };
    }
  }

  // Initialize deployment logs for a new deployment
  async initializeDeployment(
    templateVersionId: string,
    components: Array<{
      type: ComponentType;
      nodeId: string;
      name: string;
      scope: string;
      code: string;
      requestBody: any;
    }>
  ): Promise<boolean> {
    try {
      // First clear any existing deployment logs for this template version
      const { error: deleteError } = await supabaseClient
        .from('deployment_logs')
        .delete()
        .eq('template_version_id', templateVersionId);

      if (deleteError) {
        console.error('Error clearing existing deployment logs:', deleteError);
        return false;
      }

      // Create new deployment logs with pending status
      const logsToInsert = components.map((component) => ({
        template_version_id: templateVersionId,
        component_type: component.type,
        component_id: component.nodeId,
        component_name: component.name,
        scope: component.scope,
        code: component.code,
        code_checksum: getCodeChecksum(component.requestBody), // Store checksum of the request body
        status: 'pending' as ComponentStatus,
        request_body: component.requestBody,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      if (logsToInsert.length === 0) {
        return true; // Nothing to deploy
      }

      const { error: insertError } = await supabaseClient
        .from('deployment_logs')
        .insert(logsToInsert);

      if (insertError) {
        console.error('Error initializing deployment logs:', insertError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in initializeDeployment:', error);
      return false;
    }
  }

  // Update the status of a specific component deployment
  async updateComponentStatus(
    templateVersionId: string,
    componentId: string,
    status: ComponentStatus,
    responseData?: any
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (responseData) {
        updateData.response_data = responseData;
      }

      const { error } = await supabaseClient
        .from('deployment_logs')
        .update(updateData)
        .eq('template_version_id', templateVersionId)
        .eq('component_id', componentId);

      if (error) {
        console.error('Error updating component status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateComponentStatus:', error);
      return false;
    }
  }

  // Get all deployment logs for a template version
  async getDeploymentLogs(templateVersionId: string): Promise<DeploymentLog[]> {
    try {
      console.log(
        `Getting deployment logs for template version: ${templateVersionId}`
      );

      const { data, error } = await supabaseClient
        .from('deployment_logs')
        .select('*')
        .eq('template_version_id', templateVersionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching deployment logs:', error);
        return [];
      }

      console.log(
        `Retrieved ${data?.length || 0} deployment logs for template version ${templateVersionId}`,
        data
      );
      return data as DeploymentLog[];
    } catch (error) {
      console.error('Error in getDeploymentLogs:', error);
      return [];
    }
  }

  // Create a deployment log entry for a single component
  async createDeploymentLog(
    templateVersionId: string,
    componentType: ComponentType,
    componentId: string,
    componentName: string,
    scope: string,
    code: string,
    codeChecksum: string,
    requestBody: any
  ): Promise<DeploymentLog | null> {
    try {
      // Create the log entry
      const logEntry = {
        template_version_id: templateVersionId,
        component_type: componentType,
        component_id: componentId,
        component_name: componentName,
        scope,
        code,
        code_checksum: codeChecksum,
        status: 'pending' as ComponentStatus,
        request_body: requestBody,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Insert the log entry
      const { data, error } = await supabaseClient
        .from('deployment_logs')
        .insert(logEntry)
        .select()
        .single();

      if (error) {
        console.error('Error creating deployment log:', error);
        return null;
      }

      return data as DeploymentLog;
    } catch (error) {
      console.error('Error in createDeploymentLog:', error);
      return null;
    }
  }

  // Update template version deployment status
  async updateTemplateVersionStatus(
    templateVersionId: string,
    status: DeploymentStatus
  ): Promise<boolean> {
    try {
      const { error } = await supabaseClient
        .from('template_versions')
        .update({
          deployment_status: status,
        })
        .eq('id', templateVersionId);

      if (error) {
        console.error('Error updating template version status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateTemplateVersionStatus:', error);
      return false;
    }
  }

  // Get deployment summary for a template version
  async getDeploymentSummary(
    templateVersionId: string
  ): Promise<DeploymentSummary | null> {
    try {
      const { data, error } = await supabaseClient
        .from('deployment_summary')
        .select('*')
        .eq('template_version_id', templateVersionId)
        .single();

      if (error) {
        console.error('Error fetching deployment summary:', error);
        return null;
      }

      return data as DeploymentSummary;
    } catch (error) {
      console.error('Error in getDeploymentSummary:', error);
      return null;
    }
  }

  // Get the change status of a component by comparing code checksums
  async getComponentChangeStatus(
    scope: string,
    code: string,
    componentType: ComponentType,
    currentChecksum: string,
    templateId?: string
  ): Promise<ComponentChangeStatus> {
    try {
      // Build the query to find the latest successful deployment for this component
      let query = supabaseClient
        .from('deployment_logs')
        .select('code_checksum, created_at, template_version_id')
        .eq('scope', scope)
        .eq('code', code)
        .eq('component_type', componentType)
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1);

      // If we have a templateId, we should join with template_versions to check
      // if this component was deployed in any version of the same template
      if (templateId) {
        // Get all versions of this template
        const { data: templateVersions, error: templateVersionsError } =
          await supabaseClient
            .from('template_versions')
            .select('id')
            .eq('template_id', templateId);

        if (
          !templateVersionsError &&
          templateVersions &&
          templateVersions.length > 0
        ) {
          // Extract the version IDs
          const versionIds = templateVersions.map((v) => v.id);

          // Add the filter to only consider deployments from this template's versions
          query = query.in('template_version_id', versionIds);
        }
      }

      // Execute the query
      const { data, error } = await query;

      if (error) {
        console.error('Error checking component status:', error);
        return 'new';
      }

      // If no previous successful deployment found, it's a new component
      if (!data || data.length === 0 || !data[0].code_checksum) {
        return 'new';
      }

      // Compare checksums to determine if modified
      return data[0].code_checksum === currentChecksum
        ? 'deployed'
        : 'modified';
    } catch (error) {
      console.error('Error in getComponentChangeStatus:', error);
      return 'new'; // Safely assume new if there's an error
    }
  }

  // Update deployment summary after all components are deployed
  async updateDeploymentSummaryAfterCompletion(
    templateVersionId: string
  ): Promise<boolean> {
    try {
      console.log(
        `Checking deployment completion status for template version: ${templateVersionId}`
      );

      // Get the template ID for this version for reference
      const { data: templateVersion, error: templateVersionError } =
        await supabaseClient
          .from('template_versions')
          .select('template_id')
          .eq('id', templateVersionId)
          .single();

      if (templateVersionError || !templateVersion) {
        console.error('Error fetching template version:', templateVersionError);
        return false;
      }

      // Get all deployment logs for this template version
      const { data: logs, error: logsError } = await supabaseClient
        .from('deployment_logs')
        .select('*')
        .eq('template_version_id', templateVersionId);

      if (logsError) {
        console.error('Error fetching deployment logs:', logsError);
        return false;
      }

      if (!logs || logs.length === 0) {
        console.log('No deployment logs found for this template version.');
        return false;
      }

      // Count components by status
      const statusCounts = {
        success: 0,
        failed: 0,
        pending: 0,
        skipped: 0,
      };

      logs.forEach((log) => {
        if (log.status in statusCounts) {
          statusCounts[log.status as keyof typeof statusCounts]++;
        }
      });

      console.log('Component deployment status counts:', statusCounts);

      // Determine overall deployment status
      let deploymentStatus: DeploymentStatus = 'not_deployed';
      let deploymentDetails = {
        total: logs.length,
        success: statusCounts.success,
        failed: statusCounts.failed,
        pending: statusCounts.pending,
        skipped: statusCounts.skipped,
        lastUpdated: new Date().toISOString(),
      };

      // If there are any components at all
      if (logs.length > 0) {
        if (statusCounts.pending > 0) {
          // If any components are still pending
          deploymentStatus = 'not_deployed'; // Using 'not_deployed' for in-progress
        } else if (statusCounts.failed > 0) {
          // If any components failed
          deploymentStatus =
            statusCounts.success > 0
              ? 'partially_deployed'
              : 'deployment_failed';
        } else if (
          statusCounts.success + statusCounts.skipped ===
          logs.length
        ) {
          // All components succeeded or were skipped
          deploymentStatus = 'deployed';
        }
      }

      console.log(
        `Setting template version ${templateVersionId} status to: ${deploymentStatus}`
      );

      // Update the template version status
      const { error: updateError } = await supabaseClient
        .from('template_versions')
        .update({
          deployment_status: deploymentStatus,
          last_deployment_at: new Date().toISOString(),
          deployment_details: deploymentDetails,
        })
        .eq('id', templateVersionId);

      if (updateError) {
        console.error(
          'Error updating template version deployment status:',
          updateError
        );
        return false;
      }

      // Get the updated deployment summary to verify
      const summary = await this.getDeploymentSummary(templateVersionId);
      console.log('Updated deployment summary:', summary);

      return true;
    } catch (error) {
      console.error('Error in updateDeploymentSummaryAfterCompletion:', error);
      return false;
    }
  }

  // Deploy a worker to LUSID
  async deployWorker(
    templateVersionId: string,
    componentId: string,
    requestBody: any
  ): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      // Extract scope and code for determining if this is a create or update
      const scope = requestBody.id?.scope;
      const code = requestBody.id?.code;

      if (!scope || !code) {
        return {
          success: false,
          error: 'Missing scope or code in worker request body',
        };
      }

      // Calculate checksum for the current code
      const currentChecksum = getCodeChecksum(requestBody);

      // Get the template ID for this version to check lineage
      const { data: versionData, error: versionError } = await supabaseClient
        .from('template_versions')
        .select('template_id')
        .eq('id', templateVersionId)
        .single();

      const templateId = versionData?.template_id;

      // Check if this component is new, modified, or unchanged
      const changeStatus = await this.getComponentChangeStatus(
        scope,
        code,
        'worker',
        currentChecksum,
        templateId
      );

      // Skip if deployed and unchanged
      if (changeStatus === 'deployed') {
        console.log(
          `Worker ${scope}/${code} is already deployed, skipping deployment`
        );
        // Update the deployment log to mark as skipped
        await this.updateComponentStatus(
          templateVersionId,
          componentId,
          'skipped',
          { message: 'Component is already deployed' }
        );
        return {
          success: true,
          data: { skipped: true, message: 'Component is already deployed' },
        };
      }

      // Determine if this needs to be created or updated
      const isUpdate = changeStatus === 'modified';
      const endpoint = isUpdate
        ? `/api/lusid/update/workers/${encodeURIComponent(scope)}/${encodeURIComponent(code)}`
        : '/api/lusid/deploy/workers';

      // Make API request to deploy worker
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scope,
          code,
          requestBody,
          baseUrl: lusidApiService.getSettings()?.baseUrl,
          accessToken: lusidApiService.getSettings()?.accessToken,
        }),
      });

      const responseData = await response.json();

      // Update the deployment log with the result
      await this.updateComponentStatus(
        templateVersionId,
        componentId,
        response.ok ? 'success' : 'failed',
        responseData
      );

      return {
        success: response.ok,
        data: responseData,
        error: !response.ok ? responseData : undefined,
      };
    } catch (error) {
      console.error('Error deploying worker:', error);

      // Update the deployment log with the failure
      await this.updateComponentStatus(
        templateVersionId,
        componentId,
        'failed',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Deploy a task definition to LUSID
  async deployTaskDefinition(
    templateVersionId: string,
    componentId: string,
    requestBody: any,
    taskType: 'parent' | 'child' | 'exception'
  ): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      // Extract scope and code for determining if this is a create or update
      const scope = requestBody.id?.scope;
      const code = requestBody.id?.code;

      if (!scope || !code) {
        return {
          success: false,
          error: 'Missing scope or code in task definition request body',
        };
      }

      // Calculate checksum for the current code
      const currentChecksum = getCodeChecksum(requestBody);

      // Determine component type based on task type
      const componentType: ComponentType =
        taskType === 'parent'
          ? 'task_definition_parent'
          : taskType === 'child'
            ? 'task_definition_child'
            : 'task_definition_exception';

      // Get the template ID for this version to check lineage
      const { data: versionData, error: versionError } = await supabaseClient
        .from('template_versions')
        .select('template_id')
        .eq('id', templateVersionId)
        .single();

      const templateId = versionData?.template_id;

      // Check if this component is new, modified, or unchanged
      const changeStatus = await this.getComponentChangeStatus(
        scope,
        code,
        componentType,
        currentChecksum,
        templateId
      );

      // Skip if deployed and unchanged
      if (changeStatus === 'deployed') {
        console.log(
          `Task definition ${scope}/${code} (${taskType}) is already deployed, skipping deployment`
        );
        // Update the deployment log to mark as skipped
        await this.updateComponentStatus(
          templateVersionId,
          componentId,
          'skipped',
          { message: 'Component is already deployed' }
        );
        return {
          success: true,
          data: { skipped: true, message: 'Component is already deployed' },
        };
      }

      // Determine if this needs to be created or updated
      const isUpdate = changeStatus === 'modified';
      const endpoint = isUpdate
        ? `/api/lusid/update/task-definitions/${encodeURIComponent(scope)}/${encodeURIComponent(code)}`
        : '/api/lusid/deploy/task-definitions';

      // Make API request to deploy task definition
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scope,
          code,
          requestBody,
          baseUrl: lusidApiService.getSettings()?.baseUrl,
          accessToken: lusidApiService.getSettings()?.accessToken,
        }),
      });

      const responseData = await response.json();

      // Update the deployment log with the result
      await this.updateComponentStatus(
        templateVersionId,
        componentId,
        response.ok ? 'success' : 'failed',
        responseData
      );

      return {
        success: response.ok,
        data: responseData,
        error: !response.ok ? responseData : undefined,
      };
    } catch (error) {
      console.error(`Error deploying ${taskType} task definition:`, error);

      // Update the deployment log with the failure
      await this.updateComponentStatus(
        templateVersionId,
        componentId,
        'failed',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Deploy an event handler to LUSID
  async deployEventHandler(
    templateVersionId: string,
    componentId: string,
    requestBody: any
  ): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      // Extract scope and code for determining if this is a create or update
      const scope = requestBody.id?.scope;
      const code = requestBody.id?.code;

      if (!scope || !code) {
        return {
          success: false,
          error: 'Missing scope or code in event handler request body',
        };
      }

      // Calculate checksum for the current code
      const currentChecksum = getCodeChecksum(requestBody);

      // Get the template ID for this version to check lineage
      const { data: versionData, error: versionError } = await supabaseClient
        .from('template_versions')
        .select('template_id')
        .eq('id', templateVersionId)
        .single();

      const templateId = versionData?.template_id;

      // Check if this component is new, modified, or unchanged
      const changeStatus = await this.getComponentChangeStatus(
        scope,
        code,
        'event_handler',
        currentChecksum,
        templateId
      );

      // Skip if deployed and unchanged
      if (changeStatus === 'deployed') {
        console.log(
          `Event handler ${scope}/${code} is already deployed, skipping deployment`
        );
        // Update the deployment log to mark as skipped
        await this.updateComponentStatus(
          templateVersionId,
          componentId,
          'skipped',
          { message: 'Component is already deployed' }
        );
        return {
          success: true,
          data: { skipped: true, message: 'Component is already deployed' },
        };
      }

      // Determine if this needs to be created or updated
      const isUpdate = changeStatus === 'modified';
      const endpoint = isUpdate
        ? `/api/lusid/update/event-handlers/${encodeURIComponent(scope)}/${encodeURIComponent(code)}`
        : '/api/lusid/deploy/event-handlers';

      // Make API request to deploy event handler
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scope,
          code,
          requestBody,
          baseUrl: lusidApiService.getSettings()?.baseUrl,
          accessToken: lusidApiService.getSettings()?.accessToken,
        }),
      });

      const responseData = await response.json();

      // Update the deployment log with the result
      await this.updateComponentStatus(
        templateVersionId,
        componentId,
        response.ok ? 'success' : 'failed',
        responseData
      );

      return {
        success: response.ok,
        data: responseData,
        error: !response.ok ? responseData : undefined,
      };
    } catch (error) {
      console.error('Error deploying event handler:', error);

      // Update the deployment log with the failure
      await this.updateComponentStatus(
        templateVersionId,
        componentId,
        'failed',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Deploy an entire workflow template
  async deployWorkflowTemplate(
    templateId: string,
    version: string,
    components: {
      workers: Array<{
        node: Node;
        code: any;
      }>;
      exceptionTasks: Array<{
        node: Node;
        code: any;
      }>;
      childTasks: Array<{
        node: Node;
        code: any;
      }>;
      parentTasks: Array<{
        node: Node;
        code: any;
      }>;
      eventHandlers: Array<{
        node: Node;
        code: any;
      }>;
    }
  ): Promise<{
    success: boolean;
    templateVersionId: string | null;
    error?: string;
  }> {
    // Check if template version exists
    const templateVersionStatus = await this.checkTemplateVersionStatus(
      templateId,
      version
    );

    if (!templateVersionStatus.exists || !templateVersionStatus.id) {
      return {
        success: false,
        templateVersionId: null,
        error: 'Template version not found',
      };
    }

    const templateVersionId = templateVersionStatus.id;

    // Prepare all components for deployment
    const allComponents: Array<{
      type: ComponentType;
      nodeId: string;
      name: string;
      scope: string;
      code: string;
      requestBody: any;
    }> = [];

    // Add workers
    components.workers.forEach(({ node, code }) => {
      const scope = code.id?.scope;
      const idCode = code.id?.code;

      if (scope && idCode) {
        allComponents.push({
          type: 'worker',
          nodeId: node.id,
          name: node.data.label || 'Worker',
          scope,
          code: idCode,
          requestBody: code,
        });
      }
    });

    // Add exception tasks
    components.exceptionTasks.forEach(({ node, code }) => {
      const scope = code.id?.scope;
      const idCode = code.id?.code;

      if (scope && idCode) {
        allComponents.push({
          type: 'task_definition_exception',
          nodeId: node.id,
          name: node.data.label || 'Exception Task',
          scope,
          code: idCode,
          requestBody: code,
        });
      }
    });

    // Add child tasks
    components.childTasks.forEach(({ node, code }) => {
      const scope = code.id?.scope;
      const idCode = code.id?.code;

      if (scope && idCode) {
        allComponents.push({
          type: 'task_definition_child',
          nodeId: node.id,
          name: node.data.label || 'Child Task',
          scope,
          code: idCode,
          requestBody: code,
        });
      }
    });

    // Add parent tasks
    components.parentTasks.forEach(({ node, code }) => {
      const scope = code.id?.scope;
      const idCode = code.id?.code;

      if (scope && idCode) {
        allComponents.push({
          type: 'task_definition_parent',
          nodeId: node.id,
          name: node.data.label || 'Parent Task',
          scope,
          code: idCode,
          requestBody: code,
        });
      }
    });

    // Add event handlers
    components.eventHandlers.forEach(({ node, code }) => {
      const scope = code.id?.scope;
      const idCode = code.id?.code;

      if (scope && idCode) {
        allComponents.push({
          type: 'event_handler',
          nodeId: node.id,
          name: node.data.label || 'Event Handler',
          scope,
          code: idCode,
          requestBody: code,
        });
      }
    });

    // If no valid components to deploy
    if (allComponents.length === 0) {
      return {
        success: false,
        templateVersionId,
        error: 'No valid components to deploy',
      };
    }

    // Initialize deployment logs
    const initSuccess = await this.initializeDeployment(
      templateVersionId,
      allComponents
    );

    if (!initSuccess) {
      return {
        success: false,
        templateVersionId,
        error: 'Failed to initialize deployment',
      };
    }

    // Start sequential deployment process (will be handled by UI)
    return {
      success: true,
      templateVersionId,
    };
  }
}

// Export the deployment service instance
export const lusidDeploymentService = new LusidDeploymentService();
