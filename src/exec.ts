import { spawn } from 'node:child_process';
import { saveCache } from './cache.js';

export function runCommandAndCache(command: string[], hash: string): Promise<number | null> {
    return new Promise((resolve, reject) => {
        const [cmd, ...args] = command;
        if (!cmd) {
            reject(new Error('No command provided'));
            return;
        }

        const child = spawn(cmd, args, { 
            stdio: ['inherit', 'pipe', 'pipe'],
            shell: process.platform === 'win32'
        });
        
        let stdoutData = Buffer.alloc(0);
        let stderrData = Buffer.alloc(0);

        child.stdout.on('data', (chunk) => {
            stdoutData = Buffer.concat([stdoutData, chunk]);
            process.stdout.write(chunk);
        });

        child.stderr.on('data', (chunk) => {
            stderrData = Buffer.concat([stderrData, chunk]);
            process.stderr.write(chunk);
        });

        child.on('error', (err) => {
            reject(err);
        });

        child.on('close', async (code) => {
            try {
                await saveCache(hash, code, stdoutData, stderrData);
                resolve(code);
            } catch (err) {
                reject(err);
            }
        });
    });
}
