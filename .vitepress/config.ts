import { defineConfig } from 'vitepress'
import { vPreExceptLanding } from './vpre'

export default defineConfig({
  title: 'Mobile Engineering Agents',
  description: 'Turn your AI coding agent into a Senior mobile engineer.',
  srcDir: './.content/toolkit',
  srcExclude: [
    'node_modules/**',
    'docs/**',
    '.github/**',
    '.superpowers/**',
    'path/**',
    'CONTRIBUTING.md',
    'CODEOWNERS'
  ],
  // Default outDir resolves to .vitepress/dist; this repo's contract (and Step 11's
  // route-count check) expects top-level dist/, so pin it explicitly.
  outDir: 'dist',
  cleanUrls: true,
  markdown: {
    config: vPreExceptLanding
  },
  // Temporary: directory links like [agents/](agents/) cannot resolve until Task 3
  // lands the README.md -> index.md rewrites. Task 3 flips this back to false.
  ignoreDeadLinks: true,
})
