'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { StateNodeData } from '@/types/workflow';
import { OwnerTaskBadge } from '@/components/ui/owner-task-badge';

interface StateNodePropertiesProps {
  data: StateNodeData;
  onChange: (data: Partial<StateNodeData>) => void;
}

export function StateNodeProperties({
  data,
  onChange,
}: StateNodePropertiesProps) {
  return (
    <div className="space-y-6">
      {/* Display the owning task definition badge at the top */}
      <OwnerTaskBadge owner={data.ownerTaskDefinition} />

      {/* State Name */}
      <div className="space-y-2">
        <Label htmlFor="name">State Name</Label>
        <Input
          id="name"
          value={data.name || ''}
          onChange={(e) => {
            // Update both name and label to keep them in sync
            const newData = {
              name: e.target.value,
              label: e.target.value, // Update label to match name
            };
            onChange(newData);
          }}
          placeholder="Enter state name"
        />
      </div>

      {/* Initial State Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="isInitial" className="text-sm font-medium">
          Initial State
        </Label>
        <Switch
          id="isInitial"
          checked={data.isInitial || false}
          onCheckedChange={(checked) => {
            onChange({ isInitial: checked });
          }}
        />
      </div>
    </div>
  );
}
