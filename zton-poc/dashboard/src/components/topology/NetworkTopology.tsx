import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, MarkerType, type Node, type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import type { TopologyEdge, TopologyNode } from '@/types';
import { useDashboardStore } from '@/store/dashboardStore';

const STATUS_COLORS: Record<string, string> = {
  online: '#10b981',
  warning: '#f59e0b',
  blocked: '#ef4444',
  offline: '#64748b',
};

const TYPE_SHAPES: Record<string, string> = {
  controller: 'rounded-lg',
  router: 'rounded-lg',
  endpoint: 'rounded-full',
};

function toFlowNodes(nodes: TopologyNode[]): Node[] {
  const positions: Record<string, { x: number; y: number }> = {
    controller: { x: 250, y: 0 },
    router: { x: 250, y: 100 },
    'laptop-a': { x: 100, y: 220 },
    'laptop-b': { x: 0, y: 340 },
    'phone-b': { x: 200, y: 340 },
    'phone-a': { x: 400, y: 340 },
  };
  return nodes.map((n) => ({
    id: n.id,
    position: positions[n.id] ?? { x: 0, y: 0 },
    data: { label: n.label, status: n.status, type: n.type },
    style: {
      background: '#1a2234',
      border: `2px solid ${STATUS_COLORS[n.status] ?? '#3b82f6'}`,
      color: '#e2e8f0',
      borderRadius: n.type === 'endpoint' ? '50%' : '8px',
      padding: '10px 16px',
      fontSize: '12px',
      fontWeight: 600,
      minWidth: 90,
      textAlign: 'center' as const,
    },
  }));
}

function toFlowEdges(edges: TopologyEdge[], activeFlow: { source: string; target: string; status: string } | null): Edge[] {
  return edges.map((e) => {
    const isActive = activeFlow && activeFlow.source === e.source && activeFlow.target === e.target;
    const color = isActive
      ? (activeFlow!.status === 'allowed' ? '#10b981' : '#ef4444')
      : '#2a3548';
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      animated: !!isActive,
      style: { stroke: color, strokeWidth: isActive ? 3 : 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color },
    };
  });
}

export function NetworkTopology() {
  const { topology, activeFlow } = useDashboardStore();
  const initialNodes = useMemo(() => toFlowNodes(topology.nodes), [topology.nodes]);
  const initialEdges = useMemo(() => toFlowEdges(topology.edges, activeFlow), [topology.edges, activeFlow]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => { setNodes(toFlowNodes(topology.nodes)); }, [topology.nodes, setNodes]);
  useEffect(() => { setEdges(toFlowEdges(topology.edges, activeFlow)); }, [topology.edges, activeFlow, setEdges]);

  const onInit = useCallback(() => {}, []);

  return (
    <Card className="h-[380px]">
      <CardHeader>
        <CardTitle>Network Topology</CardTitle>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Allowed</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Blocked</span>
        </div>
      </CardHeader>
      <div className="h-[300px] rounded-lg overflow-hidden border border-soc-border/40">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={onInit}
          fitView
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          panOnDrag
          zoomOnScroll
        >
          <Background color="#2a3548" gap={20} />
          <Controls className="!bg-soc-card !border-soc-border !rounded-lg" />
          <MiniMap nodeColor={(n) => STATUS_COLORS[(n.data as { status: string }).status] ?? '#3b82f6'} maskColor="rgba(11,15,25,0.8)" />
        </ReactFlow>
      </div>
    </Card>
  );
}
