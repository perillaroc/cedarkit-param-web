import acceptedGroup from './bundle-pin.json'
import type { Entry, FilePin, LegacyIndex, Manifest, MappingResource, Parameter, ParamDoc, ResourcePin, SiteModel } from './types'

export const SUPPORTED_SCHEMA_VERSION = 4
export const scopedKey = (resource: string, parameter: string) => `${resource}/${parameter}`
export const pretty = (value: unknown) => JSON.stringify(value, null, 2)

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

/** Object order and the declared alias/evidence set order do not change meaning. */
function normalized(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) {
    const items = value.map((item) => normalized(item))
    return ['aliases', 'evidence'].includes(key) ? items.sort() : items
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, normalized(v, k)]))
  }
  return value
}
const equal = (a: unknown, b: unknown) => JSON.stringify(normalized(a)) === JSON.stringify(normalized(b))
const sameSet = (a: string[], b: string[]) => equal([...a].sort(), [...b].sort())

/** Exporter sorts identity-indexed tables/rows; conditions and translation arrays retain order. */
function mappingProjection(resource: MappingResource) {
  return { ...resource,
    mappings: [...resource.mappings].sort((a, b) => a.id.localeCompare(b.id)),
    tables: [...(resource.tables ?? [])].map((value) => {
      const table = value as { id: string; rows: Array<{ id: string }> }
      return { ...table, rows: [...table.rows].sort((a, b) => a.id.localeCompare(b.id)) }
    }).sort((a, b) => a.id.localeCompare(b.id)),
  }
}

function unique(ids: string[], label: string) {
  check(ids.every((id) => typeof id === 'string' && id.length > 0) && new Set(ids).size === ids.length, `${label} 包含无效或重复 ID`)
}

export async function sha256(bytes: ArrayBuffer): Promise<string> {
  check(globalThis.crypto?.subtle, '此站点需要 HTTPS 或 localhost 来校验快照摘要')
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function parse(bytes: ArrayBuffer, label: string): unknown {
  try { return JSON.parse(new TextDecoder().decode(bytes)) }
  catch { throw new Error(`${label} 不是有效的 JSON`) }
}

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url)
  check(response.ok, `加载 ${url} 失败：HTTP ${response.status}`)
  return response.arrayBuffer()
}

function safePath(path: string) {
  check(typeof path === 'string' && /^[\w.-]+(?:\/[\w.-]+)*$/.test(path) &&
    !path.split('/').some((part) => part === '.' || part === '..'), `无效的组内路径：${path}`)
}

function resourceMatch(value: { api_version: string; id: string; version: string }, pin: ResourcePin) {
  check(value.api_version === pin.api_version && value.id === pin.id && value.version === pin.version, `资源版本或身份不符：${pin.path}`)
}

/** Build only after every member has passed its byte-size/digest check. */
export function buildModel(manifest: Manifest, files: Map<string, unknown>, manifestSha256: string): SiteModel {
  check(manifest.schema_version === 1, 'manifest schema_version 不兼容')
  unique(manifest.snapshots.map((s) => s.key), 'snapshot')
  unique(manifest.snapshots.map((s) => s.parameter_resource.id), 'parameter resource')
  const get = <T>(path: string): T => {
    check(files.has(path), `缺少组成员：${path}`)
    return files.get(path) as T
  }
  const pinFile = (pin: FilePin) => {
    check(manifest.files.some((file) => equal(file, { path: pin.path, size: pin.size, sha256: pin.sha256 })), `资源 pin 不属于 manifest：${pin.path}`)
  }
  pinFile(manifest.catalog)
  const catalog = get<{ api_version: string; id: string; version: string; datasets: Array<{
    id: string; parameter_registry: { version: string; sha256: string }
    mappings: Record<string, { version: string; sha256: string }>; products: Array<{ id: string; version: string }>
  }> }>(manifest.catalog.path)
  resourceMatch(catalog, manifest.catalog)
  check(manifest.scope.complete_product_coverage === false, '不得声明全产品覆盖')
  const entries: Entry[] = []
  for (const snapshot of manifest.snapshots) {
    check(snapshot.schema_version === SUPPORTED_SCHEMA_VERSION, `${snapshot.key} schema_version 不兼容`)
    const doc = get<ParamDoc>(snapshot.path)
    check(doc.meta?.schema_version === SUPPORTED_SCHEMA_VERSION, `${snapshot.path} schema_version 不兼容`)
    pinFile(snapshot.parameter_resource)
    resourceMatch(doc.meta.parameter_resource, snapshot.parameter_resource)
    check(doc.meta.parameter_resource.sha256 === snapshot.parameter_resource.sha256, '浏览器参数资源摘要不符')
    const runtime = get<{ api_version: string; id: string; version: string; parameters: Parameter[] }>(snapshot.parameter_resource.path)
    resourceMatch(runtime, snapshot.parameter_resource)
    unique(doc.parameters.map((p) => p.parameter_id), snapshot.key)
    check(equal([...doc.parameters].sort((a, b) => a.parameter_id.localeCompare(b.parameter_id)),
      [...runtime.parameters].sort((a, b) => a.parameter_id.localeCompare(b.parameter_id))), '浏览器定义与运行资源不符')
    check(equal(doc.meta.scope.remaining_migration_obligations, manifest.scope.remaining_migration_obligations) &&
      equal(doc.meta.scope.evidence_status, manifest.scope.evidence_status) && doc.meta.scope.complete_product_coverage === false, '证据状态或全局义务不一致')
    check(sameSet(doc.meta.scope.dataset_ids, snapshot.dataset_ids) &&
      sameSet(doc.meta.scope.parameter_ids, doc.parameters.map((p) => p.parameter_id)) &&
      sameSet(doc.meta.scope.mapping_resource_ids, snapshot.mapping_resources.map((r) => r.id)), '快照作用域不一致')
    const definitions = new Map(doc.parameters.map((p) => [p.parameter_id, p]))
    const allMappings: Entry['mappings'] = []
    check(doc.mapping_resources.length === snapshot.mapping_resources.length, '映射资源数不一致')
    for (const pin of snapshot.mapping_resources) {
      pinFile(pin)
      const resource = doc.mapping_resources.find((r) => r.id === pin.id)
      check(resource, `缺少映射资源：${pin.id}`)
      resourceMatch(resource, pin)
      const original = get<typeof resource>(pin.path)
      resourceMatch(original, pin)
      check(resource.backend === pin.backend && equal(mappingProjection(resource), mappingProjection(original)), '浏览器映射与运行资源不符')
      unique(resource.mappings.map((m) => m.id), resource.id)
      for (const mapping of resource.mappings) {
        check(definitions.has(mapping.parameter_id) && mapping.backend === resource.backend &&
          Array.isArray(mapping.evidence) && mapping.evidence.length > 0 && mapping.native &&
          snapshot.dataset_ids.includes(String(mapping.applies_to?.dataset)), `无效映射引用：${mapping.id}`)
        allMappings.push({ ...mapping, resource: pin, tables: resource.tables ?? [] })
      }
    }
    check(sameSet(doc.meta.scope.requested_parameter_ids, [...new Set(allMappings.map((m) => m.parameter_id))]), '直接映射参数范围不一致')
    check(doc.meta.stats.parameters === doc.parameters.length && doc.meta.stats.mappings === allMappings.length &&
      doc.meta.stats.aliases === doc.parameters.reduce((count, p) => count + (p.aliases?.length ?? 0), 0), 'meta.stats 与数据不一致')
    for (const parameter of doc.parameters) {
      const lineage: Parameter[] = []
      const seen = new Set<string>()
      let current: Parameter | undefined = parameter
      while (current) {
        check(!seen.has(current.parameter_id), `参数 parent 成环：${parameter.parameter_id}`)
        seen.add(current.parameter_id)
        lineage.unshift(current)
        if (!current.parent) break
        const parent: Parameter | undefined = definitions.get(current.parent)
        check(parent, `缺少 parent：${current.parent}`)
        current = parent
      }
      const effective = Object.assign({}, ...lineage) as Parameter
      const fixedConditions = Object.assign({}, ...lineage.map((p) => p.fixed_conditions ?? {}))
      const aliases = [...new Set(lineage.flatMap((p) => p.aliases ?? []))]
      const mappings = allMappings.filter((m) => m.parameter_id === parameter.parameter_id)
      const triplets = [...new Set(mappings.flatMap((m) => {
        const match = m.native.match as Record<string, unknown> | undefined
        const values = [match?.discipline, match?.parameterCategory, match?.parameterNumber]
        return values.every(Number.isInteger) ? [values.join('.')] : []
      }))].sort()
      const datasets = [...new Set(mappings.map((m) => String(m.applies_to.dataset)))].sort()
      entries.push({ key: scopedKey(snapshot.parameter_resource.id, parameter.parameter_id), snapshot: snapshot.key,
        resource: snapshot.parameter_resource, definition: parameter, lineage,
        unit: effective.unit, description: effective.description, descriptionCn: effective.description_cn,
        aliases, fixedConditions, mappings, triplets, datasets,
        searchText: [snapshot.key, snapshot.parameter_resource.id, ...lineage.map((p) => JSON.stringify(p)),
          JSON.stringify(mappings), ...triplets].join(' ').toLowerCase() })
    }
  }
  unique(manifest.dataset_bindings.map((b) => b.dataset_id), 'dataset binding')
  for (const binding of manifest.dataset_bindings) {
    const snapshot = manifest.snapshots.find((s) => s.key === binding.snapshot)
    const dataset = catalog.datasets.find((d) => d.id === binding.dataset_id)
    check(snapshot && dataset && snapshot.dataset_ids.includes(binding.dataset_id) &&
      equal(binding.parameter_registry, snapshot.parameter_resource) &&
      dataset.parameter_registry.version === binding.parameter_registry.version &&
      dataset.parameter_registry.sha256 === binding.parameter_registry.sha256, `dataset 参数绑定不符：${binding.dataset_id}`)
    check(sameSet(Object.keys(binding.mappings), snapshot.mapping_resources.map((r) => r.backend!)), 'dataset backend 不一致')
    for (const [backend, pin] of Object.entries(binding.mappings)) {
      check(snapshot.mapping_resources.some((r) => equal(r, pin)) && dataset.mappings[backend]?.sha256 === pin.sha256 &&
        dataset.mappings[backend]?.version === pin.version, `dataset 映射绑定不符：${binding.dataset_id}`)
    }
    check(equal(binding.products, dataset.products.map(({ id, version }) => ({ id, version }))), 'dataset 产品版本不符')
  }
  for (const snapshot of manifest.snapshots) {
    check(sameSet(snapshot.dataset_ids, manifest.dataset_bindings.filter((b) => b.snapshot === snapshot.key).map((b) => b.dataset_id)), 'dataset 绑定不完整')
  }
  for (const entry of entries) for (const mapping of entry.mappings) {
    const binding = manifest.dataset_bindings.find((b) => b.dataset_id === mapping.applies_to.dataset)
    check(binding?.products.some((p) => p.id === mapping.applies_to.product && p.version === mapping.applies_to.product_version), `映射产品适用域无效：${mapping.id}`)
  }
  const legacy = get<LegacyIndex>('legacy-links.json')
  check(legacy.schema_version === 1 && legacy.scope.current_support === false &&
    legacy.scope.purpose === 'historical_navigation_only', 'legacy schema_version 或作用域不兼容')
  unique(legacy.links.map((l) => l.triplet), 'legacy triplet')
  for (const link of legacy.links) {
    check(/^\d+\.\d+\.\d+$/.test(link.triplet), '无效历史三元组')
    unique(link.candidates.map((c) => c.parameter_id), 'legacy candidate')
    for (const candidate of link.candidates) {
      const targets = entries.filter((e) => e.definition.parameter_id === candidate.parameter_id)
      check(candidate.historical_only === (targets.length === 0) && candidate.current_targets.length === targets.length, 'historical_only 状态或目标数不符')
      unique(candidate.current_targets.map((t) => t.snapshot), 'legacy target')
      for (const target of candidate.current_targets) {
        check(targets.some((e) => e.resource.id === target.parameter_resource_id && e.snapshot === target.snapshot) &&
          manifest.snapshots.some((s) => s.key === target.snapshot && s.path === target.path), '历史导航目标不符')
      }
    }
  }
  return { manifest, manifestSha256, entries, legacy,
    stableIds: new Set(entries.map((e) => e.definition.parameter_id)).size,
    mappingCount: entries.reduce((count, e) => count + e.mappings.length, 0) }
}

/** All relative paths inside a group resolve against the accepted manifest directory. */
export async function loadModel(url = './reviewed/manifest.json', accepted = acceptedGroup): Promise<SiteModel> {
  const manifestBytes = await fetchBytes(url)
  const digest = await sha256(manifestBytes)
  check(digest === accepted.sha256, 'manifest SHA256 不符，请核对已冻结的交付快照')
  const manifest = parse(manifestBytes, url) as Manifest
  check(manifest.schema_version === 1, 'manifest schema_version 不兼容')
  check(manifest.id === accepted.id && manifest.version === accepted.version, '快照组 ID 或内容版本不兼容')
  check(Array.isArray(manifest.files) && manifest.files.length > 0, 'manifest files 无效')
  unique(manifest.files.map((f) => f.path), 'file')
  const base = url.slice(0, url.lastIndexOf('/') + 1)
  const files = new Map<string, unknown>(await Promise.all(manifest.files.map(async (pin) => {
    safePath(pin.path)
    const bytes = await fetchBytes(base + pin.path)
    check(bytes.byteLength === pin.size, `${pin.path} 文件大小不符`)
    check(await sha256(bytes) === pin.sha256, `${pin.path} SHA256 不符`)
    return [pin.path, parse(bytes, pin.path)] as [string, unknown]
  })))
  return buildModel(manifest, files, digest)
}

/** Search/filter against one applicable mapping; a family without direct mappings stays visible. */
export function filterEntries(entries: Entry[], filters: { query: string; snapshot: string | null; dataset: string | null; backend: string | null; mapped: string }): Entry[] {
  const query = filters.query.trim().toLowerCase()
  return entries.filter((e) => (!filters.snapshot || e.snapshot === filters.snapshot) &&
    (!query || e.searchText.includes(query)) &&
    (filters.mapped === 'all' || (filters.mapped === 'with' ? e.mappings.length > 0 : e.mappings.length === 0)) &&
    ((!filters.dataset && !filters.backend) || e.mappings.some((m) =>
      (!filters.dataset || m.applies_to.dataset === filters.dataset) && (!filters.backend || m.backend === filters.backend))))
}

export function legacyCandidates(model: SiteModel, triplet: string) {
  const candidates = new Map((model.legacy.links.find((link) => link.triplet === triplet)?.candidates ?? [])
    .map((candidate) => [candidate.parameter_id, candidate]))
  // Include current carriers too, without turning the old triplet into an identity key.
  for (const entry of model.entries.filter((e) => e.triplets.includes(triplet))) {
    if (!candidates.has(entry.definition.parameter_id)) {
      candidates.set(entry.definition.parameter_id, { parameter_id: entry.definition.parameter_id, historical_only: false,
        current_targets: model.entries.filter((e) => e.definition.parameter_id === entry.definition.parameter_id)
          .map((e) => ({ snapshot: e.snapshot, parameter_resource_id: e.resource.id,
            path: model.manifest.snapshots.find((s) => s.key === e.snapshot)!.path })) })
    }
  }
  return [...candidates.values()]
}
