/**
 * Tests for File Hasher Utility
 *
 * Tests cross-platform file hashing with line ending normalization.
 */

'use strict';

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const {
  hashFile,
  hashFileAsync,
  hashFilesParallel,
  hashString,
  hashesMatch,
  hashFilesMatchAsync,
  getFileMetadata,
  isBinaryFile,
  normalizeLineEndings,
  removeBOM,
  BINARY_EXTENSIONS,
} = require('../../packages/installer/src/installer/file-hasher');

describe('file-hasher', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-hasher-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('BINARY_EXTENSIONS', () => {
    it('should include common image extensions', () => {
      expect(BINARY_EXTENSIONS).toContain('.png');
      expect(BINARY_EXTENSIONS).toContain('.jpg');
      expect(BINARY_EXTENSIONS).toContain('.gif');
    });

    it('should include common font extensions', () => {
      expect(BINARY_EXTENSIONS).toContain('.woff');
      expect(BINARY_EXTENSIONS).toContain('.ttf');
    });

    it('should include common archive extensions', () => {
      expect(BINARY_EXTENSIONS).toContain('.zip');
      expect(BINARY_EXTENSIONS).toContain('.tar');
    });
  });

  describe('isBinaryFile', () => {
    it('should return true for binary extensions', () => {
      expect(isBinaryFile('image.png')).toBe(true);
      expect(isBinaryFile('archive.zip')).toBe(true);
      expect(isBinaryFile('font.woff2')).toBe(true);
    });

    it('should return false for text extensions', () => {
      expect(isBinaryFile('script.js')).toBe(false);
      expect(isBinaryFile('config.json')).toBe(false);
      expect(isBinaryFile('README.md')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isBinaryFile('IMAGE.PNG')).toBe(true);
      expect(isBinaryFile('Image.Jpg')).toBe(true);
    });
  });

  describe('normalizeLineEndings', () => {
    it('should convert CRLF to LF', () => {
      const input = 'line1\r\nline2\r\nline3';
      expect(normalizeLineEndings(input)).toBe('line1\nline2\nline3');
    });

    it('should convert CR to LF', () => {
      const input = 'line1\rline2\rline3';
      expect(normalizeLineEndings(input)).toBe('line1\nline2\nline3');
    });

    it('should handle mixed line endings', () => {
      const input = 'line1\r\nline2\rline3\nline4';
      expect(normalizeLineEndings(input)).toBe('line1\nline2\nline3\nline4');
    });

    it('should leave LF unchanged', () => {
      const input = 'line1\nline2\nline3';
      expect(normalizeLineEndings(input)).toBe(input);
    });

    it('should handle empty string', () => {
      expect(normalizeLineEndings('')).toBe('');
    });
  });

  describe('removeBOM', () => {
    it('should remove UTF-8 BOM', () => {
      const bomChar = String.fromCharCode(0xFEFF);
      const input = bomChar + 'content';
      expect(removeBOM(input)).toBe('content');
    });

    it('should leave content without BOM unchanged', () => {
      const input = 'content';
      expect(removeBOM(input)).toBe('content');
    });

    it('should handle empty string', () => {
      expect(removeBOM('')).toBe('');
    });
  });

  describe('hashString', () => {
    it('should return consistent hash for same input', () => {
      const hash1 = hashString('test content');
      const hash2 = hashString('test content');
      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different input', () => {
      const hash1 = hashString('content 1');
      const hash2 = hashString('content 2');
      expect(hash1).not.toBe(hash2);
    });

    it('should return 64 character hex string', () => {
      const hash = hashString('test');
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });
  });

  describe('hashesMatch', () => {
    it('should return true for matching hashes', () => {
      const hash = hashString('test');
      expect(hashesMatch(hash, hash)).toBe(true);
    });

    it('should be case insensitive', () => {
      const hash1 = 'abc123def456';
      const hash2 = 'ABC123DEF456';
      expect(hashesMatch(hash1, hash2)).toBe(true);
    });

    it('should return false for non-matching hashes', () => {
      const hash1 = hashString('content 1');
      const hash2 = hashString('content 2');
      expect(hashesMatch(hash1, hash2)).toBe(false);
    });

    it('should return false for null hashes', () => {
      expect(hashesMatch(null, 'hash')).toBe(false);
      expect(hashesMatch('hash', null)).toBe(false);
      expect(hashesMatch(null, null)).toBe(false);
    });
  });

  describe('hashFile', () => {
    it('should hash text file', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'test content');

      const hash = hashFile(filePath);
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('should throw for non-existent file', () => {
      expect(() => hashFile('/nonexistent/file.txt')).toThrow('File not found');
    });

    it('should throw for directory', () => {
      expect(() => hashFile(tempDir)).toThrow('Cannot hash directory');
    });

    it('should produce same hash regardless of line endings', async () => {
      const file1 = path.join(tempDir, 'lf.txt');
      const file2 = path.join(tempDir, 'crlf.txt');

      await fs.writeFile(file1, 'line1\nline2\nline3');
      await fs.writeFile(file2, 'line1\r\nline2\r\nline3');

      const hash1 = hashFile(file1);
      const hash2 = hashFile(file2);

      expect(hash1).toBe(hash2);
    });
  });

  describe('hashFileAsync', () => {
    it('should hash file asynchronously', async () => {
      const filePath = path.join(tempDir, 'async-test.txt');
      await fs.writeFile(filePath, 'async content');

      const hash = await hashFileAsync(filePath);
      expect(hash.length).toBe(64);
    });

    it('should throw for non-existent file', async () => {
      await expect(hashFileAsync('/nonexistent/file.txt')).rejects.toThrow('File not found');
    });

    it('should throw for directory', async () => {
      await expect(hashFileAsync(tempDir)).rejects.toThrow('Cannot hash directory');
    });

    it('should match sync hash', async () => {
      const filePath = path.join(tempDir, 'compare.txt');
      await fs.writeFile(filePath, 'comparison content');

      const syncHash = hashFile(filePath);
      const asyncHash = await hashFileAsync(filePath);

      expect(syncHash).toBe(asyncHash);
    });
  });

  describe('hashFilesMatchAsync', () => {
    it('should return true for identical files', async () => {
      const file1 = path.join(tempDir, 'match1.txt');
      const file2 = path.join(tempDir, 'match2.txt');
      await fs.writeFile(file1, 'same content');
      await fs.writeFile(file2, 'same content');

      const match = await hashFilesMatchAsync(file1, file2);
      expect(match).toBe(true);
    });

    it('should return false for different files', async () => {
      const file1 = path.join(tempDir, 'diff1.txt');
      const file2 = path.join(tempDir, 'diff2.txt');
      await fs.writeFile(file1, 'content 1');
      await fs.writeFile(file2, 'content 2');

      const match = await hashFilesMatchAsync(file1, file2);
      expect(match).toBe(false);
    });

    it('should return false for non-existent files', async () => {
      const match = await hashFilesMatchAsync('/nonexistent/1.txt', '/nonexistent/2.txt');
      expect(match).toBe(false);
    });
  });

  describe('hashFilesParallel', () => {
    it('should hash multiple files', async () => {
      const files = [];
      for (let i = 0; i < 5; i++) {
        const filePath = path.join(tempDir, `file${i}.txt`);
        await fs.writeFile(filePath, `content ${i}`);
        files.push(filePath);
      }

      const results = await hashFilesParallel(files);

      expect(results.size).toBe(5);
      for (const file of files) {
        expect(results.has(file)).toBe(true);
        expect(results.get(file).length).toBe(64);
      }
    });

    it('should call progress callback', async () => {
      const files = [];
      for (let i = 0; i < 3; i++) {
        const filePath = path.join(tempDir, `progress${i}.txt`);
        await fs.writeFile(filePath, `content ${i}`);
        files.push(filePath);
      }

      const progressCalls = [];
      await hashFilesParallel(files, 2, (current, total) => {
        progressCalls.push({ current, total });
      });

      expect(progressCalls.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      const files = [
        path.join(tempDir, 'exists.txt'),
        '/nonexistent/file.txt',
      ];
      await fs.writeFile(files[0], 'content');

      const results = await hashFilesParallel(files);

      expect(results.size).toBe(1);
      expect(results.has(files[0])).toBe(true);
    });
  });

  describe('getFileMetadata', () => {
    it('should return file metadata', async () => {
      const filePath = path.join(tempDir, 'metadata.txt');
      await fs.writeFile(filePath, 'metadata content');

      const metadata = getFileMetadata(filePath, tempDir);

      expect(metadata.path).toBe('metadata.txt');
      expect(metadata.hash).toMatch(/^sha256:/);
      expect(metadata.size).toBe(16);
      expect(metadata.isBinary).toBe(false);
    });

    it('should detect binary files', async () => {
      const filePath = path.join(tempDir, 'image.png');
      await fs.writeFile(filePath, Buffer.from([0x89, 0x50, 0x4E, 0x47]));

      const metadata = getFileMetadata(filePath, tempDir);

      expect(metadata.isBinary).toBe(true);
    });

    it('should use forward slashes in path', async () => {
      const subDir = path.join(tempDir, 'subdir');
      await fs.ensureDir(subDir);
      const filePath = path.join(subDir, 'nested.txt');
      await fs.writeFile(filePath, 'nested content');

      const metadata = getFileMetadata(filePath, tempDir);

      expect(metadata.path).toBe('subdir/nested.txt');
    });
  });
});
