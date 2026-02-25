/**
 * Tests for OS Detector
 *
 * Tests operating system detection for cross-platform support.
 */

'use strict';

const {
  OS_TYPE,
  detectOS,
  isWSL,
  getWSLDistro,
  detectLinuxPackageManager,
  getOSDisplayName,
} = require('../../packages/aios-install/src/os-detector');

describe('os-detector', () => {
  describe('OS_TYPE', () => {
    it('should define MACOS', () => {
      expect(OS_TYPE.MACOS).toBe('macos');
    });

    it('should define LINUX', () => {
      expect(OS_TYPE.LINUX).toBe('linux');
    });

    it('should define WINDOWS', () => {
      expect(OS_TYPE.WINDOWS).toBe('windows');
    });

    it('should define WSL', () => {
      expect(OS_TYPE.WSL).toBe('wsl');
    });

    it('should define UNKNOWN', () => {
      expect(OS_TYPE.UNKNOWN).toBe('unknown');
    });
  });

  describe('detectOS', () => {
    it('should return an object with type', () => {
      const result = detectOS();
      expect(result).toHaveProperty('type');
      expect(Object.values(OS_TYPE)).toContain(result.type);
    });

    it('should return platform info', () => {
      const result = detectOS();
      expect(result).toHaveProperty('platform');
      expect(typeof result.platform).toBe('string');
    });

    it('should return release info', () => {
      const result = detectOS();
      expect(result).toHaveProperty('release');
      expect(typeof result.release).toBe('string');
    });

    it('should return architecture', () => {
      const result = detectOS();
      expect(result).toHaveProperty('arch');
      expect(typeof result.arch).toBe('string');
    });

    it('should return home directory', () => {
      const result = detectOS();
      expect(result).toHaveProperty('homeDir');
      expect(typeof result.homeDir).toBe('string');
    });

    it('should return shell', () => {
      const result = detectOS();
      expect(result).toHaveProperty('shell');
      expect(typeof result.shell).toBe('string');
    });

    it('should return path separator', () => {
      const result = detectOS();
      expect(result).toHaveProperty('pathSeparator');
    });

    it('should include install instructions', () => {
      const result = detectOS();
      expect(result).toHaveProperty('installInstructions');
      expect(result.installInstructions).toHaveProperty('node');
      expect(result.installInstructions).toHaveProperty('git');
      expect(result.installInstructions).toHaveProperty('docker');
      expect(result.installInstructions).toHaveProperty('gh');
    });

    it('should detect macOS correctly', () => {
      const result = detectOS();
      if (process.platform === 'darwin') {
        expect(result.type).toBe(OS_TYPE.MACOS);
        expect(result.packageManager).toBe('brew');
      }
    });

    it('should detect Windows correctly', () => {
      const result = detectOS();
      if (process.platform === 'win32') {
        expect(result.type).toBe(OS_TYPE.WINDOWS);
        expect(result.packageManager).toBe('winget');
      }
    });

    it('should detect Linux correctly', () => {
      const result = detectOS();
      if (process.platform === 'linux' && !isWSL()) {
        expect(result.type).toBe(OS_TYPE.LINUX);
      }
    });
  });

  describe('isWSL', () => {
    it('should return boolean', () => {
      const result = isWSL();
      expect(typeof result).toBe('boolean');
    });

    it('should return false on macOS', () => {
      if (process.platform === 'darwin') {
        expect(isWSL()).toBe(false);
      }
    });

    it('should return false on Windows', () => {
      if (process.platform === 'win32') {
        expect(isWSL()).toBe(false);
      }
    });
  });

  describe('getWSLDistro', () => {
    it('should return null or string', () => {
      const result = getWSLDistro();
      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should return null on non-WSL systems', () => {
      if (!isWSL()) {
        expect(getWSLDistro()).toBeNull();
      }
    });
  });

  describe('detectLinuxPackageManager', () => {
    it('should return a string', () => {
      const result = detectLinuxPackageManager();
      expect(typeof result).toBe('string');
    });

    it('should return unknown on non-Linux', () => {
      if (process.platform !== 'linux') {
        expect(detectLinuxPackageManager()).toBe('unknown');
      }
    });
  });

  describe('getOSDisplayName', () => {
    it('should return macOS name for macOS', () => {
      const osInfo = { type: OS_TYPE.MACOS, release: '21.0.0' };
      const name = getOSDisplayName(osInfo);
      expect(name).toContain('macOS');
      expect(name).toContain('21.0.0');
    });

    it('should return WSL name with distro', () => {
      const osInfo = { type: OS_TYPE.WSL, wslDistro: 'Ubuntu' };
      const name = getOSDisplayName(osInfo);
      expect(name).toContain('WSL');
      expect(name).toContain('Ubuntu');
    });

    it('should return WSL name without distro', () => {
      const osInfo = { type: OS_TYPE.WSL, wslDistro: null };
      const name = getOSDisplayName(osInfo);
      expect(name).toContain('WSL');
      expect(name).toContain('Linux');
    });

    it('should return Linux name', () => {
      const osInfo = { type: OS_TYPE.LINUX, release: '5.0.0' };
      const name = getOSDisplayName(osInfo);
      expect(name).toContain('Linux');
      expect(name).toContain('5.0.0');
    });

    it('should return Windows name', () => {
      const osInfo = { type: OS_TYPE.WINDOWS, release: '10.0.0' };
      const name = getOSDisplayName(osInfo);
      expect(name).toContain('Windows');
      expect(name).toContain('10.0.0');
    });

    it('should return Unknown for unknown type', () => {
      const osInfo = { type: OS_TYPE.UNKNOWN, platform: 'freebsd' };
      const name = getOSDisplayName(osInfo);
      expect(name).toContain('Unknown');
      expect(name).toContain('freebsd');
    });
  });

  describe('integration', () => {
    it('should return consistent results across calls', () => {
      const result1 = detectOS();
      const result2 = detectOS();
      expect(result1.type).toBe(result2.type);
      expect(result1.platform).toBe(result2.platform);
    });

    it('should match current platform', () => {
      const result = detectOS();
      expect(result.platform).toBe(process.platform);
    });

    it('should match current architecture', () => {
      const result = detectOS();
      expect(result.arch).toBe(process.arch);
    });
  });
});
