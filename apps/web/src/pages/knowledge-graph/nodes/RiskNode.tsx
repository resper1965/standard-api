import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { AlertTriangle } from 'lucide-react';
import { cn } from './ControlNode';
import type { CustomNodeData } from './ControlNode';

const RiskNode = ({ data, selected }: NodeProps) => {
  const nodeData = data as CustomNodeData;
  return (
    <div
      className={cn(
        "relative flex items-center p-3 min-w-[180px]",
        "bg-slate-900/40 backdrop-blur-md border border-rose-700/50 rounded-xl shadow-lg",
        "transition-all duration-300",
        selected ? "ring-1 ring-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]" : "hover:border-rose-500/50"
      )}
    >
      <div className="flex items-center justify-center w-8 h-8 mr-3 bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/30">
        <AlertTriangle className="w-4 h-4" />
      </div>
      
      <div className="flex flex-col">
        <h3 className="text-sm font-semibold text-slate-200 tracking-tight">
          {nodeData.label}
        </h3>
        {nodeData.description && (
          <p className="text-[10px] text-slate-400 max-w-[120px] truncate">
            {nodeData.description}
          </p>
        )}
      </div>

      <Handle type="target" position={Position.Left} className="w-1.5 h-1.5 !bg-rose-400 !border-0" />
      <Handle type="target" position={Position.Right} className="w-1.5 h-1.5 !bg-rose-400 !border-0" />
      <Handle type="target" position={Position.Top} className="w-1.5 h-1.5 !bg-rose-400 !border-0" />
      <Handle type="target" position={Position.Bottom} className="w-1.5 h-1.5 !bg-rose-400 !border-0" />
    </div>
  );
};

export default memo(RiskNode);
