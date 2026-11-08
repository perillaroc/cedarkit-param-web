/** schema 4 keeps definitions and mappings inside their resource context. */
export type Conditions = Record<string, unknown>
export interface FilePin { path: string; size: number; sha256: string }
export interface ResourcePin extends FilePin { api_version: string; id: string; version: string; backend?: string }
export interface Parameter {
  parameter_id: string
  name: string
  parent?: string
  aliases?: string[]
  unit?: string
  description?: string
  description_cn?: string
  fixed_conditions?: Conditions
}
export interface Mapping {
  id: string
  parameter_id: string
  backend: string
  applies_to: Conditions
  when?: Conditions
  native: Conditions
  evidence: string[]
}
export interface MappingResource {
  api_version: string; id: string; version: string; backend: string
  mappings: Mapping[]; tables?: unknown[]
}
export interface Obligation {
  id: string; total?: number; accepted?: number; remaining?: number
  groups?: Record<string, number>; parts?: Record<string, number>
  status?: string; task?: string; note: string; evidence?: string[]
}
export interface Scope {
  complete_product_coverage: boolean
  evidence_status: { definitions: string; mappings: string; availability: string }
  remaining_migration_obligations: Obligation[]
}
export interface SnapshotPin {
  key: string; path: string; schema_version: number
  parameter_resource: ResourcePin; mapping_resources: ResourcePin[]; dataset_ids: string[]
}
export interface DatasetBinding {
  dataset_id: string; snapshot: string; parameter_registry: ResourcePin
  mappings: Record<string, ResourcePin>; products: Array<{ id: string; version: string }>
}
export interface Manifest {
  schema_version: number; id: string; version: string; scope: Scope
  catalog: ResourcePin; files: FilePin[]; snapshots: SnapshotPin[]; dataset_bindings: DatasetBinding[]
}
export interface ParamDoc {
  meta: {
    schema_version: number; parameter_resource: Omit<ResourcePin, 'path' | 'size'>
    scope: Scope & { dataset_ids: string[]; parameter_ids: string[]; requested_parameter_ids: string[]; mapping_resource_ids: string[] }
    stats: { parameters: number; aliases: number; mappings: number }
  }
  parameters: Parameter[]; mapping_resources: MappingResource[]; retired_ids: string[]; notes: unknown[]
}
export interface LegacyCandidate {
  parameter_id: string; historical_only: boolean
  current_targets: Array<{ snapshot: string; parameter_resource_id: string; path: string }>
}
export interface LegacyIndex {
  schema_version: number
  scope: { current_support: boolean; purpose: string }
  links: Array<{ triplet: string; candidates: LegacyCandidate[] }>
}
export interface ScopedMapping extends Mapping { resource: ResourcePin; tables: unknown[] }
export interface Entry {
  key: string; snapshot: string; resource: ResourcePin; definition: Parameter
  /** root first, including the local definition; no cross-resource inheritance */
  lineage: Parameter[]
  unit?: string; description?: string; descriptionCn?: string
  aliases: string[]; fixedConditions: Conditions; mappings: ScopedMapping[]
  triplets: string[]; datasets: string[]; searchText: string
}
export interface SiteModel {
  manifest: Manifest; manifestSha256: string; entries: Entry[]; legacy: LegacyIndex
  stableIds: number; mappingCount: number
}
