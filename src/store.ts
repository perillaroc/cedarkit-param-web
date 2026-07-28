/** 站点数据的模块级共享：App 启动时加载一次，两个视图共用。 */

import { ref } from 'vue'
import { loadModel } from './data'
import type { SiteModel } from './types'

export const model = ref<SiteModel | null>(null)
export const loadError = ref<string | null>(null)

let started = false

export function ensureLoaded(): void {
  if (started) return
  started = true
  loadModel()
    .then((m) => (model.value = m))
    .catch((err: unknown) => (loadError.value = err instanceof Error ? err.message : String(err)))
}

/** 按三元组查找要素 */
export function findEntry(d: number, c: number, n: number) {
  return model.value?.entries.find(
    (e) => e.discipline === d && e.category === c && e.number === n,
  )
}
