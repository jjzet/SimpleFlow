import React from 'react';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

export interface TaskDefinitionRef {
  scope: string;
  code: string;
}

interface OwnerTaskBadgeProps {
  owner?: TaskDefinitionRef;
}

export function OwnerTaskBadge({ owner }: OwnerTaskBadgeProps) {
  if (!owner) {
    return (
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">No Owner</Badge>
      </div>
    );
  }

  return (
    <div className="mb-2 flex items-center gap-2 text-xs">
      <Badge variant="secondary" className="inline-flex items-center gap-1.5">
        <span className="text-muted-foreground">Owner:</span>
        <span className="font-medium">{owner.scope}</span>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{owner.code}</span>
      </Badge>
    </div>
  );
}
