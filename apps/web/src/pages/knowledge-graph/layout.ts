import type { Node, Edge } from '@xyflow/react';

export interface LinkedEntity {
  id: string;
  type: string;
  name: string;
}

export interface MapData {
  control_id: string;
  linked_entities: {
    risks?: { category: string; risk: any }[];
    regulations?: { id: string; name: string }[];
    data_categories?: { id: string; name: any }[];
    retention_rules?: { category: string; context: string }[];
  }
}

/**
 * Generates a radial layout around a central ControlNode.
 */
export function generateRadialLayout(data: MapData): { nodes: Node[], edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Center node
  nodes.push({
    id: data.control_id,
    type: 'controlNode',
    position: { x: 0, y: 0 },
    data: { label: data.control_id, description: 'Standard Control' }
  });

  const flattenedEntities: LinkedEntity[] = [];

  if (data.linked_entities) {
    data.linked_entities.risks?.forEach(r => flattenedEntities.push({
        id: `risk-${r.category}-${Math.random().toString(36).substring(7)}`,
        type: 'Risk',
        name: typeof r.risk === 'object' ? r.risk.en || r.risk.pt || 'Risk' : r.risk
    }));
    data.linked_entities.regulations?.forEach(reg => flattenedEntities.push({
        id: `reg-${reg.id}`,
        type: 'Regulation',
        name: reg.name || reg.id
    }));
    data.linked_entities.data_categories?.forEach(dc => flattenedEntities.push({
        id: `dc-${dc.id}`,
        type: 'Data Category',
        name: typeof dc.name === 'object' ? dc.name.en || dc.name.pt || dc.id : dc.name
    }));
    data.linked_entities.retention_rules?.forEach(rr => flattenedEntities.push({
        id: `rr-${rr.category}-${rr.context}`,
        type: 'Retention Rule',
        name: `Retention: ${rr.category} / ${rr.context}`
    }));
  }

  const numLinks = flattenedEntities.length;
  if (numLinks === 0) return { nodes, edges };

  // Calculate coordinates on a circle
  // We use a radius proportional to the number of nodes so things don't get crowded.
  const baseRadius = 250;
  const radius = Math.max(baseRadius, (numLinks * 60) / (2 * Math.PI));
  
  flattenedEntities.forEach((entity, index) => {
    // Angle evenly spaced around the circle. Use -PI/2 offset to start at the top.
    const angle = (index / numLinks) * 2 * Math.PI - Math.PI / 2;
    
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);

    const nodeId = `entity-${entity.id}`;

    // Map entity type to correct Node mapping
    let nodeType = 'default';
    if (entity.type.toLowerCase().includes('regulation')) {
      nodeType = 'regulationNode';
    } else if (entity.type.toLowerCase().includes('risk')) {
      nodeType = 'riskNode';
    }

    nodes.push({
      id: nodeId,
      type: nodeType,
      position: { x, y },
      data: { label: entity.name, description: entity.type }
    });

    edges.push({
      id: `edge-${data.control_id}-${nodeId}`,
      source: data.control_id,
      target: nodeId,
      animated: true,
      style: { stroke: 'rgba(255, 255, 255, 0.2)', strokeWidth: 2 }
    });
  });

  return { nodes, edges };
}
