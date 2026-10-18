import { mkdir, readFile, writeFile, stat, copyFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import glob from 'fast-glob';

export interface CacheEntry {
    exitCode: number | null;
    outputs?: string[];
}

const CACHE_DIR = '.cmd-cache';

export async function checkCache(hash: string): Promise<boolean> {
    try {
        await stat(join(CACHE_DIR, `${hash}.json`));
        return true;
    } catch {
        return false;
    }
}

export async function getCache(hash: string): Promise<{ entry: CacheEntry, stdout: Buffer, stderr: Buffer }> {
    const entryData = await readFile(join(CACHE_DIR, `${hash}.json`), 'utf-8');
    const entry = JSON.parse(entryData) as CacheEntry;
    
    const stdout = await readFile(join(CACHE_DIR, `${hash}.stdout`));
    const stderr = await readFile(join(CACHE_DIR, `${hash}.stderr`));
    
    if (entry.outputs && entry.outputs.length > 0) {
        for (const file of entry.outputs) {
            const cachedFilePath = join(CACHE_DIR, `${hash}-out`, file);
            await mkdir(dirname(file), { recursive: true });
            await copyFile(cachedFilePath, file);
        }
    }

    return { entry, stdout, stderr };
}

export async function saveCache(hash: string, exitCode: number | null, stdout: Buffer, stderr: Buffer, outputsGlob?: string): Promise<void> {
    await mkdir(CACHE_DIR, { recursive: true });
    
    const entry: CacheEntry = { exitCode };

    if (exitCode === 0 && outputsGlob) {
        const files = await glob(outputsGlob, { onlyFiles: true });
        entry.outputs = files;
        for (const file of files) {
            const dest = join(CACHE_DIR, `${hash}-out`, file);
            await mkdir(dirname(dest), { recursive: true });
            await copyFile(file, dest);
        }
    }

    await writeFile(join(CACHE_DIR, `${hash}.json`), JSON.stringify(entry));
    await writeFile(join(CACHE_DIR, `${hash}.stdout`), stdout);
    await writeFile(join(CACHE_DIR, `${hash}.stderr`), stderr);
}
