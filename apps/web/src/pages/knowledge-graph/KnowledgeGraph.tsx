import React, { useState, useMemo } from 'react';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '../../lib/api';
import { generateRadialLayout } from './layout';
import type { MapData } from './layout';
import ControlNode from './nodes/ControlNode';
import RegulationNode from './nodes/RegulationNode';
import RiskNode from './nodes/RiskNode';
import { Search, Loader2 } from 'lucide-react';

export const KnowledgeGraphPage: React.FC = () => {
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

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!controlId.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await api<{ data: MapData }>('/api/v1/intelligence/blast-radius', {
        method: 'POST',
        body: JSON.stringify({ control_id: controlId })
      });

      const { nodes: newNodes, edges: newEdges } = generateRadialLayout(response.data);
      setNodes(newNodes);
      setEdges(newEdges);
    } catch (err: any) {
      setError(err.message || 'Failed to map blast radius.');
      setNodes([]);
      setEdges([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load initially or let user search? Let's just load the default GOV-01
  React.useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-[#0B1120]">
      {/* Header & Controls */}
      <div className="absolute top-0 left-0 right-0 z-20 flex flex-col md:flex-row items-center justify-between p-6 bg-slate-900/50 backdrop-blur-md border-b border-white/5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Controls-as-Truth</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Mapping Blast-Radius Architecture Intel for Enterprise GRC.
          </p>
        </div>

        <form onSubmit={handleSearch} className="mt-4 md:mt-0 flex items-center bg-slate-800/50 border border-slate-700 rounded-xl p-1 shadow-inner focus-within:ring-2 ring-blue-500/50 transition-all">
          <Search className="w-5 h-5 text-slate-400 ml-3" />
          <input
            value={controlId}
            onChange={(e) => setControlId(e.target.value.toUpperCase())}
            placeholder="Search SCF Control (e.g. GOV-01)"
            className="bg-transparent border-none outline-none text-white px-3 py-2 w-64 uppercase placeholder:normal-case placeholder:text-slate-500"
          />
          <button 
            type="submit" 
            disabled={isLoading}
            className="flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 min-w-[100px]"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analyze'}
          </button>
        </form>
      </div>

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
