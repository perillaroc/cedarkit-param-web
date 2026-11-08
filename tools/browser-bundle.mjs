/** Copy an accepted author export verbatim, or check the installed frozen group. */
import { readFile, mkdir, copyFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const pin = JSON.parse(await readFile(resolve(root, 'src/bundle-pin.json'), 'utf8'))
const target = resolve(root, 'public/reviewed')
const source = process.argv[2] ? resolve(process.argv[2]) : target
const hash = (data) => createHash('sha256').update(data).digest('hex')
const manifestBytes = await readFile(resolve(source, 'manifest.json'))
if (hash(manifestBytes) !== pin.sha256) throw Error('Manifest SHA256 does not match the accepted pin')
const manifest = JSON.parse(manifestBytes)
if (manifest.schema_version !== 1 || manifest.id !== pin.id || manifest.version !== pin.version) throw Error('Unexpected group/version')
const members = new Map([['manifest.json', manifestBytes]])
for (const file of manifest.files) {
  if (!/^[\w.-]+(?:\/[\w.-]+)*$/.test(file.path) || file.path.split('/').some((p) => p === '..' || p === '.')) throw Error('Invalid member path')
  const bytes = await readFile(resolve(source, file.path))
  if (bytes.length !== file.size || hash(bytes) !== file.sha256) throw Error(`Corrupt member: ${file.path}`)
  members.set(file.path, bytes)
}
if (source !== target) {
  // A frozen revision is immutable: only install into a new directory.
  await mkdir(target)
  for (const path of members.keys()) {
    await mkdir(dirname(resolve(target, path)), { recursive: true })
    await copyFile(resolve(source, path), resolve(target, path))
  }
}
async function walk(path, prefix = '') {
  const files = []
  for (const item of await readdir(path, { withFileTypes: true })) {
    const name = prefix + item.name
    if (item.isDirectory()) files.push(...await walk(resolve(path, item.name), name + '/'))
    else files.push(name)
  }
  return files
}
if (JSON.stringify((await walk(target)).sort()) !== JSON.stringify([...members.keys()].sort())) throw Error('Unexpected installed members')
console.log(JSON.stringify({ id: pin.id, version: pin.version, manifest_sha256: pin.sha256, files: members.size, status: 'verified' }))
