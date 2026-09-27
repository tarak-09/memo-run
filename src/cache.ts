import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

export interface CacheEntry {
    exitCode: number | null;
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
    
    return { entry, stdout, stderr };
}

export async function saveCache(hash: string, exitCode: number | null, stdout: Buffer, stderr: Buffer): Promise<void> {
    await mkdir(CACHE_DIR, { recursive: true });
    const entry: CacheEntry = { exitCode };
    
    await writeFile(join(CACHE_DIR, `${hash}.json`), JSON.stringify(entry));
    await writeFile(join(CACHE_DIR, `${hash}.stdout`), stdout);
    await writeFile(join(CACHE_DIR, `${hash}.stderr`), stderr);
}
