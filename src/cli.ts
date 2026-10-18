#!/usr/bin/env node
import { computeHash } from './hash.js';
import { checkCache, getCache } from './cache.js';
import { runCommandAndCache } from './exec.js';

async function main() {
    const args = process.argv.slice(2);
    const dashDashIndex = args.indexOf('--');
    
    if (dashDashIndex === -1) {
        console.error("Error: You must use '--' to separate cache-cmd options from the command to run.");
        console.error("Usage: cache-cmd -i \"src/**/*.ts\" -o \"dist/**/*.js\" -- tsc");
        process.exit(1);
    }

    const cacheArgs = args.slice(0, dashDashIndex);
    const command = args.slice(dashDashIndex + 1);

    let inputs = '';
    let outputs = '';
    for (let i = 0; i < cacheArgs.length; i++) {
        if (cacheArgs[i] === '-i' || cacheArgs[i] === '--inputs') {
            inputs = cacheArgs[i + 1];
            i++;
        } else if (cacheArgs[i] === '-o' || cacheArgs[i] === '--outputs') {
            outputs = cacheArgs[i + 1];
            i++;
        }
    }

    if (!inputs) {
        console.error("Error: --inputs (-i) glob pattern is required.");
        console.error("Usage: cache-cmd -i \"src/**/*.ts\" -o \"dist/**/*.js\" -- tsc");
        process.exit(1);
    }

    if (command.length === 0) {
        console.error("Error: No command provided to run.");
        process.exit(1);
    }

    try {
        const hash = await computeHash(command, inputs);
        
        if (await checkCache(hash)) {
            const { entry, stdout, stderr } = await getCache(hash);
            process.stdout.write(stdout);
            process.stderr.write(stderr);
            if (entry.exitCode !== null) {
                process.exit(entry.exitCode);
            }
        } else {
            const code = await runCommandAndCache(command, hash, outputs);
            if (code !== null) {
                process.exit(code);
            }
        }
    } catch (err) {
        console.error("Cache command failed:", err);
        process.exit(1);
    }
}

main();
