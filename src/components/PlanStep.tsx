import React from 'react';

interface Step {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  dependencies?: string[];
  estimatedTime?: string;
}

interface PlanStepProps {
  step: Step;
  onExecute?: (stepId: string) => void;
}

export default function PlanStep({ step, onExecute }: PlanStepProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'in-progress':
        return '⟳';
      case 'failed':
        return '✗';
      case 'pending':
      default:
        return '○';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor(step.status)}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <span className="text-lg font-bold">
              {getStatusIcon(step.status)}
            </span>
          </div>
          <div className="flex-grow">
            <h4 className="text-lg font-medium mb-2">{step.title}</h4>
            <p className="text-sm mb-3">{step.description}</p>
            
            {step.estimatedTime && (
              <p className="text-xs opacity-75 mb-2">
                Estimated time: {step.estimatedTime}
              </p>
            )}
            
            {step.dependencies && step.dependencies.length > 0 && (
              <div className="text-xs">
                <span className="font-medium">Dependencies: </span>
                <span>{step.dependencies.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
        
        {step.status === 'pending' && onExecute && (
          <button
            onClick={() => onExecute(step.id)}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            Execute
          </button>
        )}
      </div>
    </div>
  );
}
