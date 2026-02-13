import React from 'react';
import { CheckCircle, Circle, Clock, Minus, XCircle } from 'lucide-react';
import { StatusIconProps } from './types';

export function StatusIcon({ status = 'passed', className, size }: StatusIconProps) {
  switch (status) {
    case 'passed':
      return <CheckCircle className={className} size={size} />;
    case 'failed':
      return <XCircle className={className} size={size} />;
    case 'running':
      return <Clock className={className} size={size} />;
    case 'skipped':
      return <Minus className={className} size={size} />;
    default:
      return <Circle className={className} size={size} />;
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'passed':
      return 'text-green-500 bg-green-100';
    case 'failed':
      return 'text-red-500 bg-red-100';
    case 'running':
      return 'text-blue-500 bg-blue-100';
    case 'skipped':
      return 'text-yellow-500 bg-yellow-100';
    default:
      return 'text-gray-500 bg-gray-100';
  }
}
