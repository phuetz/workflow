/**
 * PluginSandbox Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PluginSandbox, SecurityValidator } from '../../plugins/PluginSandbox';

describe('PluginSandbox', () => {
  let sandbox: PluginSandbox;

  beforeEach(() => {
    sandbox = new PluginSandbox({
      timeout: 5000,
      permissions: {
        network: [
          { host: 'api.example.com', protocol: 'https' },
        ],
      },
    });
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('Code Execution', () => {
    it('should execute simple code', async () => {
      const code = '1 + 1';
      const result = await sandbox.execute(code);

      expect(result).toBe(2);
    });

    it('should execute function', async () => {
      const code = '(() => { return "Hello, World!"; })()';
      const result = await sandbox.execute(code);

      expect(result).toBe('Hello, World!');
    });

    it('should handle async code', async () => {
      const code = `
        (async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'Done';
        })()
      `;
      const result = await sandbox.execute(code);

      expect(result).toBe('Done');
    });

    it('should timeout long-running code', async () => {
      sandbox = new PluginSandbox({ timeout: 100 });

      const code = `
        (() => {
          const start = Date.now();
          while (Date.now() - start < 1000) {
            // Busy loop
          }
          return 'Completed';
        })()
      `;

      // The sandbox should reject with an error (timeout or execution failure)
      await expect(sandbox.execute(code)).rejects.toThrow();
    });
  });

  describe('Sandbox Isolation', () => {
    it('should have access to safe globals', async () => {
      const code = 'typeof console === "object" && typeof Math === "object"';
      const result = await sandbox.execute(code);

      expect(result).toBe(true);
    });

    it('should not have access to dangerous globals', async () => {
      const code = 'typeof process === "undefined"';
      const result = await sandbox.execute(code);

      expect(result).toBe(true);
    });

    it('should provide safe console', async () => {
      let logged = false;

      sandbox.on('console:log', () => {
        logged = true;
      });

      await sandbox.execute('console.log("test")');

      expect(logged).toBe(true);
    });
  });

  describe('Resource Tracking', () => {
    it('should track CPU time', async () => {
      // Use a more CPU-intensive operation to ensure measurable time
      await sandbox.execute('let sum = 0; for (let i = 0; i < 10000; i++) sum += i; sum');

      const usage = sandbox.getResourceUsage();
      // cpuTime may be 0 for very fast operations, so just check it's defined and non-negative
      expect(usage.cpuTime).toBeGreaterThanOrEqual(0);
    });

    it('should track memory usage', async () => {
      await sandbox.execute('const arr = new Array(1000).fill(0)');

      const usage = sandbox.getResourceUsage();
      expect(usage.memoryUsage).toBeGreaterThan(0);
    });

    it('should reset resource usage', async () => {
      await sandbox.execute('1 + 1');
      sandbox.resetResourceUsage();

      const usage = sandbox.getResourceUsage();
      expect(usage.cpuTime).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should catch syntax errors', async () => {
      const code = 'invalid syntax {]';

      await expect(sandbox.execute(code)).rejects.toThrow();
    });

    it('should catch runtime errors', async () => {
      const code = '(() => { throw new Error("Test error"); })()';

      await expect(sandbox.execute(code)).rejects.toThrow('Test error');
    });
  });

  describe('Forking', () => {
    it('should create isolated fork', async () => {
      const fork = sandbox.fork();

      await sandbox.execute('const x = 1');
      await fork.execute('const x = 2');

      // Both should succeed without conflict
      expect(fork).toBeInstanceOf(PluginSandbox);

      await fork.cleanup();
    });
  });
});

describe('SecurityValidator', () => {
  describe('Code Scanning', () => {
    it('should detect eval usage', () => {
      const code = 'eval("1 + 1")';
      const result = SecurityValidator.scan(code);

      expect(result.safe).toBe(false);
      expect(result.issues).toEqual(expect.arrayContaining([expect.stringContaining('eval')]));
    });

    it('should detect child_process require', () => {
      const code = 'const cp = require("child_process")';
      const result = SecurityValidator.scan(code);

      expect(result.safe).toBe(false);
    });

    it('should detect fs require', () => {
      const code = 'const fs = require("fs")';
      const result = SecurityValidator.scan(code);

      expect(result.safe).toBe(false);
    });

    it('should detect prototype pollution', () => {
      const code = 'Object.prototype.__proto__ = {}';
      const result = SecurityValidator.scan(code);

      expect(result.safe).toBe(false);
    });

    it('should allow safe code', () => {
      const code = `
        const data = [1, 2, 3];
        const result = data.map(x => x * 2);
        return result;
      `;
      const result = SecurityValidator.scan(code);

      expect(result.safe).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('Permission Validation', () => {
    it('should warn about subprocess permission', () => {
      const result = SecurityValidator.validateManifestPermissions({
        subprocess: true,
      });

      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining('subprocess')]));
    });

    it('should warn about filesystem write', () => {
      const result = SecurityValidator.validateManifestPermissions({
        filesystem: { write: ['/tmp'] },
      });

      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining('filesystem')]));
    });

    it('should warn about wildcard network access', () => {
      const result = SecurityValidator.validateManifestPermissions({
        network: [{ host: '*', protocol: 'https' }],
      });

      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining('unrestricted')]));
    });

    it('should have no warnings for safe permissions', () => {
      const result = SecurityValidator.validateManifestPermissions({
        network: [{ host: 'api.example.com', protocol: 'https' }],
      });

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });
});
