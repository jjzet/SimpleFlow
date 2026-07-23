import React from 'react';
import { Button } from '@/components/ui/button';
import { Code, Blocks } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ViewToggleProps {
  isCodeView: boolean;
  onToggle: () => void;
}

export function ViewToggle({ isCodeView, onToggle }: ViewToggleProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'fixed right-4 top-4 z-50 h-9 px-3 shadow-md',
              isCodeView
                ? 'border-[#404040] bg-[#2D2D2D] text-gray-300 hover:bg-[#3D3D3D]'
                : 'bg-background hover:bg-accent'
            )}
            onClick={onToggle}
          >
            {isCodeView ? (
              <Blocks className="h-4 w-4" />
            ) : (
              <Code className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Switch to {isCodeView ? 'Visual Editor' : 'Code Editor'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
