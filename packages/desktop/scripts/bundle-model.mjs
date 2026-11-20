/**
 * Bundles the GLiNER2-PII model weights and worker into packages/desktop/resources/
 * for zero-dependency, self-contained desktop packaging.
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const targetDir = path.resolve(__dirname, '../resources/models/gliner2-pii')
const userHome = os.homedir()
const hfSnapshotDir = path.join(
  userHome,
  '.cache',
  'huggingface',
  'hub',
  'models--fastino--gliner2-privacy-filter-PII-multi',
  'snapshots',
  '1cb4166094dc58fa8d836429f060d6c95f62b495'
)

console.log('Target GLiNER2 packaging directory:', targetDir)
console.log('Source Hugging Face snapshot directory:', hfSnapshotDir)

if (!fs.existsSync(hfSnapshotDir)) {
  console.warn('Source GLiNER2 model snapshot not found at', hfSnapshotDir)
  process.exit(0)
}

fs.mkdirSync(targetDir, { recursive: true })

// Copy all snapshot files
function copyRecursive(src, dest) {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true })
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child))
    }
  } else {
    // Skip markdown files to maintain repository single markdown document policy
    if (path.basename(src).toLowerCase().endsWith('.md')) {
      return
    }
    if (!fs.existsSync(dest) || fs.statSync(dest).size !== stat.size) {
      console.log(`Copying ${path.basename(src)} (${(stat.size / (1024 * 1024)).toFixed(1)} MB)...`)
      fs.copyFileSync(src, dest)
    }
  }
}

copyRecursive(hfSnapshotDir, targetDir)

const info = {
  model: 'fastino/gliner2-privacy-filter-PII-multi',
  bundledAt: new Date().toISOString(),
  architecture: 'gliner2-pii',
  entityCount: 42
}
fs.writeFileSync(path.join(targetDir, 'info.json'), JSON.stringify(info, null, 2), 'utf8')

console.log(`Successfully bundled GLiNER2-PII model files.`)
