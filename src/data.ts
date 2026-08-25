/** params.json 加载与展示模型装配。
 *
 * 数据契约：cedarkit-param-db 导出的 params.json（meta.schema_version 必须兼容）。
 * 本模块只做展示层加工（三元组、discipline 标签、when 可读文本、搜索索引），
 * 不接触数据库。
 */

import type { Entry, ParamDoc, RawEntry, SiteModel, Variant } from './types'

/** 兼容的 params.json schema 版本（cedarkit-param-db exporter.JSON_SCHEMA_VERSION） */
export const SUPPORTED_SCHEMA_VERSION = 1

/** WMO GRIB2 Table 0.0 常用 discipline 的中文标签（未知值回退为 "Discipline N"） */
export const DISCIPLINE_NAMES: Record<number, string> = {
  0: '气象',
  1: '水文',
  2: '陆面',
  3: '卫星遥感',
  10: '海洋',
}

export function shapeVariant(v: NonNullable<RawEntry['variants']>[number]): Variant {
  return {
    name: v.name,
    when: v.when,
    whenText: Object.entries(v.when)
      .map(([k, x]) => `${k}=${x}`)
      .join(', '),
    aliases: v.aliases ?? [],
    typeOfLevel: v.typeOfLevel,
    level: v.level,
    unit: v.unit,
    description: v.description,
    descriptionCn: v.description_cn,
  }
}

export function searchText(e: Omit<Entry, 'searchText'>): string {
  const parts: Array<string | undefined> = [
    e.triplet,
    `${e.discipline}.${e.category}`,
    e.disciplineLabel,
    e.name,
    e.wgrib2Name,
    e.unit,
    e.typeOfLevel,
    e.level === undefined ? undefined : String(e.level),
    e.description,
    e.descriptionCn,
    ...e.aliases,
    ...e.variants.map((v) => v.name),
    ...e.variants.flatMap((v) => v.aliases),
    ...e.variants.flatMap((v) => [
      v.whenText,
      v.typeOfLevel,
      v.level === undefined ? undefined : String(v.level),
      v.unit,
      v.description,
      v.descriptionCn,
    ]),
  ]
  return parts.filter((p): p is string => !!p).join(' ').toLowerCase()
}

export function shapeEntry(raw: RawEntry): Entry {
  const { discipline: d, category: c, number: n } = raw.key
  const base = {
    discipline: d,
    category: c,
    number: n,
    triplet: `${d}.${c}.${n}`,
    disciplineLabel: DISCIPLINE_NAMES[d] ?? `Discipline ${d}`,
    name: raw.name,
    aliases: raw.aliases ?? [],
    wgrib2Name: raw.wgrib2_name,
    unit: raw.unit,
    description: raw.description,
    descriptionCn: raw.description_cn,
    typeOfLevel: raw.typeOfLevel,
    level: raw.level,
    remark: raw.remark,
    updatedAt: raw.updated_at,
    variants: (raw.variants ?? []).map(shapeVariant),
  }
  return { ...base, searchText: searchText(base) }
}

/** 契约文档 → 展示模型；schema_version 不兼容时抛错（需 cedarkit-param-db 重新导出） */
export function buildModel(doc: ParamDoc): SiteModel {
  const version = doc.meta?.schema_version
  if (version !== SUPPORTED_SCHEMA_VERSION) {
    throw new Error(
      `params.json schema_version=${version}，本站仅支持 ${SUPPORTED_SCHEMA_VERSION}；` +
        `请用匹配版本的 cedarkit-param-db 重新导出（export-json）`,
    )
  }
  const entries = doc.entries.map(shapeEntry)
  const seen = new Map<number, string>()
  for (const e of entries) seen.set(e.discipline, e.disciplineLabel)
  const disciplines = [...seen.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.value - b.value)
  const categoryKeys = new Set(entries.map((e) => `${e.discipline}.${e.category}`))
  const categories = [...categoryKeys]
    .map((key) => {
      const [discipline, value] = key.split('.').map(Number)
      return { discipline, value, label: `${discipline}.${value}` }
    })
    .sort((a, b) => a.discipline - b.discipline || a.value - b.value)
  return { entries, disciplines, categories, meta: doc.meta }
}

function assertParamDoc(value: unknown): asserts value is ParamDoc {
  if (!value || typeof value !== 'object') throw new Error('params.json 根节点不是对象')
  const doc = value as Partial<ParamDoc>
  if (!doc.meta || typeof doc.meta.schema_version !== 'number') {
    throw new Error('params.json 缺少 meta.schema_version')
  }
  if (!Array.isArray(doc.entries)) throw new Error('params.json 的 entries 不是数组')
  for (const [index, entry] of doc.entries.entries()) {
    if (
      !entry ||
      typeof entry !== 'object' ||
      !entry.key ||
      !Number.isInteger(entry.key.discipline) ||
      !Number.isInteger(entry.key.category) ||
      !Number.isInteger(entry.key.number) ||
      typeof entry.name !== 'string' ||
      !entry.name
    ) {
      throw new Error(`params.json entries[${index}] 的 key 或 name 无效`)
    }
    if (entry.variants && !Array.isArray(entry.variants)) {
      throw new Error(`params.json entries[${index}].variants 不是数组`)
    }
  }
  const stats = doc.meta.stats
  if (stats) {
    const variants = doc.entries.reduce((sum, entry) => sum + (entry.variants?.length ?? 0), 0)
    const aliases = doc.entries.reduce(
      (sum, entry) =>
        sum +
        (entry.aliases?.length ?? 0) +
        (entry.variants ?? []).reduce((n, variant) => n + (variant.aliases?.length ?? 0), 0),
      0,
    )
    if (stats.entries !== doc.entries.length || stats.variants !== variants || stats.aliases !== aliases) {
      throw new Error('params.json 的 meta.stats 与实际数据不一致')
    }
  }
}

/** 从站点根加载 params.json 并装配展示模型 */
export async function loadModel(url = './params.json'): Promise<SiteModel> {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`加载 ${url} 失败：HTTP ${resp.status}`)
  let doc: unknown
  try {
    doc = await resp.json()
  } catch {
    throw new Error(`${url} 不是有效的 JSON`)
  }
  assertParamDoc(doc)
  return buildModel(doc)
}
