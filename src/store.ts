/** 站点数据的模块级共享：App 启动时加载一次，两个视图共用。 */

import { ref } from 'vue'
import { loadModel } from './data'
import type { SiteModel } from './types'

export const model = ref<SiteModel | null>(null)
export const loadError = ref<string | null>(null)
export const loading = ref(false)

let request: Promise<void> | null = null

export function ensureLoaded(force = false): Promise<void> {
  if (model.value && !force) return Promise.resolve()
  if (request && !force) return request
  loading.value = true
  loadError.value = null
  request = loadModel()
    .then((m) => {
      model.value = m
    })
    .catch((err: unknown) => {
      loadError.value = err instanceof Error ? err.message : String(err)
    })
    .finally(() => {
      loading.value = false
      request = null
    })
  return request
}

export function retryLoad(): void {
  void ensureLoaded(true)
}

/** Resolve both IDs inside the selected parameter resource. */
export function findEntry(resource: string, parameter: string) {
  return model.value?.entries.find((entry) => entry.resource.id === resource && entry.definition.parameter_id === parameter)
}
