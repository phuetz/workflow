/**
 * PluginRegistry Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PluginRegistry } from '../../plugins/PluginRegistry';
import * as fs from 'fs';
import * as path from 'path';

describe('PluginRegistry', () => {
  let registry: PluginRegistry;
  let testPluginDir: string;

  beforeEach(() => {
    testPluginDir = path.join(process.cwd(), 'test-plugin-registry');
    registry = new PluginRegistry({
      pluginDirectory: testPluginDir,
      registryUrl: 'https://test-registry.example.com',
    });
  });

  afterEach(() => {
    if (fs.existsSync(testPluginDir)) {
      fs.rmSync(testPluginDir, { recursive: true, force: true });
    }
  });

  describe('Source Parsing', () => {
    it('should parse registry source', () => {
      const source = 'my-plugin@1.0.0';
      const parsed = (registry as any).parseSource(source);

      expect(parsed.type).toBe('registry');
      expect(parsed.location).toBe('my-plugin');
      expect(parsed.version).toBe('1.0.0');
    });

    it('should parse git source', () => {
      const source = 'https://github.com/user/plugin.git';
      const parsed = (registry as any).parseSource(source);

      expect(parsed.type).toBe('git');
      expect(parsed.location).toBe(source);
    });

    it('should parse npm source', () => {
      const source = 'npm:@scope/plugin';
      const parsed = (registry as any).parseSource(source);

      expect(parsed.type).toBe('npm');
      expect(parsed.location).toBe('@scope/plugin');
    });

    it('should parse local path source', () => {
      const source = './my-plugin';
      const parsed = (registry as any).parseSource(source);

      expect(parsed.type).toBe('local');
    });
  });

  describe('Local Installation', () => {
    it('should install from local path', async () => {
      // Create test plugin
      const pluginPath = createTestPlugin('test-plugin');

      await registry.install({
        type: 'local',
        location: pluginPath,
      });

      const installed = registry.listInstalled();
      expect(installed).toHaveLength(1);
      expect(installed[0].name).toBe('test-plugin');
    });

    it('should fail to install non-existent local path', async () => {
      await expect(
        registry.install({
          type: 'local',
          location: '/non/existent/path',
        })
      ).rejects.toThrow(/does not exist/);
    });
  });

  describe('Plugin Management', () => {
    it('should list installed plugins', async () => {
      const plugin1 = createTestPlugin('plugin1');
      const plugin2 = createTestPlugin('plugin2');

      await registry.install({ type: 'local', location: plugin1 });
      await registry.install({ type: 'local', location: plugin2 });

      const installed = registry.listInstalled();

      expect(installed).toHaveLength(2);
      expect(installed.map(p => p.name)).toContain('plugin1');
      expect(installed.map(p => p.name)).toContain('plugin2');
    });

    it('should uninstall plugin', async () => {
      const pluginPath = createTestPlugin('test-plugin');
      await registry.install({ type: 'local', location: pluginPath });

      await registry.uninstall('test-plugin');

      const installed = registry.listInstalled();
      expect(installed).toHaveLength(0);
    });

    it('should fail to uninstall non-existent plugin', async () => {
      await expect(registry.uninstall('non-existent')).rejects.toThrow(
        /is not installed/
      );
    });
  });

  describe('Version Comparison', () => {
    it('should compare versions correctly', () => {
      const compare = (registry as any).compareVersions.bind(registry);

      expect(compare('1.0.0', '1.0.0')).toBe(0);
      expect(compare('1.0.1', '1.0.0')).toBe(1);
      expect(compare('1.0.0', '1.0.1')).toBe(-1);
      expect(compare('2.0.0', '1.9.9')).toBe(1);
      expect(compare('1.0.0', '2.0.0')).toBe(-1);
    });
  });

  describe('Events', () => {
    it('should emit install:start event', async () => {
      const plugin = createTestPlugin('test-plugin');
      let emitted = false;

      registry.on('install:start', () => {
        emitted = true;
      });

      await registry.install({ type: 'local', location: plugin });

      expect(emitted).toBe(true);
    });

    it('should emit install:complete event', async () => {
      const plugin = createTestPlugin('test-plugin');
      let emitted = false;

      registry.on('install:complete', () => {
        emitted = true;
      });

      await registry.install({ type: 'local', location: plugin });

      expect(emitted).toBe(true);
    });

    it('should emit uninstall events', async () => {
      const plugin = createTestPlugin('test-plugin');
      await registry.install({ type: 'local', location: plugin });

      const events: string[] = [];

      registry.on('uninstall:start', () => events.push('start'));
      registry.on('uninstall:complete', () => events.push('complete'));

      await registry.uninstall('test-plugin');

      expect(events).toEqual(['start', 'complete']);
    });
  });
});

// Helper functions

function createTestPlugin(name: string): string {
  const tmpDir = path.join(process.cwd(), 'tmp-test-plugins');
  const pluginPath = path.join(tmpDir, name);

  fs.mkdirSync(pluginPath, { recursive: true });

  const manifest = {
    name,
    version: '1.0.0',
    description: 'Test plugin',
    author: 'Test',
    license: 'MIT',
    main: 'index.js',
    nodes: ['TestNode'],
  };

  fs.writeFileSync(
    path.join(pluginPath, 'workflow.json'),
    JSON.stringify(manifest, null, 2)
  );

  fs.writeFileSync(
    path.join(pluginPath, 'index.js'),
    'module.exports = { TestNode: class {} };'
  );

  return pluginPath;
}
