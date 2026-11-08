<script setup lang="ts">
import { computed, h, nextTick, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { NButton, NCard, NDataTable, NEmpty, NInput, NPagination, NSelect, NSpace, NTag, NText } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { model } from '../store'
import { detailRoute } from '../router'
import { filterEntries } from '../data'
import type { Entry } from '../types'

const route = useRoute()
const router = useRouter()
const text = (value: unknown) => typeof value === 'string' ? value : ''
const query = ref(text(route.query.q))
const snapshot = ref<string | null>(text(route.query.s) || null)
const dataset = ref<string | null>(text(route.query.dataset) || null)
const backend = ref<string | null>(text(route.query.backend) || null)
const mapped = ref(['with', 'without'].includes(text(route.query.m)) ? text(route.query.m) : 'all')
const page = ref(Math.max(1, Number.parseInt(text(route.query.page), 10) || 1))
let applyingRoute = false
watch(() => route.query, (values) => {
  const nextQuery = text(values.q)
  const nextSnapshot = text(values.s) || null
  const nextDataset = text(values.dataset) || null
  const nextBackend = text(values.backend) || null
  const nextMapped = ['with', 'without'].includes(text(values.m)) ? text(values.m) : 'all'
  const nextPage = Math.max(1, Number.parseInt(text(values.page), 10) || 1)
  if (query.value.trim() === nextQuery && snapshot.value === nextSnapshot && dataset.value === nextDataset
    && backend.value === nextBackend && mapped.value === nextMapped && page.value === nextPage) return
  applyingRoute = true
  query.value = nextQuery; snapshot.value = nextSnapshot; dataset.value = nextDataset
  backend.value = nextBackend; mapped.value = nextMapped; page.value = nextPage
  void nextTick(() => { applyingRoute = false })
})
const snapshotOptions = computed(() => model.value?.manifest.snapshots.map((s) => ({ label: s.key, value: s.key })) ?? [])
const datasetOptions = computed(() => model.value?.manifest.dataset_bindings
  .filter((b) => !snapshot.value || b.snapshot === snapshot.value).map((b) => ({ label: b.dataset_id, value: b.dataset_id })) ?? [])
const backendOptions = [{ label: 'GRIB2', value: 'grib2' }, { label: 'CMADaaS', value: 'cmadaas' }]
const mappedOptions = [{ label: '全部定义', value: 'all' }, { label: '有直接映射', value: 'with' }, { label: '无直接映射', value: 'without' }]
const filtered = computed(() => filterEntries(model.value?.entries ?? [], {
  query: query.value, snapshot: snapshot.value, dataset: dataset.value, backend: backend.value, mapped: mapped.value,
}))
const visible = computed(() => filtered.value.slice((page.value - 1) * 50, page.value * 50))
const columns: DataTableColumns<Entry> = [
  { title: '稳定参数 ID', key: 'parameter', width: 265,
    sorter: (a, b) => a.definition.parameter_id.localeCompare(b.definition.parameter_id),
    render: (e) => h(RouterLink, { to: detailRoute(e, route.query) }, { default: () => e.definition.parameter_id }) },
  { title: '资源上下文', key: 'snapshot', width: 110, render: (e) => `${e.snapshot} · v${e.resource.version}` },
  { title: '名称', key: 'name', width: 110, render: (e) => e.definition.name },
  { title: '单位', key: 'unit', width: 80, render: (e) => e.unit ?? '—' },
  { title: '描述', key: 'description', render: (e) => e.descriptionCn ?? e.description ?? '—' },
  { title: '直接映射', key: 'mappings', width: 100,
    render: (e) => h(NTag, { size: 'small', type: e.mappings.length ? 'info' : 'default' },
      { default: () => e.mappings.length ? String(e.mappings.length) : '无直接映射' }) },
]
function clearFilters() {
  query.value = ''; snapshot.value = null; dataset.value = null; backend.value = null; mapped.value = 'all'
}
function quickOpen() {
  const triplet = query.value.trim().match(/^(\d+)[./,\s]+(\d+)[./,\s]+(\d+)$/)
  if (triplet) void router.push({ name: 'legacy', params: { d: triplet[1], c: triplet[2], n: triplet[3] }, query: route.query })
}
watch(snapshot, () => {
  if (applyingRoute) return
  if (dataset.value && !datasetOptions.value.some((option) => option.value === dataset.value)) dataset.value = null
})
watch([query, snapshot, dataset, backend, mapped], () => { if (!applyingRoute) page.value = 1 })
watch(() => filtered.value.length, (length) => { page.value = Math.min(page.value, Math.max(1, Math.ceil(length / 50))) })
watch([query, snapshot, dataset, backend, mapped, page], () => {
  if (applyingRoute) return
  void router.replace({ query: {
    ...(query.value.trim() ? { q: query.value.trim() } : {}), ...(snapshot.value ? { s: snapshot.value } : {}),
    ...(dataset.value ? { dataset: dataset.value } : {}), ...(backend.value ? { backend: backend.value } : {}),
    ...(mapped.value !== 'all' ? { m: mapped.value } : {}), ...(page.value > 1 ? { page: String(page.value) } : {}),
  } })
})
</script>

<template>
  <n-space vertical size="medium">
    <div class="filters" role="search" aria-label="参数筛选">
      <n-input v-model:value="query" placeholder="搜索稳定 ID、别名、描述、产品或三元组…"
        :input-props="{ 'aria-label': '搜索参数' }" clearable class="search-input" @keyup.enter="quickOpen" />
      <n-select v-model:value="snapshot" :options="snapshotOptions" placeholder="全部资源上下文" clearable
        :input-props="{ 'aria-label': '资源上下文' }" class="filter-select" />
      <n-select v-model:value="dataset" :options="datasetOptions" placeholder="全部产品数据集" clearable
        :input-props="{ 'aria-label': '产品数据集' }" class="filter-select" />
      <n-select v-model:value="backend" :options="backendOptions" placeholder="全部来源" clearable
        :input-props="{ 'aria-label': '来源' }" class="filter-select" />
      <n-select v-model:value="mapped" :options="mappedOptions" :input-props="{ 'aria-label': '直接映射状态' }" class="filter-select" />
    </div>
    <div class="result-summary">
      <n-text class="result-count">{{ filtered.length }} / {{ model?.entries.length ?? 0 }} 条资源内定义</n-text>
      <n-button size="small" @click="clearFilters">清除筛选</n-button>
    </div>
    <n-empty v-if="!filtered.length" description="未找到匹配的参数定义" />
    <n-data-table v-else class="desktop-table" :columns="columns" :data="filtered" :row-key="(e: Entry) => e.key"
      :pagination="{ page, pageSize: 50, onUpdatePage: (value: number) => page = value }" :scroll-x="1050" size="small" />
    <div v-if="filtered.length" class="mobile-list">
      <router-link v-for="entry in visible" :key="entry.key" :to="detailRoute(entry, route.query)" class="card-link">
        <n-card size="small">
          <h3 class="card-title">{{ entry.definition.parameter_id }}</h3>
          <p>{{ entry.descriptionCn ?? entry.description ?? entry.definition.name }}</p>
          <n-space size="small">
            <n-tag size="small">{{ entry.snapshot }} · v{{ entry.resource.version }}</n-tag>
            <n-tag v-if="entry.unit" size="small">{{ entry.unit }}</n-tag>
            <n-tag size="small">{{ entry.mappings.length }} 条直接映射</n-tag>
          </n-space>
        </n-card>
      </router-link>
      <n-pagination v-if="filtered.length > 50" v-model:page="page" :page-size="50" :item-count="filtered.length" />
    </div>
  </n-space>
</template>

<style scoped>
.filters { display: flex; flex-wrap: wrap; gap: 10px; }
.search-input { width: 100%; }
.filter-select { flex: 1; min-width: 180px; }
.result-summary { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.result-count { color: #50565c; }
.mobile-list { display: none; }
.card-title { margin: 0 0 12px; font-size: 17px; }
.card-link { color: inherit; text-decoration: none; overflow-wrap: anywhere; }
@media (max-width: 700px) {
  .filters { display: grid; grid-template-columns: 1fr; }
  .filter-select { min-width: 0; width: 100%; }
  .desktop-table { display: none; }
  .mobile-list { display: grid; gap: 10px; }
}
</style>
