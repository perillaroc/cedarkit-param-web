<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { NButton, NCard, NDataTable, NEmpty, NInput, NPagination, NSelect, NSpace, NTag, NText, useMessage } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { model, findEntry } from '../store'
import { detailRoute } from '../router'
import type { Entry } from '../types'

type VariantFilter = 'all' | 'with' | 'without'

const route = useRoute()
const router = useRouter()
const message = useMessage()

function queryValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function integerValue(value: unknown): number | null {
  const text = queryValue(value)
  return /^\d+$/.test(text) ? Number(text) : null
}

const query = ref(queryValue(route.query.q))
const discipline = ref<number | null>(integerValue(route.query.d))
const categoryKey = ref<string | null>(queryValue(route.query.c) || null)
const variantFilter = ref<VariantFilter>(
  ['with', 'without'].includes(queryValue(route.query.v)) ? queryValue(route.query.v) as VariantFilter : 'all',
)
const page = ref(Math.max(1, integerValue(route.query.page) ?? 1))

const disciplineOptions = computed(() =>
  (model.value?.disciplines ?? []).map((d) => ({
    label: `${d.value} — ${d.label}`,
    value: d.value,
  })),
)

const categoryOptions = computed(() =>
  (model.value?.categories ?? [])
    .filter((category) => discipline.value === null || category.discipline === discipline.value)
    .map((category) => ({ label: category.label, value: `${category.discipline}.${category.value}` })),
)

const variantOptions = [
  { label: '全部条目', value: 'all' },
  { label: '有条件变体', value: 'with' },
  { label: '无条件变体', value: 'without' },
]

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return (model.value?.entries ?? []).filter((e) => {
    const hasVariants = e.variants.length > 0
    return (
      (discipline.value === null || e.discipline === discipline.value) &&
      (categoryKey.value === null || `${e.discipline}.${e.category}` === categoryKey.value) &&
      (variantFilter.value === 'all' || (variantFilter.value === 'with' ? hasVariants : !hasVariants)) &&
      (!q || e.searchText.includes(q))
    )
  })
})

const columns: DataTableColumns<Entry> = [
  {
    title: '编号',
    key: 'triplet',
    width: 100,
    sorter: (a, b) =>
      a.discipline - b.discipline || a.category - b.category || a.number - b.number,
    render: (e) =>
      h(
        RouterLink,
        { to: detailRoute(e, route.query), style: 'font-family: monospace' },
        { default: () => e.triplet },
      ),
  },
  {
    title: 'name',
    key: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name),
    render: (e) => h(RouterLink, { to: detailRoute(e, route.query) }, { default: () => e.name }),
  },
  { title: 'wgrib2', key: 'wgrib2Name', render: (e) => e.wgrib2Name ?? '' },
  { title: '单位', key: 'unit', width: 80, render: (e) => e.unit ?? '' },
  {
    title: '描述',
    key: 'description',
    ellipsis: { tooltip: true },
    render: (e) => e.descriptionCn ?? e.description ?? '',
  },
  {
    title: '变体',
    key: 'variants',
    width: 80,
    align: 'right',
    sorter: (a, b) => a.variants.length - b.variants.length,
    render: (e) =>
      e.variants.length
        ? h(NTag, { size: 'small', round: true }, { default: () => e.variants.length })
        : '',
  },
]

const pagination = computed(() => ({
  page: page.value,
  pageSize: 50,
  onUpdatePage: (value: number) => { page.value = value },
}))
const mobileEntries = computed(() => filtered.value.slice((page.value - 1) * 50, page.value * 50))

function rowProps(e: Entry) {
  const open = () => router.push(detailRoute(e, route.query))
  return {
    style: 'cursor: pointer',
    tabindex: 0,
    onClick: (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('a, button')) void open()
    },
    onKeydown: (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        void open()
      }
    },
  }
}

function clearFilters() {
  query.value = ''
  discipline.value = null
  categoryKey.value = null
  variantFilter.value = 'all'
}

function tryQuickOpen() {
  const match = query.value.trim().match(/^(\d+)[./,\s]+(\d+)[./,\s]+(\d+)$/)
  if (!match) return
  const entry = findEntry(Number(match[1]), Number(match[2]), Number(match[3]))
  if (entry) void router.push(detailRoute(entry, route.query))
  else message.warning(`未找到参数 ${match[1]}.${match[2]}.${match[3]}`)
}

watch(discipline, (value) => {
  if (value !== null && categoryKey.value && !categoryKey.value.startsWith(`${value}.`)) {
    categoryKey.value = null
  }
})

watch([query, discipline, categoryKey, variantFilter], () => { page.value = 1 })

watch(
  [query, discipline, categoryKey, variantFilter, page],
  () => {
    const next = {
      ...(query.value.trim() ? { q: query.value.trim() } : {}),
      ...(discipline.value === null ? {} : { d: String(discipline.value) }),
      ...(categoryKey.value === null ? {} : { c: categoryKey.value }),
      ...(variantFilter.value === 'all' ? {} : { v: variantFilter.value }),
      ...(page.value === 1 ? {} : { page: String(page.value) }),
    }
    void router.replace({ query: next })
  },
)
</script>

<template>
  <n-space vertical size="medium">
    <div class="filters" role="search" aria-label="参数筛选">
      <n-input
        v-model:value="query"
        type="text"
        placeholder="搜索名称、描述、单位、层次或输入 0.0.0…"
        aria-label="搜索参数"
        clearable
        autofocus
        class="search-input"
        @keyup.enter="tryQuickOpen"
      />
      <n-select
        v-model:value="discipline"
        :options="disciplineOptions"
        placeholder="全部 Discipline"
        aria-label="按 Discipline 筛选"
        clearable
        class="filter-select"
      />
      <n-select
        v-model:value="categoryKey"
        :options="categoryOptions"
        placeholder="全部 Category"
        aria-label="按 Category 筛选"
        clearable
        class="filter-select"
      />
      <n-select
        v-model:value="variantFilter"
        :options="variantOptions"
        aria-label="按条件变体筛选"
        class="filter-select"
      />
    </div>

    <div class="result-summary">
      <n-text depth="3">{{ filtered.length }} / {{ model?.entries.length ?? 0 }} 条</n-text>
      <n-button v-if="query || discipline !== null || categoryKey || variantFilter !== 'all'" text type="primary" @click="clearFilters">
        清除筛选
      </n-button>
    </div>

    <n-empty v-if="!filtered.length" description="没有符合条件的参数">
      <template #extra><n-button @click="clearFilters">清除筛选</n-button></template>
    </n-empty>

    <n-data-table
      v-else
      class="desktop-table"
      :columns="columns"
      :data="filtered"
      :row-key="(e: Entry) => e.triplet"
      :row-props="rowProps"
      :pagination="pagination"
      :scroll-x="900"
      size="small"
    />

    <div v-if="filtered.length" class="mobile-list">
      <router-link v-for="entry in mobileEntries" :key="entry.triplet" :to="detailRoute(entry, route.query)" class="card-link">
        <n-card size="small">
          <template #header>
            <span>{{ entry.name }}</span>
            <n-text code>{{ entry.triplet }}</n-text>
          </template>
          <p class="card-description">{{ entry.descriptionCn ?? entry.description ?? '暂无描述' }}</p>
          <n-space size="small">
            <n-tag v-if="entry.wgrib2Name" size="small">{{ entry.wgrib2Name }}</n-tag>
            <n-tag v-if="entry.unit" size="small">{{ entry.unit }}</n-tag>
            <n-tag v-if="entry.variants.length" size="small" type="info">{{ entry.variants.length }} 个变体</n-tag>
          </n-space>
        </n-card>
      </router-link>
      <n-pagination v-if="filtered.length > 50" v-model:page="page" :page-size="50" :item-count="filtered.length" />
    </div>
  </n-space>
</template>

<style scoped>
.filters { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.search-input { width: min(100%, 380px); }
.filter-select { width: 180px; }
.result-summary { display: flex; align-items: center; justify-content: space-between; }
.mobile-list { display: none; }
.card-link { color: inherit; text-decoration: none; }
.card-description { margin: 0 0 10px; color: var(--n-text-color-3); }
@media (max-width: 700px) {
  .filters { display: grid; grid-template-columns: 1fr 1fr; }
  .search-input { width: 100%; grid-column: 1 / -1; }
  .filter-select { width: 100%; }
  .desktop-table { display: none; }
  .mobile-list { display: grid; gap: 10px; }
}
@media (max-width: 420px) {
  .filters { grid-template-columns: 1fr; }
  .search-input { grid-column: auto; }
}
</style>
