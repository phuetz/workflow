/**
 * Impact Analyzer Tests
 * Tests for impact analysis and "what-if" scenarios
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ImpactAnalyzer } from '../../lineage/ImpactAnalyzer';
import { DataLineageTracker } from '../../lineage/DataLineageTracker';
import {
  DataSourceType,
  TransformationType,
  ComplianceFramework,
  DataSensitivity
} from '../../types/lineage';

describe('ImpactAnalyzer', () => {
  let tracker: DataLineageTracker;
  let analyzer: ImpactAnalyzer;

  beforeEach(() => {
    tracker = new DataLineageTracker({ enabled: true, asyncMode: false });
    tracker.startExecution('test-workflow', 'test-exec');

    // Create a test lineage graph: A -> B -> C -> D
    //                                  B -> E
    const sources = ['A', 'B', 'C', 'D', 'E'].map(id => {
      return tracker.registerDataSource(
        `node-${id}`,
        DataSourceType.API,
        `Node ${id}`,
        `url-${id}`,
        { sensitivity: id === 'C' ? DataSensitivity.PII : DataSensitivity.INTERNAL }
      );
    });

    const nodeA = tracker.trackNode('node-A', sources[0], {
      nodeName: 'Node A',
      nodeType: 'source',
      recordCount: 1000,
      size: 50000
    });

    const nodeB = tracker.trackNode('node-B', sources[1], {
      upstreamNodes: [nodeA.id],
      nodeName: 'Node B',
      nodeType: 'transform',
      recordCount: 800,
      size: 40000
    });

    const nodeC = tracker.trackNode('node-C', sources[2], {
      upstreamNodes: [nodeB.id],
      nodeName: 'Node C',
      nodeType: 'transform',
      recordCount: 600,
      size: 30000
    });

    const nodeD = tracker.trackNode('node-D', sources[3], {
      upstreamNodes: [nodeC.id],
      nodeName: 'Node D',
      nodeType: 'sink',
      recordCount: 600,
      size: 30000
    });

    const nodeE = tracker.trackNode('node-E', sources[4], {
      upstreamNodes: [nodeB.id],
      nodeName: 'Node E',
      nodeType: 'sink',
      recordCount: 800,
      size: 40000
    });

    const graph = tracker.buildLineageGraph();
    analyzer = new ImpactAnalyzer(graph);
  });

  afterEach(() => {
    tracker.endExecution();
  });

  describe('Basic Impact Analysis', () => {
    it('should analyze downstream impact', () => {
      const graph = tracker.buildLineageGraph();
      const nodeB = Array.from(graph.nodes.values()).find(n => n.nodeId === 'node-B');

      if (!nodeB) throw new Error('Node B not found');

      const result = analyzer.analyzeNodeImpact(nodeB.id, {
        direction: 'downstream'
      });

      expect(result).toBeDefined();
      expect(result.impactType).toBe('downstream');
      expect(result.affectedNodes.length).toBeGreaterThan(0);

      // Should affect C, D, and E
      expect(result.affectedNodes.length).toBe(4); // B itself + C, D, E
    });

    it('should analyze upstream impact', () => {
      const graph = tracker.buildLineageGraph();
      const nodeC = Array.from(graph.nodes.values()).find(n => n.nodeId === 'node-C');

      if (!nodeC) throw new Error('Node C not found');

      const result = analyzer.analyzeNodeImpact(nodeC.id, {
        direction: 'upstream'
      });

      expect(result.impactType).toBe('upstream');
      // Should affect B and A
      expect(result.affectedNodes.length).toBeGreaterThan(0);
    });

    it('should analyze bidirectional impact', () => {
      const graph = tracker.buildLineageGraph();
      const nodeB = Array.from(graph.nodes.values()).find(n => n.nodeId === 'node-B');

      if (!nodeB) throw new Error('Node B not found');

      const result = analyzer.analyzeNodeImpact(nodeB.id, {
        direction: 'bidirectional'
      });

      expect(result.impactType).toBe('bidirectional');
      // Should affect all nodes
      expect(result.affectedNodes.length).toBeGreaterThan(3);
    });
  });

  describe('Risk Assessment', () => {
    it('should calculate risk levels', () => {
      const graph = tracker.buildLineageGraph();
      const nodeB = Array.from(graph.nodes.values()).find(n => n.nodeId === 'node-B');

      if (!nodeB) throw new Error('Node B not found');

      const result = analyzer.analyzeNodeImpact(nodeB.id, {
        direction: 'downstream',
        includeRiskAssessment: true
      });

      expect(result.riskAssessment).toBeDefined();
      expect(result.riskAssessment.overallRisk).toMatch(/^(low|medium|high|critical)$/);
      expect(Array.isArray(result.riskAssessment.riskFactors)).toBe(true);
      expect(Array.isArray(result.riskAssessment.mitigationStrategies)).toBe(true);
    });

    it('should identify sensitive data risk', () => {
      const graph = tracker.buildLineageGraph();
      const nodeC = Array.from(graph.nodes.values()).find(n => n.nodeId === 'node-C');

      if (!nodeC) throw new Error('Node C not found');

      const result = analyzer.analyzeNodeImpact(nodeC.id, {
        direction: 'downstream',
        includeRiskAssessment: true
      });

      // Node C has PII sensitivity, should be reflected in risk
      expect(result.riskAssessment.overallRisk).not.toBe('low');
    });
  });

  describe('Compliance Impact', () => {
    it('should assess compliance impact', () => {
      const graph = tracker.buildLineageGraph();
      const nodeB = Array.from(graph.nodes.values()).find(n => n.nodeId === 'node-B');

      if (!nodeB) throw new Error('Node B not found');

      const result = analyzer.analyzeNodeImpact(nodeB.id, {
        direction: 'downstream',
        includeCompliance: true
      });

      expect(result.complianceImpact).toBeDefined();
      expect(Array.isArray(result.complianceImpact.affectedFrameworks)).toBe(true);
      expect(typeof result.complianceImpact.breachRisk).toBe('boolean');
      expect(Array.isArray(result.complianceImpact.requiredActions)).toBe(true);
    });
  });

  describe('Blast Radius Analysis', () => {
    it('should calculate blast radius', () => {
      const graph = tracker.buildLineageGraph();
      const nodeB = Array.from(graph.nodes.values()).find(n => n.nodeId === 'node-B');

      if (!nodeB) throw new Error('Node B not found');

      const blastRadius = analyzer.analyzeBlastRadius(nodeB.id);

      expect(blastRadius).toBeDefined();
      expect(Array.isArray(blastRadius.directImpact)).toBe(true);
      expect(Array.isArray(blastRadius.indirectImpact)).toBe(true);
      expect(typeof blastRadius.totalAffected).toBe('number');
      expect(typeof blastRadius.estimatedDowntime).toBe('number');
    });

    it('should distinguish direct and indirect impact', () => {
      const graph = tracker.buildLineageGraph();
      const nodeB = Array.from(graph.nodes.values()).find(n => n.nodeId === 'node-B');

      if (!nodeB) throw new Error('Node B not found');

      const blastRadius = analyzer.analyzeBlastRadius(nodeB.id);

      // C and E are direct, D is indirect
      expect(blastRadius.directImpact.length).toBeGreaterThan(0);
      expect(blastRadius.totalAffected).toBeGreaterThan(blastRadius.directImpact.length);
    });
  });

  describe('Node Removal Simulation', () => {
    it('should simulate node removal impact', () => {
      const graph = tracker.buildLineageGraph();
      const nodeB = Array.from(graph.nodes.values()).find(n => n.nodeId === 'node-B');

      if (!nodeB) throw new Error('Node B not found');

      const simulation = analyzer.simulateNodeRemoval(nodeB.id);

      expect(simulation).toBeDefined();
      expect(Array.isArray(simulation.orphanedNodes)).toBe(true);
      expect(Array.isArray(simulation.brokenPaths)).toBe(true);
      expect(Array.isArray(simulation.affectedWorkflows)).toBe(true);
      expect(simulation.estimatedImpact).toMatch(/^(low|medium|high|critical)$/);
    });

    it('should identify orphaned nodes', () => {
      const graph = tracker.buildLineageGraph();
      const nodeB = Array.from(graph.nodes.values()).find(n => n.nodeId === 'node-B');

      if (!nodeB) throw new Error('Node B not found');

      const simulation = analyzer.simulateNodeRemoval(nodeB.id);

      // Removing B should orphan C and E (and transitively D)
      expect(simulation.orphanedNodes.length).toBeGreaterThan(0);
    });
  });

  describe('Mitigation Recommendations', () => {
    it('should recommend mitigation strategies', () => {
      const graph = tracker.buildLineageGraph();
      const nodeB = Array.from(graph.nodes.values()).find(n => n.nodeId === 'node-B');

      if (!nodeB) throw new Error('Node B not found');

      const result = analyzer.analyzeNodeImpact(nodeB.id, {
        direction: 'downstream',
        includeRiskAssessment: true
      });

      const recommendations = analyzer.recommendMitigations(result);

      expect(Array.isArray(recommendations)).toBe(true);
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('strategy');
        expect(rec).toHaveProperty('priority');
        expect(rec).toHaveProperty('effort');
        expect(rec).toHaveProperty('description');
      });
    });

    it('should prioritize recommendations by severity', () => {
      const graph = tracker.buildLineageGraph();
      const nodeC = Array.from(graph.nodes.values()).find(n => n.nodeId === 'node-C');

      if (!nodeC) throw new Error('Node C not found');

      const result = analyzer.analyzeNodeImpact(nodeC.id, {
        direction: 'downstream',
        includeRiskAssessment: true,
        includeCompliance: true
      });

      const recommendations = analyzer.recommendMitigations(result);

      if (recommendations.length > 1) {
        // Verify recommendations are sorted by priority
        const priorities = { critical: 4, high: 3, medium: 2, low: 1 };
        for (let i = 1; i < recommendations.length; i++) {
          expect(priorities[recommendations[i - 1].priority])
            .toBeGreaterThanOrEqual(priorities[recommendations[i].priority]);
        }
      }
    });
  });

  describe('Performance', () => {
    it('should complete analysis in under 1 second', () => {
      const graph = tracker.buildLineageGraph();
      const nodeB = Array.from(graph.nodes.values()).find(n => n.nodeId === 'node-B');

      if (!nodeB) throw new Error('Node B not found');

      const start = performance.now();

      analyzer.analyzeNodeImpact(nodeB.id, {
        direction: 'bidirectional',
        includeRiskAssessment: true,
        includeCompliance: true
      });

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000);
      console.log(`Impact analysis completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent node gracefully', () => {
      expect(() => {
        analyzer.analyzeNodeImpact('non-existent-node', {
          direction: 'downstream'
        });
      }).toThrow();
    });

    it('should handle isolated nodes', () => {
      // Create an isolated node
      const isolatedSource = tracker.registerDataSource(
        'isolated',
        DataSourceType.MANUAL,
        'Isolated',
        'manual'
      );

      const isolatedNode = tracker.trackNode('isolated', isolatedSource, {
        nodeName: 'Isolated',
        nodeType: 'isolated'
      });

      const graph = tracker.buildLineageGraph();
      const isoLineageNode = Array.from(graph.nodes.values()).find(
        n => n.nodeId === 'isolated'
      );

      if (!isoLineageNode) throw new Error('Isolated node not found');

      const newAnalyzer = new ImpactAnalyzer(graph);
      const result = newAnalyzer.analyzeNodeImpact(isoLineageNode.id, {
        direction: 'downstream'
      });

      // Should only affect itself
      expect(result.affectedNodes.length).toBe(1);
    });
  });
});
