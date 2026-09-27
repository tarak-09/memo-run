import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import glob from 'fast-glob';

export async function computeHash(command: string[], inputGlob: string): Promise<string> {
    const hash = createHash('sha256');
    
    // Hash the command array first
    hash.update(JSON.stringify(command));
    
    // Find all files matching the glob
    const files = await glob(inputGlob, { onlyFiles: true, absolute: true });
    // Sort files to ensure stable hash
    files.sort();
    
    for (const file of files) {
        // Hash the relative path or absolute path to ensure changes in filename are detected
        hash.update(file);
        
        await new Promise<void>((resolve, reject) => {
            const stream = createReadStream(file);
            stream.on('data', chunk => hash.update(chunk));
            stream.on('error', reject);
            stream.on('end', () => resolve());
        });
    }
    
    return hash.digest('hex');
}
