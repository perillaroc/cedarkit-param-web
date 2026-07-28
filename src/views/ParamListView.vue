<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { NInput, NSelect, NSpace, NText, NDataTable, NTag } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { model } from '../store'
import { detailRoute } from '../router'
import type { Entry } from '../types'

const router = useRouter()
const query = ref('')
const discipline = ref<number | null>(null)

const disciplineOptions = computed(() => [
  { label: '全部 Discipline', value: null as unknown as number },
  ...(model.value?.disciplines ?? []).map((d) => ({
    label: `${d.value} — ${d.label}`,
    value: d.value,
  })),
])

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return (model.value?.entries ?? []).filter(
    (e) =>
      (discipline.value === null || e.discipline === discipline.value) &&
      (!q || e.searchText.includes(q)),
  )
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
        { to: detailRoute(e), style: 'font-family: monospace' },
        { default: () => e.triplet },
      ),
  },
  {
    title: 'name',
    key: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name),
    render: (e) =>
      h(RouterLink, { to: detailRoute(e) }, { default: () => e.name }),
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
      e.variants.length ? h(NTag, { size: 'small', round: true }, { default: () => e.variants.length }) : '',
  },
]

function rowProps(e: Entry) {
  return {
    style: 'cursor: pointer',
    onClick: () => router.push(detailRoute(e)),
  }
}
</script>

<template>
  <n-space vertical size="medium">
    <n-space align="center">
      <n-input
        v-model:value="query"
        type="text"
        placeholder="搜索 name / wgrib2 名 / 别名 / 描述 / 编号…"
        clearable
        autofocus
        style="width: 360px"
      />
      <n-select
        v-model:value="discipline"
        :options="disciplineOptions"
        style="width: 200px"
      />
      <n-text depth="3">{{ filtered.length }} / {{ model?.entries.length ?? 0 }} 条</n-text>
    </n-space>
    <n-data-table
      :columns="columns"
      :data="filtered"
      :row-key="(e: Entry) => e.triplet"
      :row-props="rowProps"
      :pagination="{ pageSize: 50 }"
      size="small"
    />
  </n-space>
</template>
