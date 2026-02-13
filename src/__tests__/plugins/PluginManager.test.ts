/**
 * PluginManager Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PluginManager } from '../../plugins/PluginManager';
import * as fs from 'fs';
import * as path from 'path';

describe('PluginManager', () => {
  let pluginManager: PluginManager;
  let testPluginDir: string;

  beforeEach(() => {
    testPluginDir = path.join(process.cwd(), 'test-plugins');
    pluginManager = new PluginManager(testPluginDir);
  });

  afterEach(async () => {
    await pluginManager.cleanup();
    if (fs.existsSync(testPluginDir)) {
      fs.rmSync(testPluginDir, { recursive: true, force: true });
    }
  });

  describe('Plugin Loading', () => {
    it('should load a valid plugin', async () => {
      // Create test plugin
      const pluginPath = createTestPlugin(testPluginDir, 'test-plugin');

      // Load plugin
      const plugin = await pluginManager.loadPlugin(pluginPath);

      expect(plugin).toBeDefined();
      expect(plugin.manifest.name).toBe('test-plugin');
      expect(plugin.manifest.version).toBe('1.0.0');
      expect(plugin.enabled).toBe(true);
    });

    it('should fail to load plugin without manifest', async () => {
      const pluginPath = path.join(testPluginDir, 'invalid-plugin');
      fs.mkdirSync(pluginPath, { recursive: true });

      await expect(pluginManager.loadPlugin(pluginPath)).rejects.toThrow();
    });

    it('should load plugin with package.json fallback', async () => {
      const pluginPath = createTestPluginWithPackageJson(testPluginDir, 'pkg-plugin');

      const plugin = await pluginManager.loadPlugin(pluginPath);

      expect(plugin).toBeDefined();
      expect(plugin.manifest.name).toBe('pkg-plugin');
    });

    it('should load all plugins from directory', async () => {
      createTestPlugin(testPluginDir, 'plugin1');
      createTestPlugin(testPluginDir, 'plugin2');
      createTestPlugin(testPluginDir, 'plugin3');

      await pluginManager.loadAllPlugins();

      const stats = pluginManager.getStatistics();
      expect(stats.total).toBe(3);
      expect(stats.enabled).toBe(3);
    });
  });

  describe('Plugin Management', () => {
    it('should get loaded plugin', async () => {
      const pluginPath = createTestPlugin(testPluginDir, 'test-plugin');
      await pluginManager.loadPlugin(pluginPath);

      const plugin = pluginManager.getPlugin('test-plugin');

      expect(plugin).toBeDefined();
      expect(plugin?.manifest.name).toBe('test-plugin');
    });

    it('should enable/disable plugin', async () => {
      const pluginPath = createTestPlugin(testPluginDir, 'test-plugin');
      await pluginManager.loadPlugin(pluginPath);

      pluginManager.disablePlugin('test-plugin');
      expect(pluginManager.isPluginEnabled('test-plugin')).toBe(false);

      pluginManager.enablePlugin('test-plugin');
      expect(pluginManager.isPluginEnabled('test-plugin')).toBe(true);
    });

    it('should unload plugin', async () => {
      const pluginPath = createTestPlugin(testPluginDir, 'test-plugin');
      await pluginManager.loadPlugin(pluginPath);

      await pluginManager.unloadPlugin('test-plugin');

      expect(pluginManager.getPlugin('test-plugin')).toBeUndefined();
    });

    it('should reload plugin', async () => {
      const pluginPath = createTestPlugin(testPluginDir, 'test-plugin');
      await pluginManager.loadPlugin(pluginPath);

      // Modify plugin
      const manifestPath = path.join(pluginPath, 'workflow.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      manifest.version = '1.0.1';
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      await pluginManager.reloadPlugin('test-plugin');

      const plugin = pluginManager.getPlugin('test-plugin');
      expect(plugin?.manifest.version).toBe('1.0.1');
    });
  });

  describe('Node and Credential Access', () => {
    it('should get node from plugin', async () => {
      const pluginPath = createTestPlugin(testPluginDir, 'test-plugin');
      await pluginManager.loadPlugin(pluginPath);

      const NodeClass = pluginManager.getNode('test-plugin', 'TestNode');

      expect(NodeClass).toBeDefined();
    });

    it('should get all nodes from all plugins', async () => {
      createTestPlugin(testPluginDir, 'plugin1');
      createTestPlugin(testPluginDir, 'plugin2');

      await pluginManager.loadAllPlugins();

      const allNodes = pluginManager.getAllNodes();

      expect(allNodes.size).toBeGreaterThan(0);
    });

    it('should get credential from plugin', async () => {
      const pluginPath = createTestPluginWithCredentials(testPluginDir, 'test-plugin');
      await pluginManager.loadPlugin(pluginPath);

      const CredentialClass = pluginManager.getCredential('test-plugin', 'TestCredential');

      expect(CredentialClass).toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', async () => {
      createTestPlugin(testPluginDir, 'plugin1');
      createTestPlugin(testPluginDir, 'plugin2');

      await pluginManager.loadAllPlugins();
      pluginManager.disablePlugin('plugin1');

      const stats = pluginManager.getStatistics();

      expect(stats.total).toBe(2);
      expect(stats.enabled).toBe(1);
      expect(stats.disabled).toBe(1);
    });
  });

  describe('Validation', () => {
    it('should validate plugin permissions', async () => {
      const pluginPath = createTestPluginWithPermissions(testPluginDir, 'test-plugin', {
        network: [{ host: 'api.example.com', protocol: 'https' }],
      });

      // Should not throw
      await pluginManager.loadPlugin(pluginPath, {
        validatePermissions: true,
      });
    });

    it('should validate engine version', async () => {
      const pluginPath = createTestPlugin(testPluginDir, 'test-plugin');
      const manifestPath = path.join(pluginPath, 'workflow.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      manifest.minEngineVersion = '999.0.0'; // Future version
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      await expect(
        pluginManager.loadPlugin(pluginPath, {
          validatePermissions: true,
        })
      ).rejects.toThrow(/engine version/);
    });
  });
});

// Helper functions

function createTestPlugin(baseDir: string, name: string): string {
  const pluginPath = path.join(baseDir, name);
  fs.mkdirSync(pluginPath, { recursive: true });

  const manifest = {
    name,
    version: '1.0.0',
    description: 'Test plugin',
    author: 'Test Author',
    license: 'MIT',
    main: 'index.js',
    nodes: ['TestNode'],
    credentials: [],
  };

  fs.writeFileSync(
    path.join(pluginPath, 'workflow.json'),
    JSON.stringify(manifest, null, 2)
  );

  // Create simple index.js
  const code = `
    class TestNode {
      description = {
        displayName: 'Test Node',
        name: 'testNode',
        group: ['transform'],
        version: 1,
        description: 'Test node',
        defaults: { name: 'Test Node' },
        inputs: ['main'],
        outputs: ['main'],
        properties: [],
      };

      async execute() {
        return [[]];
      }
    }

    module.exports = { TestNode };
  `;

  fs.writeFileSync(path.join(pluginPath, 'index.js'), code);

  return pluginPath;
}

function createTestPluginWithPackageJson(baseDir: string, name: string): string {
  const pluginPath = path.join(baseDir, name);
  fs.mkdirSync(pluginPath, { recursive: true });

  const packageJson = {
    name,
    version: '1.0.0',
    description: 'Test plugin',
    main: 'index.js',
    n8n: {
      nodes: ['TestNode'],
      credentials: [],
    },
  };

  fs.writeFileSync(
    path.join(pluginPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  const code = `
    class TestNode {
      description = { displayName: 'Test', name: 'test', group: ['transform'], version: 1, description: '', defaults: { name: 'Test' }, inputs: ['main'], outputs: ['main'], properties: [] };
      async execute() { return [[]]; }
    }
    module.exports = { TestNode };
  `;

  fs.writeFileSync(path.join(pluginPath, 'index.js'), code);

  return pluginPath;
}

function createTestPluginWithCredentials(baseDir: string, name: string): string {
  const pluginPath = createTestPlugin(baseDir, name);

  // Update manifest
  const manifestPath = path.join(pluginPath, 'workflow.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  manifest.credentials = ['TestCredential'];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // Create credentials directory
  const credPath = path.join(pluginPath, 'credentials');
  fs.mkdirSync(credPath, { recursive: true });

  const credCode = `
    class TestCredential {
      name = 'testCredential';
      displayName = 'Test Credential';
      properties = [];
    }
    module.exports = { TestCredential };
  `;

  fs.writeFileSync(path.join(credPath, 'TestCredential.js'), credCode);

  return pluginPath;
}

function createTestPluginWithPermissions(
  baseDir: string,
  name: string,
  permissions: any
): string {
  const pluginPath = createTestPlugin(baseDir, name);

  const manifestPath = path.join(pluginPath, 'workflow.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  manifest.permissions = permissions;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return pluginPath;
}
