# cache-cmd

`cache-cmd` is a lightweight TypeScript CLI tool designed to radically speed up local development and CI pipelines by caching command outputs based on input file hashes.

## Why it exists

In modern web development, many commands (like linters, type checkers, or bundlers) produce identical outputs given identical inputs. Repeatedly executing these commands on unchanged source files wastes valuable time. `cache-cmd` solves this by calculating a composite SHA-256 hash of your command string and the contents of all input files matching a glob pattern. 
- **Cache Hit**: Replays the previously captured `stdout`, `stderr`, and exit code.
- **Cache Miss**: Spawns the underlying command, streams its output to your terminal, and saves the results in a local `.cmd-cache/` directory.

## Installation

You can clone this repository and install the dependencies:

```bash
git clone <repository>
cd project
npm install
npm run build
```

## Usage

```bash
node dist/cli.js -i <glob_pattern> -- <command>
```
Or if linked/installed globally:
```bash
cache-cmd -i "src/**/*.ts" -- tsc --noEmit
```

### Options
- `-i, --inputs`: A glob pattern of input files to hash against. The hash is deterministic based on the command, file names, and file contents.
- `--`: Separates the `cache-cmd` arguments from the command you want to execute. This is strictly required.

## Worked Example

Suppose you have a script that takes 5 seconds to run on `src/**/*.ts` files. 

1. **First Run (Cache Miss):**
```bash
$ node dist/cli.js -i "src/**/*.ts" -- npm run lint
# (Takes 5 seconds to run, output is printed, and saved to `.cmd-cache`)
```

2. **Second Run (Cache Hit):**
```bash
$ node dist/cli.js -i "src/**/*.ts" -- npm run lint
# (Outputs instantly! Replays stdout, stderr, and exit code directly from `.cmd-cache`)
```

If you modify any file matching `src/**/*.ts`, the hash changes, triggering a fresh cache miss and re-evaluating the underlying command.

## Running Tests

This project uses `vitest` for reliable, fast unit and integration testing.

```bash
# Run tests once
npm run test

# Run tests in watch mode
npm run test:watch
```

## Architecture

- Uses `fast-glob` to rapidly assemble the list of target files.
- Employs Node's built-in `node:crypto` streams for generating hashes of large files without reading them entirely into memory.
- Intercepts child process `stdio` efficiently via `pipe`.
