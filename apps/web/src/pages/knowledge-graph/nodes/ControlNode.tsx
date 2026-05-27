import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Shield } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// eslint-disable-next-line react-refresh/only-export-components
export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

 
export type CustomNodeData = {
  label: string;
  description?: string;
};

const ControlNode = ({ data, selected }: NodeProps) => {
  const nodeData = data as CustomNodeData;
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center p-4 min-w-[200px]",
        "bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl",
        "transition-all duration-300 ease-in-out",
        selected ? "ring-2 ring-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]" : "hover:border-blue-500/50"
      )}
    >
      <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition animate-pulse"></div>
      
      <div className="relative z-10 flex items-center justify-center w-12 h-12 mb-3 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
        <Shield className="w-6 h-6" />
      </div>
      
      <h3 className="relative z-10 text-lg font-bold text-slate-100 tracking-tight text-center">
        {nodeData.label}
      </h3>
      {nodeData.description && (
        <p className="relative z-10 mt-1 text-xs text-slate-400 text-center max-w-[160px] truncate">
          {nodeData.description}
        </p>
      )}

      {/* Handles */}
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-blue-500 !border-0" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-blue-500 !border-0" />
      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-blue-500 !border-0" />
      <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-blue-500 !border-0" />
    </div>
  );
};

export default memo(ControlNode);
