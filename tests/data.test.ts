import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildModel, filterEntries, legacyCandidates, loadModel } from '../src/data'
import accepted from '../src/bundle-pin.json'
import type { Manifest, ParamDoc } from '../src/types'

const root = resolve('public/reviewed')
const manifestBytes = readFileSync(resolve(root, 'manifest.json'))
const manifest: Manifest = JSON.parse(manifestBytes.toString())
const rawFiles = new Map(manifest.files.map((pin) => [pin.path, readFileSync(resolve(root, pin.path))]))
const files = new Map([...rawFiles].map(([path, bytes]) => [path, JSON.parse(bytes.toString())]))
const model = buildModel(manifest, files, accepted.sha256)
const get = (snapshot: string, id: string) => model.entries.find((e) => e.snapshot === snapshot && e.definition.parameter_id === id)!
const filters = { query: '', snapshot: null, dataset: null, backend: null, mapped: 'all' }
function altered(path: string, edit: (doc: ParamDoc) => void) {
  const copies = structuredClone(files)
  edit(copies.get(path))
  return copies
}
function mockFetch(replacements = new Map<string, string | Uint8Array>()) {
  const mock = vi.fn(async (url: string) => {
    const path = url.replace('/reviewed/', '')
    const bytes = replacements.get(path) ?? (path === 'manifest.json' ? manifestBytes : rawFiles.get(path))
    return bytes === undefined ? new Response('{}', { status: 404 }) : new Response(bytes as BodyInit)
  })
  vi.stubGlobal('fetch', mock)
  return mock
}
async function changedManifest(edit: (m: Manifest) => void) {
  const copy = structuredClone(manifest)
  edit(copy)
  const bytes = JSON.stringify(copy)
  mockFetch(new Map([['manifest.json', bytes]]))
  return loadModel('/reviewed/manifest.json', { ...accepted, sha256: createHash('sha256').update(bytes).digest('hex') })
}

afterEach(() => vi.unstubAllGlobals())

describe('accepted schema 4 group', () => {
  it('keeps all seven resource contexts, exact runtime pins and bounded global obligations', () => {
    expect(model.entries).toHaveLength(540)
    expect(model.stableIds).toBe(163)
    expect(model.mappingCount).toBe(1299)
    expect(model.manifest.dataset_bindings).toHaveLength(18)
    expect(new Set(model.entries.map((e) => e.key)).size).toBe(540)
    expect(model.manifest.scope.remaining_migration_obligations.find((o) => o.id === 'service-history')?.remaining).toBe(482)
    expect(model.manifest.scope.remaining_migration_obligations.find((o) => o.id === 'service-quality')?.remaining).toBe(485)
  })
  it('preserves the reviewed MESO-1KM PWAT scope, units, evidence and legacy targets', () => {
    const pwat = get('meso1', 'cedarkit.pwat')
    expect(pwat.unit).toBe('kg/m2')
    expect(pwat.lineage.map((p) => p.parameter_id)).toEqual(['cedarkit.pwat.any', 'cedarkit.pwat'])
    expect(pwat.fixedConditions).toEqual({ level_type: 'entire_atmosphere' })
    expect(pwat.mappings.map((m) => m.id).sort()).toEqual(['pwat.instantaneous.forecast', 'pwat.instantaneous.initial'])
    expect(pwat.mappings.every((m) => m.applies_to.dataset === 'cma_meso_1km' && m.applies_to.time === '2026-11-02T12:00:00Z')).toBe(true)
    expect(pwat.mappings.some((m) => m.evidence.some((e) => e.includes('task-n04a')))).toBe(true)
    const mappingResource = model.manifest.snapshots.find((s) => s.key === 'meso1')!
    expect(mappingResource.parameter_resource.version).toBe('9')
    expect(mappingResource.mapping_resources[0].version).toBe('12')
    const legacy = legacyCandidates(model, '0.1.3').find((c) => c.parameter_id === 'cedarkit.pwat')!
    expect(legacy.current_targets.some((t) => t.snapshot === 'meso1')).toBe(true)
    expect(model.manifest.scope.remaining_migration_obligations.find((o) => o.id === 'native-definition-gaps')?.groups).toEqual({ '06J': 95, '06K': 48 })
  })
  it('preserves the bounded GFS service NLHF energy definition and its independent resource scope', () => {
    const service = get('cmadaas', 'cedarkit.slhf')
    const native = get('gfs', 'cedarkit.slhf')
    expect(service.key).not.toBe(native.key)
    expect(service.unit).toBe('J/m2')
    expect(service.fixedConditions).toEqual({ level_type: 'surface', statistics: { operation: 'accumulation', over: 'time', period: { kind: 'since_initialization' } } })
    expect(service.mappings.map((m) => m.id).sort()).toEqual(['S-gfs-ana.slhf.energy.since-initialization', 'S-gfs-fcst.slhf.energy.since-initialization'])
    expect(service.mappings.every((m) => m.when?.time === '2026-11-02T12:00:00Z')).toBe(true)
    expect(service.mappings.find((m) => m.applies_to.product === 'analysis')?.when?.step).toEqual(['PT0H'])
    expect(service.mappings.find((m) => m.applies_to.product === 'forecast')?.when?.step).toEqual(['PT3H', 'PT6H', 'PT48H'])
    expect(service.mappings.every((m) => m.evidence.some((e) => e.includes('task-n06-01/results/scientific.json')))).toBe(true)
    expect(legacyCandidates(model, '0.0.10').find((c) => c.parameter_id === 'cedarkit.slhf')?.current_targets.some((t) => t.snapshot === 'cmadaas')).toBe(true)
  })
  it('inherits only within one resource while retaining original local definitions and parent constraints', () => {
    const t2m = get('gfs', 'cedarkit.t2m')
    expect(t2m.unit).toBe('K')
    expect(t2m.definition.unit).toBeUndefined()
    expect(t2m.lineage.map((p) => p.parameter_id)).toEqual(['cedarkit.t', 'cedarkit.t2m'])
    expect(t2m.fixedConditions).toEqual({ level: 2, level_type: 'height_above_ground', level_unit: 'm' })
    expect(t2m.mappings.every((m) => m.applies_to.dataset === 'cma_gfs_gmf')).toBe(true)
    expect(t2m.mappings[0].resource.sha256).toMatch(/^[a-f0-9]{64}$/)
  })
  it('preserves conflicting local definitions instead of merging by stable ID', () => {
    const definitions = model.entries.filter((e) => e.definition.parameter_id === 'cedarkit.t2m')
    expect(definitions).toHaveLength(7)
    expect(new Set(definitions.map((e) => JSON.stringify(e.definition))).size).toBeGreaterThan(1)
    expect(new Set(definitions.map((e) => e.resource.id)).size).toBe(7)
  })
  it('keeps family definitions without claiming direct execution', () => {
    const direct = new Set(model.entries.filter((e) => e.mappings.length).map((e) => e.definition.parameter_id))
    expect(direct.size).toBe(119)
    expect(model.entries.some((e) => e.mappings.length === 0)).toBe(true)
    expect(filterEntries(model.entries, { ...filters, mapped: 'without' }).every((e) => !e.mappings.length)).toBe(true)
  })
  it('searches stable IDs, aliases, descriptions, scientific conditions, backend, evidence and triplets', () => {
    for (const query of ['cedarkit.t2m', '2米温度', 'height_above_ground', '0.0.0', 'TEM', 'round-36']) {
      expect(filterEntries(model.entries, { ...filters, query }).length, query).toBeGreaterThan(0)
    }
    const withAlias = model.entries.find((e) => e.aliases.length)!
    expect(filterEntries([withAlias], { ...filters, query: withAlias.aliases[0] })).toEqual([withAlias])
  })
  it('filters the actual dataset/backend applicability on the same mapping', () => {
    const result = filterEntries(model.entries, { ...filters, dataset: 'cma_gfs_gmf', backend: 'grib2' })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((e) => e.snapshot === 'gfs')).toBe(true)
    expect(filterEntries(model.entries, { ...filters, dataset: 'cma_gfs_gmf', backend: 'cmadaas' })).toEqual([])
    expect(filterEntries(model.entries, { ...filters, snapshot: 'gfs' })).toHaveLength(119)
  })
  it('keeps ambiguous historical identities and historical_only without retiring them', () => {
    const candidates = legacyCandidates(model, '0.0.0')
    expect(candidates.length).toBeGreaterThan(1)
    expect(candidates.find((c) => c.parameter_id === 'cedarkit.t2m')?.current_targets).toHaveLength(7)
    const old = legacyCandidates(model, '0.0.4').find((c) => c.parameter_id === 'cedarkit.mx2t')!
    expect(old.historical_only).toBe(true)
    expect(old.current_targets).toEqual([])
    const historical = new Set(model.legacy.links.flatMap((l) => l.candidates.filter((c) => c.historical_only).map((c) => c.parameter_id)))
    expect(historical.size).toBe(91)
    expect(legacyCandidates(model, '999.999.999')).toEqual([])
  })
})

describe('semantic acceptance', () => {
  it('rejects unsupported snapshot format', () => {
    expect(() => buildModel(manifest, altered('browser/gfs/params.json', (d) => d.meta.schema_version = 3), accepted.sha256)).toThrow(/schema_version/)
  })
  it('rejects changed browser definitions even when metadata counts are unchanged', () => {
    expect(() => buildModel(manifest, altered('browser/gfs/params.json', (d) => d.parameters[0].name = 'wrong'), accepted.sha256)).toThrow(/定义与运行资源/)
  })
  it('rejects changed mapping applicability', () => {
    expect(() => buildModel(manifest, altered('browser/gfs/params.json', (d) => d.mapping_resources[0].mappings[0].applies_to.dataset = 'other'), accepted.sha256)).toThrow(/映射与运行资源/)
  })
  it('preserves declared condition array order while normalizing table identity order', () => {
    expect(() => buildModel(manifest, altered('browser/gfs/params.json', (d) => {
      const match = d.mapping_resources[0].mappings.find((m) => m.id === 'st-10-40.operational.instantaneous')!.native.match as Record<string, unknown>
      match.localTablesVersion = [1, 0]
    }), accepted.sha256)).toThrow(/映射与运行资源/)
  })
  it('rejects metadata totals and cross-resource scope changes', () => {
    expect(() => buildModel(manifest, altered('browser/gfs/params.json', (d) => d.meta.stats.parameters++), accepted.sha256)).toThrow(/meta.stats/)
    expect(() => buildModel(manifest, altered('browser/gfs/params.json', (d) => d.meta.scope.remaining_migration_obligations[0].remaining = 1), accepted.sha256)).toThrow(/全局义务/)
  })
  it('rejects mismatched dataset resource bindings', () => {
    const copy = structuredClone(manifest)
    copy.dataset_bindings[0].parameter_registry.sha256 = '0'.repeat(64)
    expect(() => buildModel(copy, files, accepted.sha256)).toThrow(/dataset 参数绑定/)
  })
  it('rejects legacy links that claim a historical identity is current', () => {
    const copy = structuredClone(files)
    copy.get('legacy-links.json').links.find((l: { triplet: string }) => l.triplet === '0.0.4').candidates[0].historical_only = false
    expect(() => buildModel(manifest, copy, accepted.sha256)).toThrow(/historical_only/)
  })
})

describe('byte-verified group loading', () => {
  it('loads the exact frozen manifest and every member from the manifest directory', async () => {
    const mock = mockFetch()
    const loaded = await loadModel('/reviewed/manifest.json')
    expect(loaded.entries).toHaveLength(540)
    expect(loaded.manifestSha256).toBe(accepted.sha256)
    expect(mock).toHaveBeenCalledTimes(24)
    expect(mock).toHaveBeenCalledWith('/reviewed/resources/current-gfs-parameters.json')
  })
  it('rejects a manifest digest mismatch before loading any members', async () => {
    const mock = mockFetch(new Map([['manifest.json', '{}']]))
    await expect(loadModel('/reviewed/manifest.json')).rejects.toThrow(/manifest SHA256/)
    expect(mock).toHaveBeenCalledTimes(1)
  })
  it('rejects incompatible manifest format and group version', async () => {
    await expect(changedManifest((m) => m.schema_version = 2)).rejects.toThrow(/schema_version/)
    await expect(changedManifest((m) => m.version = '999')).rejects.toThrow(/内容版本/)
  })
  it('rejects path traversal and duplicate group members', async () => {
    await expect(changedManifest((m) => m.files[0].path = '../params.json')).rejects.toThrow(/组内路径/)
    await expect(changedManifest((m) => m.files.push(m.files[0]))).rejects.toThrow(/重复 ID/)
  })
  it('rejects truncated files', async () => {
    mockFetch(new Map([['resources/current-gfs-parameters.json', '{}']]))
    await expect(loadModel('/reviewed/manifest.json')).rejects.toThrow(/文件大小/)
  })
  it('rejects same-size runtime byte changes instead of hashing browser projections', async () => {
    const original = rawFiles.get('resources/current-gfs-parameters.json')!.toString()
    mockFetch(new Map([['resources/current-gfs-parameters.json', original.replace('Temperature', 'Xemperature')]]))
    await expect(loadModel('/reviewed/manifest.json')).rejects.toThrow(/SHA256/)
  })
  it('reports HTTP and JSON errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })))
    await expect(loadModel()).rejects.toThrow(/HTTP 503/)
    mockFetch(new Map([['manifest.json', '{']]))
    await expect(loadModel('/reviewed/manifest.json', { ...accepted, sha256: createHash('sha256').update('{').digest('hex') })).rejects.toThrow(/不是有效的 JSON/)
  })
})
