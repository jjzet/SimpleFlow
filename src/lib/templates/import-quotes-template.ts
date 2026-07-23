import { Node, Edge, Position } from 'reactflow';
import { Template } from '@/types/template';

// Helper function to create node positions
const createNodePosition = (index: number) => ({
  x: 100 + index * 250,
  y: 100 + Math.floor(index / 3) * 200,
});

const importQuotesTemplate: Template = {
  id: 'import-quotes-example',
  name: 'Import Quotes with Data Quality Checks',
  description:
    'A workflow for importing quotes from a file in Drive and checking for quote outliers for portfolio holdings',
  preview_image_url: null, // Will be updated with your screenshot
  is_user_template: false,
  user_id: null,
  created_at: new Date().toISOString(),
  version: '1.0.0',
  tags: ['Has Workers', 'Three Level Workflow', 'Data Processing'],
  workflow_data: {
    nodes: [
      // Task Definition Nodes
      {
        id: 'parent-task',
        type: 'taskDefinition',
        position: createNodePosition(0),
        data: {
          type: 'parent',
          scope: 'Finbourne-Examples',
          code: 'Import-Quotes-From-File',
          label: 'Import Quotes',
          displayName: 'Import quotes with data quality checks',
          description:
            'A workflow for importing quotes from a file in Drive and checking for quote outliers for portfolio holdings',
          states: [
            { name: 'Pending' },
            { name: 'ImportingQuotes' },
            { name: 'Error' },
            { name: 'InControl' },
            { name: 'Done' },
          ],
          fieldSchema: [
            { name: 'folder', type: 'String' },
            { name: 'quoteScope', type: 'String' },
            { name: 'portfolioScope', type: 'String' },
            { name: 'portfolioCode', type: 'String' },
            { name: 'iqrQuoteRangeStartDate', type: 'DateTime' },
            { name: 'iqrQuoteRangeEndDate', type: 'DateTime' },
          ],
          transitions: [
            {
              fromState: 'Pending',
              toState: 'ImportingQuotes',
              trigger: 'start',
              action: 'import-prices-worker',
            },
            {
              fromState: 'ImportingQuotes',
              toState: 'Error',
              trigger: 'failure',
            },
            {
              fromState: 'ImportingQuotes',
              toState: 'InControl',
              trigger: 'success',
              action: 'trigger-control-outliers-child-task',
            },
            {
              fromState: 'InControl',
              toState: 'Done',
              trigger: 'complete',
              guard: "childTasks all (state eq 'Complete')",
            },
          ],
          actions: [
            {
              name: 'import-prices-worker',
              actionDetails: {
                type: 'RunWorker',
                workerId: {
                  scope: 'Finbourne-Examples',
                  code: 'Csv-Import-Quotes',
                },
                workerStatusTriggers: {
                  failedToStart: 'failure',
                  failedToComplete: 'failure',
                  completedWithResults: 'success',
                  completedNoResults: 'success',
                },
                workerParameters: {
                  FolderToScan: { MapFrom: 'folder', SetTo: null },
                  ScopeForQuotes: { MapFrom: 'quoteScope', SetTo: null },
                },
              },
            },
            {
              name: 'trigger-control-outliers-child-task',
              actionDetails: {
                type: 'CreateChildTasks',
                childTaskConfigurations: [
                  {
                    taskDefinitionId: {
                      scope: 'Finbourne-Examples',
                      code: 'Control-Outlier-Quotes',
                    },
                    initialTrigger: 'start',
                    childTaskFields: {
                      portfolioScope: { mapFrom: 'portfolioScope' },
                      portfolioCode: { mapFrom: 'portfolioCode' },
                      iqrQuoteRangeStartDate: {
                        mapFrom: 'iqrQuoteRangeStartDate',
                      },
                      iqrQuoteRangeEndDate: { mapFrom: 'iqrQuoteRangeEndDate' },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        id: 'child-task',
        type: 'taskDefinition',
        position: createNodePosition(1),
        data: {
          type: 'child',
          scope: 'Finbourne-Examples',
          code: 'Control-Outlier-Quotes',
          label: 'Check Outliers',
          displayName: 'Check for quote outliers child task',
          description:
            'A workflow for checking newly-loaded quotes are within the 1.5xIQR rule',
          states: [
            { name: 'Pending' },
            { name: 'InProgress' },
            { name: 'Exceptions' },
            { name: 'Complete' },
          ],
          fieldSchema: [
            { name: 'portfolioScope', type: 'String' },
            { name: 'portfolioCode', type: 'String' },
            { name: 'iqrQuoteRangeStartDate', type: 'DateTime' },
            { name: 'iqrQuoteRangeEndDate', type: 'DateTime' },
          ],
          transitions: [
            {
              fromState: 'Pending',
              toState: 'InProgress',
              trigger: 'start',
              action: 'quote-outliers-check-worker',
            },
            {
              fromState: 'InProgress',
              toState: 'Exceptions',
              trigger: 'exceptionsFound',
            },
            {
              fromState: 'Exceptions',
              toState: 'Complete',
              trigger: 'resolved',
              action: 'trigger-import-quotes-parent-task',
              guard: "childTasks all (state eq 'Resolved')",
            },
            {
              fromState: 'InProgress',
              toState: 'Complete',
              trigger: 'noExceptions',
              action: 'trigger-import-quotes-parent-task',
            },
          ],
          actions: [
            {
              name: 'quote-outliers-check-worker',
              actionDetails: {
                type: 'RunWorker',
                workerId: {
                  scope: 'Finbourne-Examples',
                  code: 'Check-Quotes-For-Iqr-Outliers',
                },
                workerStatusTriggers: {
                  completedWithResults: 'exceptionsFound',
                  completedNoResults: 'noExceptions',
                },
                workerParameters: {
                  StartDate: { MapFrom: 'iqrQuoteRangeStartDate', SetTo: null },
                  EndDate: { MapFrom: 'iqrQuoteRangeEndDate', SetTo: null },
                  PfolioScope: { MapFrom: 'portfolioScope', SetTo: null },
                  PfolioCode: { MapFrom: 'portfolioCode', SetTo: null },
                },
                childTaskConfigurations: [
                  {
                    taskDefinitionId: {
                      scope: 'Finbourne-Examples',
                      code: 'Quote-Outliers-Exception',
                    },
                    initialTrigger: 'start',
                    childTaskFields: {
                      clientInternal: { mapFrom: 'ClientInternal' },
                      lowerLimit: { mapFrom: 'LowerLimit' },
                      upperLimit: { mapFrom: 'UpperLimit' },
                      price: { mapFrom: 'Price' },
                      priceDate: { mapFrom: 'PriceDate' },
                    },
                  },
                ],
              },
            },
            {
              name: 'trigger-import-quotes-parent-task',
              actionDetails: {
                type: 'TriggerParentTask',
                trigger: 'complete',
              },
            },
          ],
        },
      },
      {
        id: 'exception-task',
        type: 'taskDefinition',
        position: createNodePosition(2),
        data: {
          type: 'exception',
          scope: 'Finbourne-Examples',
          code: 'Quote-Outliers-Exception',
          label: 'Quote Outliers Exception',
          displayName: 'Quote outlier exception task',
          description:
            'A workflow for handling exceptions found in quote outliers check',
          states: [
            { name: 'Pending' },
            { name: 'InProgress' },
            { name: 'Resolved' },
          ],
          fieldSchema: [
            { name: 'clientInternal', type: 'String' },
            { name: 'price', type: 'Decimal' },
            { name: 'lowerLimit', type: 'Decimal' },
            { name: 'upperLimit', type: 'Decimal' },
            { name: 'priceDate', type: 'DateTime' },
          ],
          transitions: [
            {
              fromState: 'Pending',
              toState: 'InProgress',
              trigger: 'start',
            },
            {
              fromState: 'InProgress',
              toState: 'Resolved',
              trigger: 'resolve',
              action: 'trigger-control-outliers-parent-task',
            },
          ],
          actions: [
            {
              name: 'trigger-control-outliers-parent-task',
              actionDetails: {
                type: 'TriggerParentTask',
                trigger: 'resolved',
              },
            },
          ],
        },
      },

      // State Nodes - Parent Task
      {
        id: 'parent-task-state-pending',
        type: 'state',
        position: { x: 0, y: 0 }, // Will be positioned by layout engine
        data: {
          label: 'Pending',
          taskId: 'parent-task',
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Import-Quotes-From-File',
          },
        },
      },
      {
        id: 'parent-task-state-importing',
        type: 'state',
        position: { x: 0, y: 0 }, // Will be positioned by layout engine
        data: {
          label: 'ImportingQuotes',
          taskId: 'parent-task',
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Import-Quotes-From-File',
          },
        },
      },
      {
        id: 'parent-task-state-error',
        type: 'state',
        position: { x: 0, y: 0 }, // Will be positioned by layout engine
        data: {
          label: 'Error',
          taskId: 'parent-task',
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Import-Quotes-From-File',
          },
        },
      },
      {
        id: 'parent-task-state-incontrol',
        type: 'state',
        position: { x: 0, y: 0 }, // Will be positioned by layout engine
        data: {
          label: 'InControl',
          taskId: 'parent-task',
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Import-Quotes-From-File',
          },
        },
      },
      {
        id: 'parent-task-state-done',
        type: 'state',
        position: { x: 0, y: 0 }, // Will be positioned by layout engine
        data: {
          label: 'Done',
          taskId: 'parent-task',
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Import-Quotes-From-File',
          },
        },
      },

      // State Nodes - Child Task
      {
        id: 'child-task-state-pending',
        type: 'state',
        position: { x: 0, y: 0 }, // Will be positioned by layout engine
        data: {
          label: 'Pending',
          taskId: 'child-task',
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Control-Outlier-Quotes',
          },
        },
      },
      {
        id: 'child-task-state-inprogress',
        type: 'state',
        position: { x: 0, y: 0 }, // Will be positioned by layout engine
        data: {
          label: 'InProgress',
          taskId: 'child-task',
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Control-Outlier-Quotes',
          },
        },
      },
      {
        id: 'child-task-state-exceptions',
        type: 'state',
        position: { x: 0, y: 0 }, // Will be positioned by layout engine
        data: {
          label: 'Exceptions',
          taskId: 'child-task',
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Control-Outlier-Quotes',
          },
        },
      },
      {
        id: 'child-task-state-complete',
        type: 'state',
        position: { x: 0, y: 0 }, // Will be positioned by layout engine
        data: {
          label: 'Complete',
          taskId: 'child-task',
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Control-Outlier-Quotes',
          },
        },
      },

      // State Nodes - Exception Task
      {
        id: 'exception-task-state-pending',
        type: 'state',
        position: { x: 0, y: 0 }, // Will be positioned by layout engine
        data: {
          label: 'Pending',
          taskId: 'exception-task',
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Quote-Outliers-Exception',
          },
        },
      },
      {
        id: 'exception-task-state-inprogress',
        type: 'state',
        position: { x: 0, y: 0 }, // Will be positioned by layout engine
        data: {
          label: 'InProgress',
          taskId: 'exception-task',
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Quote-Outliers-Exception',
          },
        },
      },
      {
        id: 'exception-task-state-resolved',
        type: 'state',
        position: { x: 0, y: 0 }, // Will be positioned by layout engine
        data: {
          label: 'Resolved',
          taskId: 'exception-task',
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Quote-Outliers-Exception',
          },
        },
      },

      // Worker Nodes
      {
        id: 'import-worker',
        type: 'worker',
        position: { x: 0, y: 0 }, // Will be positioned by layout engine
        data: {
          scope: 'Finbourne-Examples',
          code: 'Csv-Import-Quotes',
          label: 'Import Quotes Worker',
          displayName: 'Import quotes from CSV',
          description:
            'Worker that extracts quotes from a folder of CSV files in Drive and upserts them to the Quote Store.',
          workerViewName: 'Worker.QuoteOutliers.ImportQuotesFromCsv',
          parameters: [
            {
              name: 'FolderToScan',
              type: 'String',
              displayName: 'Folder to scan',
              required: true,
            },
            {
              name: 'ScopeForQuotes',
              type: 'String',
              displayName: 'Scope for quotes',
              required: true,
            },
          ],
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Import-Quotes-From-File',
          },
          taskId: 'parent-task',
        },
      },
      {
        id: 'outlier-worker',
        type: 'worker',
        position: { x: 0, y: 0 }, // Will be positioned by layout engine
        data: {
          scope: 'Finbourne-Examples',
          code: 'Check-Quotes-For-Iqr-Outliers',
          label: 'Check Outliers Worker',
          displayName: 'Quote Outliers IQR',
          description:
            'Worker that checks quotes are within the 1.5xIQR rule and outputs outliers.',
          workerViewName: 'Worker.QuoteOutliers.IqrCheck',
          parameters: [
            {
              name: 'StartDate',
              type: 'DateTime',
              displayName: 'Start date',
              required: true,
            },
            {
              name: 'EndDate',
              type: 'DateTime',
              displayName: 'End date',
              required: true,
            },
            {
              name: 'PfolioScope',
              type: 'String',
              displayName: 'Portfolio scope',
              required: true,
            },
            {
              name: 'PfolioCode',
              type: 'String',
              displayName: 'Portfolio code',
              required: true,
            },
          ],
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Control-Outlier-Quotes',
          },
          taskId: 'child-task',
        },
      },
    ],
    edges: [
      // State transitions - Parent Task
      {
        id: 'edge-parent-pending-importing',
        source: 'parent-task-state-pending',
        target: 'parent-task-state-importing',
        type: 'stateTransition',
        data: {
          fromState: 'Pending',
          toState: 'ImportingQuotes',
          trigger: 'start',
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Import-Quotes-From-File',
          },
        },
      },
      {
        id: 'edge-parent-importing-error',
        source: 'parent-task-state-importing',
        target: 'parent-task-state-error',
        type: 'stateTransition',
        data: {
          fromState: 'ImportingQuotes',
          toState: 'Error',
          trigger: 'failure',
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Import-Quotes-From-File',
          },
        },
      },
      {
        id: 'edge-parent-importing-control',
        source: 'parent-task-state-importing',
        target: 'parent-task-state-incontrol',
        type: 'stateTransition',
        data: {
          fromState: 'ImportingQuotes',
          toState: 'InControl',
          trigger: 'success',
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Import-Quotes-From-File',
          },
        },
      },
      {
        id: 'edge-parent-control-done',
        source: 'parent-task-state-incontrol',
        target: 'parent-task-state-done',
        type: 'stateTransition',
        data: {
          fromState: 'InControl',
          toState: 'Done',
          trigger: 'complete',
          guard: "childTasks all (state eq 'Complete')",
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Import-Quotes-From-File',
          },
        },
      },

      // State transitions - Child Task
      {
        id: 'edge-child-pending-inprogress',
        source: 'child-task-state-pending',
        target: 'child-task-state-inprogress',
        type: 'stateTransition',
        data: {
          fromState: 'Pending',
          toState: 'InProgress',
          trigger: 'start',
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Control-Outlier-Quotes',
          },
        },
      },
      {
        id: 'edge-child-inprogress-exceptions',
        source: 'child-task-state-inprogress',
        target: 'child-task-state-exceptions',
        type: 'stateTransition',
        data: {
          fromState: 'InProgress',
          toState: 'Exceptions',
          trigger: 'exceptionsFound',
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Control-Outlier-Quotes',
          },
        },
      },
      {
        id: 'edge-child-exceptions-complete',
        source: 'child-task-state-exceptions',
        target: 'child-task-state-complete',
        type: 'stateTransition',
        data: {
          fromState: 'Exceptions',
          toState: 'Complete',
          trigger: 'resolved',
          guard: "childTasks all (state eq 'Resolved')",
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Control-Outlier-Quotes',
          },
        },
      },
      {
        id: 'edge-child-inprogress-complete',
        source: 'child-task-state-inprogress',
        target: 'child-task-state-complete',
        type: 'stateTransition',
        data: {
          fromState: 'InProgress',
          toState: 'Complete',
          trigger: 'noExceptions',
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Control-Outlier-Quotes',
          },
        },
      },

      // State transitions - Exception Task
      {
        id: 'edge-exception-pending-inprogress',
        source: 'exception-task-state-pending',
        target: 'exception-task-state-inprogress',
        type: 'stateTransition',
        data: {
          fromState: 'Pending',
          toState: 'InProgress',
          trigger: 'start',
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Quote-Outliers-Exception',
          },
        },
      },
      {
        id: 'edge-exception-inprogress-resolved',
        source: 'exception-task-state-inprogress',
        target: 'exception-task-state-resolved',
        type: 'stateTransition',
        data: {
          fromState: 'InProgress',
          toState: 'Resolved',
          trigger: 'resolve',
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Quote-Outliers-Exception',
          },
        },
      },

      // Action edges
      {
        id: 'edge-import-worker-action',
        source: 'import-worker',
        target: 'parent-task-state-pending',
        type: 'action',
        data: {
          name: 'import-prices-worker',
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Import-Quotes-From-File',
          },
          workerId: {
            scope: 'Finbourne-Examples',
            code: 'Csv-Import-Quotes',
          },
        },
      },
      {
        id: 'edge-outlier-worker-action',
        source: 'outlier-worker',
        target: 'child-task-state-pending',
        type: 'action',
        data: {
          name: 'quote-outliers-check-worker',
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Control-Outlier-Quotes',
          },
          workerId: {
            scope: 'Finbourne-Examples',
            code: 'Check-Quotes-For-Iqr-Outliers',
          },
        },
      },

      // Child task links
      {
        id: 'edge-child-task-link',
        source: 'child-task',
        target: 'parent-task',
        type: 'linkChildTask',
        data: {
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Import-Quotes-From-File',
          },
        },
      },
      {
        id: 'edge-exception-task-link',
        source: 'exception-task',
        target: 'child-task',
        type: 'linkChildTask',
        data: {
          ownerTaskDefinition: {
            scope: 'Finbourne-Examples',
            code: 'Control-Outlier-Quotes',
          },
        },
      },
    ],
  },
};

export { importQuotesTemplate };
