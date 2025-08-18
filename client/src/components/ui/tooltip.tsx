import React from 'react';

export interface TooltipProviderProps {
  children: React.ReactNode;
}

export const TooltipProvider: React.FC<TooltipProviderProps> = ({ children }) => {
  return <>{children}</>;
};

export interface TooltipProps {
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ children }) => {
  return <>{children}</>;
};

export interface TooltipTriggerProps {
  children: React.ReactNode;
}

export const TooltipTrigger: React.FC<TooltipTriggerProps> = ({ children }) => {
  return <>{children}</>;
};

export interface TooltipContentProps {
  children: React.ReactNode;
  className?: string;
}

export const TooltipContent: React.FC<TooltipContentProps> = ({ children, className = "" }) => {
  return (
    <div className={`bg-gray-900 text-white px-2 py-1 rounded text-sm ${className}`}>
      {children}
    </div>
  );
};