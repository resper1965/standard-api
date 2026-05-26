import React, { useState, useMemo, useCallback } from 'react';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '../../lib/api';
import { generateRadialLayout } from './layout';
import type { MapData } from './layout';
import ControlNode from './nodes/ControlNode';
import RegulationNode from './nodes/RegulationNode';
import RiskNode from './nodes/RiskNode';
import { Search, Loader2 } from 'lucide-react';
import { usePageHeader } from '../../components/layouts/PageHeaderContext';

export const KnowledgeGraphPage: React.FC = () => {
  const { setHeader, clear } = usePageHeader();
  const [controlId, setControlId] = useState('GOV-01');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const nodeTypes = useMemo(() => ({
    controlNode: ControlNode,
    regulationNode: RegulationNode,
    riskNode: RiskNode
  }), []);

  const handleSearch = useCallback(async (e?: React.FormEvent, searchId?: string) => {
    if (e) e.preventDefault();
    const targetId = searchId || controlId;
    if (!targetId.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await api<{ data: MapData }>('/api/v1/intelligence/blast-radius', {
        method: 'POST',
        body: JSON.stringify({ control_id: targetId })
      });

      const { nodes: newNodes, edges: newEdges } = generateRadialLayout(response.data);
      setNodes(newNodes);
      setEdges(newEdges);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to map blast radius.';
      setError(msg);
      setNodes([]);
      setEdges([]);
    } finally {
      setIsLoading(false);
    }
  }, [controlId, setNodes, setEdges]);

  // Sync page header actions
  React.useEffect(() => {
    setHeader({
      description: "Mapping Blast-Radius Architecture Intel for Enterprise GRC.",
      actions: (
        <form onSubmit={(e) => handleSearch(e)} className="flex items-center bg-slate-800/50 border border-slate-700/60 rounded-lg p-0.5 shadow-inner hover:border-slate-600 focus-within:ring-2 focus-within:border-blue-500 ring-blue-500/20 transition-all">
          <Search className="w-4 h-4 text-slate-400 ml-2.5 shrink-0" />
          <input
            value={controlId}
            onChange={(e) => setControlId(e.target.value.toUpperCase())}
            placeholder="Search Control (e.g. GOV-01)"
            className="bg-transparent border-none outline-none text-white px-2.5 py-1.5 w-48 text-sm uppercase placeholder:normal-case placeholder:text-slate-500 focus:ring-0"
          />
          <button 
            type="submit" 
            disabled={isLoading}
            className="flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition disabled:opacity-50 min-w-[80px]"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'ANALYZE'}
          </button>
        </form>
      )
    });
    return () => clear();
  }, [controlId, isLoading, setHeader, clear]);

  // Load initially
  React.useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(undefined, 'GOV-01');
    }, 0);
    return () => clearTimeout(timer);
  }, [handleSearch]);

  return (
    <div className="flex flex-col h-full w-full min-h-[70vh] bg-slate-950/40 rounded-2xl border border-slate-800/60 overflow-hidden shadow-2xl relative">
      {/* Main Map Container */}
      <div className="flex-1 w-full relative">
        {error && (
          <div className="absolute top-32 left-1/2 -translate-x-1/2 z-30 bg-rose-500/20 text-rose-300 px-6 py-3 rounded-lg border border-rose-500/30 backdrop-blur-md shadow-xl">
            {error}
          </div>
        )}
        
        {nodes.length === 0 && !isLoading && !error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-slate-500">
            <Search className="w-12 h-12 mb-4 opacity-50" />
            <p>Enter a control ID to map its associated risks and regulations.</p>
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          colorMode="dark"
          fitView
          minZoom={0.2}
        >
          <Background gap={16} size={2} color="rgba(255,255,255,0.05)" />
          <Controls 
            className="bg-slate-800/80 border border-slate-700 backdrop-blur-md !fill-slate-300"
          />
          <MiniMap 
            nodeColor={(n) => {
              if (n.type === 'controlNode') return '#3b82f6';
              if (n.type === 'regulationNode') return '#6366f1';
              if (n.type === 'riskNode') return '#f43f5e';
              return '#475569';
            }}
            maskColor="rgba(15, 23, 42, 0.7)"
            className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden"
          />
        </ReactFlow>
      </div>
    </div>
  );
};
