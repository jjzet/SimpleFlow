'use client';

import React, { ReactNode } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface DeploymentStatusProps {
  color: string;
  label: string;
  icon: ReactNode;
}

export const DeploymentStatus: React.FC<DeploymentStatusProps> = ({
  color,
  label,
  icon,
}) => {
  return (
    <div className={`flex items-center ${color} mb-2 text-sm font-medium`}>
      {icon}
      <span>LUSID API Status: {label}</span>
    </div>
  );
};
