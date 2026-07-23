'use client';

import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import Editor from '@monaco-editor/react';
import { useWorkflow } from '@/contexts/workflow-context';
import { Button } from '@/components/ui/button';
import { Copy, Check, FileJson, RefreshCw, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { TaskDefinitionCode } from '@/lib/code-generation/types';
import { WorkerCode } from '@/lib/code-generation/worker-code-generator';
import { useToast } from '@/components/ui/use-toast';

interface CodeEditorViewProps {
  isVisible: boolean;
}

export default function CodeEditorView({ isVisible }: CodeEditorViewProps) {
  const {
    selectedNode,
    generateTaskDefinitionCode,
    generateWorkerCode,
    generateEventHandlerCode,
    invalidateTaskDefinitionCodeCache,
    invalidateWorkerCodeCache,
    invalidateEventHandlerCodeCache,
    nodes,
  } = useWorkflow();
  const { open: isSidebarOpen } = useSidebar();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  useEffect(() => {
    if (!selectedNode) {
      setCode('');
      return;
    }

    try {
      let generatedCode: any = null;

      if (selectedNode.type === 'taskDefinition') {
        generatedCode = generateTaskDefinitionCode(selectedNode.id);
      } else if (selectedNode.type === 'worker') {
        generatedCode = generateWorkerCode(selectedNode.id);
      } else if (selectedNode.type === 'eventHandler') {
        generatedCode = generateEventHandlerCode(selectedNode.id);
      }

      if (generatedCode) {
        setCode(JSON.stringify(generatedCode, null, 2));
      } else {
        setCode('');
      }
    } catch (error) {
      console.error('Error generating code:', error);
      setCode('Error generating code');
    }
  }, [
    selectedNode,
    generateTaskDefinitionCode,
    generateWorkerCode,
    generateEventHandlerCode,
  ]);

  const handleCopy = useCallback(() => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  const handleRefresh = useCallback(async () => {
    if (!selectedNode) return;

    setIsRefreshing(true);
    setRefreshSuccess(false);
    try {
      // Invalidate specific caches for the selected node
      if (selectedNode.type === 'taskDefinition') {
        invalidateTaskDefinitionCodeCache(selectedNode.id);
      } else if (selectedNode.type === 'worker') {
        invalidateWorkerCodeCache(selectedNode.id);
      } else if (selectedNode.type === 'eventHandler') {
        invalidateEventHandlerCodeCache(selectedNode.id);
      }

      // Short delay to ensure cache is cleared before regenerating
      setTimeout(() => {
        try {
          let generatedCode;
          if (selectedNode.type === 'taskDefinition') {
            generatedCode = generateTaskDefinitionCode(selectedNode.id);
          } else if (selectedNode.type === 'worker') {
            generatedCode = generateWorkerCode(selectedNode.id);
          } else if (selectedNode.type === 'eventHandler') {
            generatedCode = generateEventHandlerCode(selectedNode.id);
          }

          if (generatedCode) {
            setCode(JSON.stringify(generatedCode, null, 2));
            // Show success toast notification
            toast({
              title: 'Success',
              description: 'The code has been successfully refreshed',
              className: 'bg-green-50 border-green-200 text-green-800',
            });
            setRefreshSuccess(true);
            // Hide success indicator after 2 seconds
            setTimeout(() => {
              setRefreshSuccess(false);
            }, 2000);
          }
        } catch (error) {
          console.error(
            'Error regenerating code after cache invalidation:',
            error
          );
          toast({
            title: 'Error',
            description: 'Failed to refresh code. Please try again.',
            variant: 'destructive',
            className: 'bg-red-50 border-red-200 text-red-800',
          });
          setTimeout(() => setIsRefreshing(false), 300);
        } finally {
          setIsRefreshing(false);
        }
      }, 100); // Small delay to ensure cache is cleared before regenerating
    } catch (error) {
      console.error('Error refreshing code:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh code. Please try again.',
        variant: 'destructive',
        className: 'bg-red-50 border-red-200 text-red-800',
      });
      setIsRefreshing(false);
    }
  }, [
    selectedNode,
    invalidateTaskDefinitionCodeCache,
    invalidateWorkerCodeCache,
    invalidateEventHandlerCodeCache,
    generateTaskDefinitionCode,
    generateWorkerCode,
    generateEventHandlerCode,
    toast,
  ]);

  // Return null if not visible
  if (!isVisible) {
    return null;
  }

  // Base container with transition
  const containerClasses = cn(
    'absolute inset-y-0 right-0 bg-[#1E1E1E] transition-transform duration-300',
    isSidebarOpen ? 'left-[16rem]' : 'left-0',
    isVisible ? 'translate-x-0' : 'translate-x-full'
  );

  // If no valid node is selected, show a message
  if (
    !selectedNode ||
    (selectedNode.type !== 'taskDefinition' &&
      selectedNode.type !== 'worker' &&
      selectedNode.type !== 'eventHandler')
  ) {
    return (
      <div className={containerClasses}>
        <div className="flex h-full items-center justify-center text-gray-400">
          Please select a task definition, worker, or event handler node to view
          its generated code.
        </div>
      </div>
    );
  }

  const fileName =
    selectedNode.type === 'taskDefinition'
      ? `${selectedNode.data.type}Task_${selectedNode.data.label}.json`
      : selectedNode.type === 'worker'
        ? `worker_${selectedNode.data.label}.json`
        : `eventHandler_${selectedNode.data.label}.json`;

  return (
    <div className={containerClasses}>
      {loading && (
        <div className="loading-indicator absolute right-4 top-4 z-10 rounded bg-[#2D2D2D] px-3 py-1.5 text-gray-300 shadow">
          Generating code...
        </div>
      )}
      <div className="flex h-16 items-center border-b border-[#333333] px-4">
        <div className="flex items-center space-x-3 text-gray-400">
          <FileJson className="h-4 w-4" />
          <span className="font-mono text-sm">{fileName}</span>
          <Separator orientation="vertical" className="h-4 bg-gray-600" />
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={handleRefresh}
            disabled={!selectedNode || isRefreshing}
          >
            <RefreshCw
              className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
            />
            <span className={cn(refreshSuccess ? 'not-sr-only' : '')}>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={handleCopy}
            disabled={!code}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="h-[calc(100%-4rem)] pt-4">
        <Editor
          height="100%"
          defaultLanguage="json"
          value={code}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            padding: { top: 8 },
          }}
        />
      </div>
    </div>
  );
}
