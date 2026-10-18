import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { computeHash } from '../src/hash.js';
import { checkCache, getCache, saveCache } from '../src/cache.js';
import { mkdir, rm, writeFile, stat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

describe('Hash and Cache Unit Tests', () => {
    const testDir = join(process.cwd(), 'test-data');
    const CACHE_DIR = '.cmd-cache';

    beforeEach(async () => {
        await mkdir(testDir, { recursive: true });
        await writeFile(join(testDir, 'file1.txt'), 'hello world');
        await writeFile(join(testDir, 'file2.txt'), 'test data');
        await rm(CACHE_DIR, { recursive: true, force: true });
    });

    afterEach(async () => {
        await rm(testDir, { recursive: true, force: true });
        await rm(CACHE_DIR, { recursive: true, force: true });
    });

    it('should compute consistent hashes for the same files and command', async () => {
        const hash1 = await computeHash(['echo', 'hello'], 'test-data/*.txt');
        const hash2 = await computeHash(['echo', 'hello'], 'test-data/*.txt');
        expect(hash1).toBe(hash2);
    });

    it('should compute different hashes for different commands', async () => {
        const hash1 = await computeHash(['echo', 'hello'], 'test-data/*.txt');
        const hash2 = await computeHash(['echo', 'world'], 'test-data/*.txt');
        expect(hash1).not.toBe(hash2);
    });

    it('should compute different hashes if file content changes', async () => {
        const hash1 = await computeHash(['echo', 'hello'], 'test-data/*.txt');
        await writeFile(join(testDir, 'file1.txt'), 'hello world updated');
        const hash2 = await computeHash(['echo', 'hello'], 'test-data/*.txt');
        expect(hash1).not.toBe(hash2);
    });

    it('should save and load cache entries successfully', async () => {
        const hash = 'dummyhash123';
        const stdout = Buffer.from('standard output');
        const stderr = Buffer.from('standard error');
        
        await saveCache(hash, 0, stdout, stderr);
        
        const exists = await checkCache(hash);
        expect(exists).toBe(true);

        const { entry, stdout: out, stderr: err } = await getCache(hash);
        expect(entry.exitCode).toBe(0);
        expect(out.toString()).toBe('standard output');
        expect(err.toString()).toBe('standard error');
    });

    it('should save and load cache entries with outputs', async () => {
        const hash = 'dummyhash456';
        const stdout = Buffer.from('standard output');
        const stderr = Buffer.from('standard error');
        
        await saveCache(hash, 0, stdout, stderr, 'test-data/*.txt');
        
        const exists = await checkCache(hash);
        expect(exists).toBe(true);

        // Delete the files to verify they are restored
        await rm(join(testDir, 'file1.txt'));
        await rm(join(testDir, 'file2.txt'));

        const { entry } = await getCache(hash);
        expect(entry.exitCode).toBe(0);
        expect(entry.outputs?.length).toBeGreaterThan(0);

        // Files should have been restored by getCache
        const content = await readFile(join(testDir, 'file1.txt'), 'utf-8');
        expect(content).toBe('hello world');
    });
});

describe('CLI End-to-End Tests', () => {
    const CACHE_DIR = '.cmd-cache';

    beforeEach(async () => {
        await writeFile('dummy.txt', 'test data');
        await rm(CACHE_DIR, { recursive: true, force: true });
        await rm('out.txt', { force: true });
    });

    afterEach(async () => {
        await rm('dummy.txt', { force: true });
        await rm(CACHE_DIR, { recursive: true, force: true });
        await rm('out.txt', { force: true });
    });

    it('should run a command and cache its output', () => {
        const result = spawnSync('node', ['dist/cli.js', '-i', 'dummy.txt', '--', 'node', '-e', 'console.log("e2e test")'], { encoding: 'utf-8' });
        expect(result.status).toBe(0);
        expect(result.stdout).toContain('e2e test');

        const secondRun = spawnSync('node', ['dist/cli.js', '-i', 'dummy.txt', '--', 'node', '-e', 'console.log("e2e test")'], { encoding: 'utf-8' });
        expect(secondRun.status).toBe(0);
        expect(secondRun.stdout).toContain('e2e test');
    });

    it('should require --inputs flag', () => {
        const result = spawnSync('node', ['dist/cli.js', '--', 'echo', 'hi'], { encoding: 'utf-8' });
        expect(result.status).toBe(1);
        expect(result.stderr).toContain('--inputs (-i) glob pattern is required');
    });

    it('should cache and restore outputs using --outputs flag', async () => {
        // Run a command that creates an output file
        const result = spawnSync('node', ['dist/cli.js', '-i', 'dummy.txt', '-o', 'out.txt', '--', 'node', '-e', 'require("fs").writeFileSync("out.txt", "cached output")'], { encoding: 'utf-8' });
        expect(result.status).toBe(0);

        // Verify the file was created
        const content1 = await readFile('out.txt', 'utf-8');
        expect(content1).toBe('cached output');

        // Delete the output file
        await rm('out.txt');

        // Run the command again, it should hit the cache and restore the file
        const secondRun = spawnSync('node', ['dist/cli.js', '-i', 'dummy.txt', '-o', 'out.txt', '--', 'node', '-e', 'require("fs").writeFileSync("out.txt", "cached output")'], { encoding: 'utf-8' });
        expect(secondRun.status).toBe(0);

        // Verify the file was restored
        const content2 = await readFile('out.txt', 'utf-8');
        expect(content2).toBe('cached output');
    });
});
