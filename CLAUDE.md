# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VFX-JS is a monorepo containing WebGL visual effects libraries for web development. The core library (@vfx-js/core) provides WebGL-powered effects that can be easily attached to HTML elements, with React bindings available via @vfx-js/react.

## Architecture

This is a Turborepo monorepo with the following key packages:
- `packages/vfx-js/` - Core VFX library (@vfx-js/core) built with Three.js
- `packages/react/` - React bindings (@vfx-js/react)
- `packages/react-vfx/` - Backward-compat wrapper re-exporting @vfx-js/react
- `packages/docs/` - Documentation website and demos
- `packages/storybook/` - Component stories and visual tests
- `packages/effects/` - Additional effect implementations
- `packages/docs-react/` - React-specific documentation

The core library uses Three.js for WebGL rendering and provides a VFX class that manages effects applied to DOM elements. Effects are shader-based and can be configured with various parameters including uniforms, overflow settings, and timing controls.

## Common Commands

### Development
- `pnpm run dev` - Start development mode for all packages (uses Turborepo TUI)
- `pnpm run build` - Build all packages
- `pnpm run clean` - Clean build artifacts across all packages
- `pnpm run lint` - Run linting across all packages

### Testing
- `pnpm test` - Run tests (specifically for @vfx-js/core package)
- `pnpm --filter @vfx-js/core run test:watch` - Run tests in watch mode

### Package-specific Development
- `pnpm --filter @vfx-js/core run dev` - Develop core library only
- `pnpm --filter @vfx-js/react run dev` - Develop React bindings only
- `pnpm --filter docs run dev` - Develop documentation site

### Linting and Formatting
- Uses Biome for linting and formatting
- Individual packages: `pnpm --filter <package> run lint`
- Format code: `pnpm --filter <package> run format`

### Release Process
- `pnpm run prepare-release` - Prepare a new release (changeset + build + lint + test + version)
- `pnpm run release` - Publish packages to npm

## Development Notes

### Code Style
- Uses Biome for consistent formatting (4-space indentation)
- TypeScript throughout with dual ESM/CJS builds
- Three.js is the primary WebGL framework dependency

### Build System
- Turborepo manages the monorepo builds and caching
- Each package builds to both ESM and CJS formats
- Documentation is auto-generated with TypeDoc for the core package

### Testing
- Core package uses Vitest for testing
- Test files are located alongside source files with `.test.ts` extension
- Run package-specific tests: `pnpm --filter @vfx-js/core run test`