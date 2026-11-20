// Compiles resources/engine/keyhelper.cs into keyhelper.exe using the
// C# compiler that ships with the .NET Framework on Windows.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'resources', 'engine', 'keyhelper.cs')
const out = path.join(root, 'resources', 'engine', 'keyhelper.exe')

const windir = process.env.WINDIR || 'C:\\Windows'
const csc = [
  path.join(windir, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
  path.join(windir, 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe')
].find((p) => fs.existsSync(p))

if (!csc) {
  console.error('csc.exe not found. keyhelper can only be built on Windows with .NET Framework 4.')
  process.exit(1)
}

execFileSync(csc, ['/nologo', '/optimize+', '/target:winexe', `/out:${out}`, src], { stdio: 'inherit' })
console.log(`Built ${path.relative(root, out)}`)
