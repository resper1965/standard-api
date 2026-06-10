import { useMcpPlayground } from '@/stores/mcpPlayground.store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Cpu, Lock } from 'lucide-react';

/* ── MCP Tool catalogue (spec matches API ASYNC_TOOLS set) ────────── */
export const MCP_TOOLS = [
  {
    name: 'validar_evidencia_privacidade',
    label: 'Validar Evidência de Privacidade',
    description: 'Analisa uma evidência de documento e valida o seu alinhamento com controlos de privacidade SCF.',
    category: 'Privacy',
    async: true,
    inputs: [
      { id: 'evidence_chunk', label: 'Chunk de evidência', type: 'textarea', placeholder: 'Cole o texto extraído do documento...' },
      { id: 'scf_domain', label: 'Domínio SCF', type: 'text', placeholder: 'ex: PRI' },
      { id: 'assessment_id', label: 'Assessment ID', type: 'text', placeholder: 'uuid' },
    ],
  },
  {
    name: 'calcular_score_risco_terceiro',
    label: 'Calcular Score de Risco de Terceiro',
    description: 'Calcula o score de risco de um vendor com base nas evidências e nos controlos SCF do TPRA.',
    category: 'TPRA',
    async: true,
    inputs: [
      { id: 'vendor_id', label: 'Vendor ID', type: 'text', placeholder: 'uuid' },
      { id: 'assessment_id', label: 'Assessment ID', type: 'text', placeholder: 'uuid' },
      { id: 'risk_domain', label: 'Domínio de Risco', type: 'text', placeholder: 'ex: DataProtection' },
    ],
  },
  {
    name: 'analisar_gap_controlo',
    label: 'Analisar Gap de Controlo SCF',
    description: 'Analisa o gap de um controlo SCF específico contra as evidências da KB. Output requer schema validation antes de persistência.',
    category: 'Gap Analysis',
    async: true,
    inputs: [
      { id: 'scf_control_id', label: 'SCF Control ID', type: 'text', placeholder: 'ex: CRY-01.1' },
      { id: 'assessment_id', label: 'Assessment ID', type: 'text', placeholder: 'uuid' },
      { id: 'framework_id', label: 'Framework ID', type: 'text', placeholder: 'ex: NIST-CSF-2.0' },
    ],
  },
] as const;

export type McpToolDef = typeof MCP_TOOLS[number];

interface Props {
  onSelect?: (tool: McpToolDef) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Privacy: 'border-violet-500/30 bg-violet-500/5 text-violet-400',
  TPRA: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
  'Gap Analysis': 'border-[#8fa89b]/30 bg-[#8fa89b]/5 text-[#8fa89b]',
};

export function ToolExplorer({ onSelect }: Props) {
  const { selectedTool, selectTool } = useMcpPlayground();

  const handleSelect = (tool: McpToolDef) => {
    selectTool(tool.name);
    onSelect?.(tool);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Tools disponíveis
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-3 pb-4 space-y-2">
          {MCP_TOOLS.map((tool) => {
            const isActive = selectedTool === tool.name;
            return (
              <button
                key={tool.name}
                id={`tool-${tool.name}`}
                onClick={() => handleSelect(tool)}
                className={`w-full text-left p-3 rounded-lg border transition-all group ${
                  isActive
                    ? 'border-[#8fa89b]/50 bg-[#8fa89b]/10'
                    : 'border-border/50 hover:border-border hover:bg-muted/20'
                }`}
                aria-selected={isActive}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 p-1.5 rounded-md ${isActive ? 'bg-[#8fa89b]/20' : 'bg-muted/40 group-hover:bg-muted/60'}`}>
                    <Cpu className={`h-3 w-3 ${isActive ? 'text-[#8fa89b]' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`text-xs font-medium truncate ${isActive ? 'text-[#8fa89b]' : 'text-foreground'}`}>
                        {tool.label}
                      </p>
                      {tool.async && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-border/50 text-muted-foreground">
                          async
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                      {tool.description}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[tool.category] ?? 'border-border text-muted-foreground'}`}>
                        {tool.category}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>

      {/* ASYNC notice */}
      <div className="px-3 pb-4">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
          <Lock className="h-3 w-3" />
          <span>Todas as tools são async (ADR-003) — POST retorna 202</span>
        </div>
      </div>
    </div>
  );
}
