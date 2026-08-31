/** params.json 数据契约与展示模型类型。
 *
 * 契约由 cedarkit-param-db 的 export-json 导出（meta.schema_version 协调两边升级），
 * Raw* 接口与契约字段一一对应；Entry/Variant 是 data.ts 装配后的展示模型。
 */

// ---- 契约（params.json 原始结构）----

export interface ParamKey {
  discipline: number
  category: number
  number: number
}

export interface RawVariant {
  parameter_id: string
  name: string
  when: Record<string, number | string>
  aliases?: string[]
  typeOfLevel?: string
  level?: number
  unit?: string
  description?: string
  description_cn?: string
}

export interface RawEntry {
  parameter_id: string
  key: ParamKey
  name: string
  aliases?: string[]
  external_names?: Record<string, string>
  wgrib2_name?: string
  unit?: string
  description?: string
  description_cn?: string
  typeOfLevel?: string
  level?: number
  remark?: string
  updated_at?: string
  variants?: RawVariant[]
}

export interface ParamDoc {
  meta: {
    schema_version: number
    generated_by?: string
    stats?: { entries: number; variants: number; aliases: number }
  }
  entries: RawEntry[]
}

// ---- 展示模型 ----

export interface Variant {
  name: string
  when: Record<string, number | string>
  whenText: string
  aliases: string[]
  typeOfLevel?: string
  level?: number
  unit?: string
  description?: string
  descriptionCn?: string
}

export interface Entry {
  discipline: number
  category: number
  number: number
  /** "d.c.n" 三元组，如 "0.0.0" */
  triplet: string
  disciplineLabel: string
  name: string
  aliases: string[]
  wgrib2Name?: string
  unit?: string
  description?: string
  descriptionCn?: string
  typeOfLevel?: string
  level?: number
  remark?: string
  updatedAt?: string
  variants: Variant[]
  /** 列表页过滤用的预拼接小写索引 */
  searchText: string
}

export interface SiteModel {
  entries: Entry[]
  /** 数据中出现的 discipline 值与中文标签，按值排序 */
  disciplines: Array<{ value: number; label: string }>
  /** 数据中出现的 discipline/category 组合，按数值排序 */
  categories: Array<{ discipline: number; value: number; label: string }>
  meta: ParamDoc['meta']
}
