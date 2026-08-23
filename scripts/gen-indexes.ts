import { generateDirIndexes } from '../.vitepress/gen-dir-index.ts'

const SRC = '.content/toolkit'

const created = generateDirIndexes(SRC, ['node_modules', 'docs', 'path'])

console.log(`gen-indexes: created ${created.length} directory index(es)`)
for (const rel of created) console.log(`  ${rel}`)
