# Bun Migration Guide

This project has been migrated to use [Bun](https://bun.sh) as the primary runtime for all operations including:

- Package management
- Running the development server
- Building for production
- Running tests
- Type checking

## Prerequisites

Install Bun:

```bash
curl -fsSL https://bun.sh/install | bash
```

## Getting Started

### Install Dependencies

```bash
bun install
```

### Development

```bash
bun dev
```

### Build

```bash
bun run build
```

### Test

```bash
bun test
```

### Type Check

```bash
bun type-check
```

### Lint

```bash
bun lint
bun lint:fix  # Auto-fix issues
```

### Format

```bash
bun format
bun format:check
```

### CI Pipeline

```bash
bun ci  # Runs format:check, type-check, lint, and test
```

## Key Changes

1. **Package Manager**: Yarn → Bun
2. **Test Runner**: Jest → Bun's built-in test runner
3. **Scripts**: All scripts now use `bun` instead of `yarn`
4. **Lock File**: `yarn.lock` → `bun.lockb`
5. **CI/CD**: Updated GitHub Actions and GitLab CI to use Bun
6. **Dockerfile**: Now uses `oven/bun:1` base image

## Test Files

Test files have been updated to use Bun's test API:

```typescript
import { describe, expect, test } from "bun:test";

describe("MyComponent", () => {
	test("should work", () => {
		expect(true).toBe(true);
	});
});
```

## Configuration

- `bunfig.toml` - Bun configuration file
- `tsconfig.json` - Updated with Bun types
- No `jest.config.cjs` needed (removed)

## Benefits of Using Bun

- ⚡️ Significantly faster installation and execution
- 🔧 Built-in TypeScript support (no need for ts-node)
- 🧪 Native test runner with Jest-compatible API
- 📦 All-in-one toolkit (runtime, bundler, package manager)
- 🔄 Drop-in replacement for Node.js in most cases
