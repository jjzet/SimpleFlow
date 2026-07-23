'use client';

import React from 'react';
import { useWorkflow } from '@/contexts/workflow-context';
import { Node } from 'reactflow';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface EventHandlerCodeViewProps {
  node: Node;
}

export function EventHandlerCodeView({ node }: EventHandlerCodeViewProps) {
  const { generateEventHandlerCode } = useWorkflow();
  const { toast } = useToast();

  // Generate the code
  const code = React.useMemo(() => {
    try {
      return generateEventHandlerCode(node.id);
    } catch (error) {
      console.error('Error generating event handler code:', error);
      return null;
    }
  }, [node.id, generateEventHandlerCode]);

  // Format the code as JSON
  const formattedCode = React.useMemo(() => {
    if (!code) return '';
    return JSON.stringify(code, null, 2);
  }, [code]);

  // Copy the code to the clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(formattedCode);
    toast({
      title: 'Copied to clipboard',
      description: 'The event handler code has been copied to your clipboard.',
      duration: 3000,
    });
  };

  if (!code) {
    return (
      <div className="p-4 text-red-500">
        Error generating event handler code. Please check the console for
        details.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute right-2 top-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="flex items-center gap-1"
        >
          <Copy className="h-4 w-4" />
          Copy
        </Button>
      </div>
      <pre className="max-h-[60vh] overflow-auto rounded-md bg-gray-50 p-4 text-sm">
        <code>{formattedCode}</code>
      </pre>
    </div>
  );
}
