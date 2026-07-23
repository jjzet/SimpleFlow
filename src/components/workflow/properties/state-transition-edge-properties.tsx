'use client';

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, X, ChevronDown, Zap, Shield } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { GuardComposer } from './guard-composer';
import { OwnerTaskBadge } from '@/components/ui/owner-task-badge';

export interface StateTransitionEdgeData {
  sourceState: string;
  targetState: string;
  trigger?: string;
  guard?: string;
  ownerTaskDefinition?: {
    scope: string;
    code: string;
  };
}

interface StateTransitionEdgePropertiesProps {
  data: StateTransitionEdgeData;
  onChange: (data: StateTransitionEdgeData) => void;
}

export function StateTransitionEdgeProperties({
  data,
  onChange,
}: StateTransitionEdgePropertiesProps) {
  const [isTriggerExpanded, setIsTriggerExpanded] = useState(true);
  const [isGuardExpanded, setIsGuardExpanded] = useState(false);

  const handleTriggerChange = (value: string) => {
    onChange({
      ...data,
      trigger: value,
    });
  };

  const handleGuardChange = (value: string) => {
    // Ensure childTasks guards have a quantifier
    if (
      value.startsWith('childTasks') &&
      !value.match(/childTasks\s+(all|any|none)/)
    ) {
      value = value.replace('childTasks', 'childTasks all');
    }

    onChange({
      ...data,
      guard: value,
    });
  };

  const handleRemoveGuard = () => {
    onChange({
      ...data,
      guard: undefined,
    });
  };

  return (
    <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
      {/* Display the owning task definition badge at the top */}
      <OwnerTaskBadge owner={data.ownerTaskDefinition} />

      {/* States Section */}
      <Card className="space-y-4 p-4">
        <div className="space-y-2">
          <Label>Source State</Label>
          <Input value={data.sourceState} disabled className="bg-gray-50" />
        </div>
        <div className="space-y-2">
          <Label>Target State</Label>
          <Input value={data.targetState} disabled className="bg-gray-50" />
        </div>
      </Card>

      {/* Trigger Section */}
      <div className="rounded-lg border">
        <Collapsible
          open={isTriggerExpanded}
          onOpenChange={setIsTriggerExpanded}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-t-lg px-4 py-2 font-medium hover:bg-gray-50">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-green-500" />
              <span>Trigger</span>
            </div>
            <ChevronDown
              className={`h-5 w-5 transition-transform duration-200 ${isTriggerExpanded ? 'rotate-180 transform' : ''}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 p-4">
            <div className="space-y-2">
              <Input
                value={data.trigger || ''}
                onChange={(e) => handleTriggerChange(e.target.value)}
                placeholder="Enter trigger name"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Guard Section */}
      {!data.guard && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            onChange({
              ...data,
              guard: "fields[''] exists",
            });
            setIsGuardExpanded(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Guard
        </Button>
      )}

      {data.guard !== undefined && (
        <div className="rounded-lg border">
          <Collapsible open={isGuardExpanded} onOpenChange={setIsGuardExpanded}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-t-lg px-4 py-2 font-medium hover:bg-gray-50">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-red-500" />
                <span>Guard</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveGuard();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
                <ChevronDown
                  className={`h-5 w-5 transition-transform duration-200 ${isGuardExpanded ? 'rotate-180 transform' : ''}`}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4">
              <GuardComposer
                value={data.guard || "fields[''] exists"}
                onChange={handleGuardChange}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
