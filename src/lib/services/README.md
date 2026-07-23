# LusidDeploymentService

This service manages the deployment of workflow components to LUSID.

## Features

- Deploy workflow components (workers, task definitions, event handlers)
- Track deployment status and history
- Generate code checksums for change tracking
- Update deployment summaries after completion

## Usage Examples

### Updating the Deployment Summary

Use the `updateDeploymentSummaryAfterCompletion` function to update the deployment status and summary for a template version after all components have been deployed:

```typescript
import { lusidDeploymentService } from '@/lib/services/lusid-deployment-service';

// After deployment process is complete
const templateVersionId = 'your-template-version-id';
const updated =
  await lusidDeploymentService.updateDeploymentSummaryAfterCompletion(
    templateVersionId
  );

if (updated) {
  console.log('Successfully updated deployment summary');
} else {
  console.error('Failed to update deployment summary');
}
```

This function:

1. Fetches all deployment logs for the specified template version
2. Counts the status of each component (success, failed, pending, skipped)
3. Determines the overall deployment status based on these counts
4. Updates the template version record with the status and detailed summary
5. Returns the deployment summary for verification

The deployment status will be set to one of:

- `deployed` - All components deployed successfully or skipped
- `partially_deployed` - Some components deployed successfully, some failed
- `deployment_failed` - All components failed
- `not_deployed` - Components still pending or not yet started

### Integration with Deployment Process

This function is automatically called at the end of the deployment process in the `useDeployment` hook:

```typescript
// When all components are finished deploying
lusidDeploymentService
  .updateDeploymentSummaryAfterCompletion(templateVersionId)
  .then((updated) => {
    if (updated) {
      console.log('Successfully updated deployment summary');
    } else {
      console.error('Failed to update deployment summary');
    }
  });
```
