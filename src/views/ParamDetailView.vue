<script setup lang="ts">
import { computed, h } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { NButton, NDescriptions, NDescriptionsItem, NDataTable, NEmpty, NH2, NH3, NSpace, NTag, NText, useMessage } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { findEntry, model } from '../store'
import { detailRoute } from '../router'
import type { Variant } from '../types'

interface DisplayVariant extends Variant {
  effectiveTypeOfLevel?: string
  effectiveLevel?: number
  effectiveUnit?: string
  effectiveDescription?: string
  inheritedTypeOfLevel: boolean
  inheritedUnit: boolean
  inheritedDescription: boolean
}

const route = useRoute()
const message = useMessage()
const listRoute = computed(() => ({ name: 'list', query: route.query }))
const entry = computed(() =>
  findEntry(Number(route.params.d), Number(route.params.c), Number(route.params.n)),
)
const entryIndex = computed(() =>
  entry.value ? (model.value?.entries.indexOf(entry.value) ?? -1) : -1,
)
const previousEntry = computed(() =>
  entryIndex.value > 0 ? model.value?.entries[entryIndex.value - 1] : undefined,
)
const nextEntry = computed(() => {
  const index = entryIndex.value
  return index >= 0 && index < (model.value?.entries.length ?? 0) - 1
    ? model.value?.entries[index + 1]
    : undefined
})

const displayVariants = computed<DisplayVariant[]>(() => {
  if (!entry.value) return []
  return entry.value.variants.map((variant) => ({
    ...variant,
    effectiveTypeOfLevel: variant.typeOfLevel ?? entry.value?.typeOfLevel,
    effectiveLevel: variant.level ?? entry.value?.level,
    effectiveUnit: variant.unit ?? entry.value?.unit,
    effectiveDescription:
      variant.descriptionCn ?? variant.description ?? entry.value?.descriptionCn ?? entry.value?.description,
    inheritedTypeOfLevel: variant.typeOfLevel === undefined && entry.value?.typeOfLevel !== undefined,
    inheritedUnit: variant.unit === undefined && entry.value?.unit !== undefined,
    inheritedDescription:
      variant.descriptionCn === undefined &&
      variant.description === undefined &&
      (entry.value?.descriptionCn !== undefined || entry.value?.description !== undefined),
  }))
})

function valueWithInheritance(value: string | number | undefined, inherited: boolean) {
  if (value === undefined) return ''
  return inherited
    ? h('span', [String(value), h(NTag, { size: 'tiny', bordered: false, style: 'margin-left: 6px' }, { default: () => '继承' })])
    : String(value)
}

const variantColumns: DataTableColumns<DisplayVariant> = [
  { title: '变体名', key: 'name', render: (v) => h(NText, { strong: true }, { default: () => v.name }) },
  { title: 'when 条件', key: 'whenText', render: (v) => h('code', { class: 'when-code' }, v.whenText) },
  {
    title: 'typeOfLevel / level',
    key: 'typeOfLevel',
    render: (v) => {
      const text = v.effectiveTypeOfLevel
        ? `${v.effectiveTypeOfLevel}${v.effectiveLevel !== undefined ? ` / ${v.effectiveLevel}` : ''}`
        : undefined
      return valueWithInheritance(text, v.inheritedTypeOfLevel)
    },
  },
  { title: '单位', key: 'unit', width: 110, render: (v) => valueWithInheritance(v.effectiveUnit, v.inheritedUnit) },
  { title: '描述', key: 'description', render: (v) => valueWithInheritance(v.effectiveDescription, v.inheritedDescription) },
  { title: '别名', key: 'aliases', render: (v) => v.aliases.join('、') },
]

async function copy(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value)
    message.success(`已复制${label}`)
  } catch {
    message.error('复制失败，请手动选择文本')
  }
}
</script>

<template>
  <n-empty v-if="!entry" description="未找到该要素" style="margin-top: 64px">
    <template #extra>
      <router-link :to="listRoute"><n-button>返回要素总表</n-button></router-link>
    </template>
  </n-empty>
  <n-space v-else vertical size="large">
    <div class="detail-nav">
      <router-link :to="listRoute" class="plain-link">← 返回要素总表</router-link>
      <n-space>
        <router-link v-if="previousEntry" :to="detailRoute(previousEntry, route.query)">
          <n-button size="small">← {{ previousEntry.triplet }}</n-button>
        </router-link>
        <router-link v-if="nextEntry" :to="detailRoute(nextEntry, route.query)">
          <n-button size="small">{{ nextEntry.triplet }} →</n-button>
        </router-link>
      </n-space>
    </div>

    <n-h2 class="detail-title">
      {{ entry.name }}
      <n-text code class="triplet">{{ entry.triplet }}</n-text>
      <n-tag type="info" size="small">{{ entry.disciplineLabel }}</n-tag>
    </n-h2>

    <n-descriptions bordered :column="1" label-placement="left" size="small">
      <n-descriptions-item label="discipline / category / number">
        {{ entry.discipline }} / {{ entry.category }} / {{ entry.number }}
        <n-button text size="small" @click="copy(entry.triplet, '三元组')">复制</n-button>
      </n-descriptions-item>
      <n-descriptions-item label="name">
        {{ entry.name }}
        <n-button text size="small" @click="copy(entry.name, '名称')">复制</n-button>
      </n-descriptions-item>
      <n-descriptions-item v-if="entry.cmadaasName" label="CMADaaS name">
        {{ entry.cmadaasName }}
        <n-button text size="small" @click="copy(entry.cmadaasName!, ' CMADaaS 名称')">复制</n-button>
      </n-descriptions-item>
      <n-descriptions-item v-if="entry.wgrib2Name" label="wgrib2 name">
        {{ entry.wgrib2Name }}
        <n-button text size="small" @click="copy(entry.wgrib2Name!, ' wgrib2 名称')">复制</n-button>
      </n-descriptions-item>
      <n-descriptions-item v-if="entry.unit" label="单位">{{ entry.unit }}</n-descriptions-item>
      <n-descriptions-item v-if="entry.typeOfLevel" label="typeOfLevel">{{ entry.typeOfLevel }}</n-descriptions-item>
      <n-descriptions-item v-if="entry.level !== undefined" label="level">{{ entry.level }}</n-descriptions-item>
      <n-descriptions-item v-if="entry.description" label="description">{{ entry.description }}</n-descriptions-item>
      <n-descriptions-item v-if="entry.descriptionCn" label="中文描述">{{ entry.descriptionCn }}</n-descriptions-item>
      <n-descriptions-item v-if="entry.aliases.length" label="别名">{{ entry.aliases.join('、') }}</n-descriptions-item>
    </n-descriptions>

    <template v-if="displayVariants.length">
      <n-h3 class="section-title">条件变体（{{ displayVariants.length }}）</n-h3>
      <n-data-table
        :columns="variantColumns"
        :data="displayVariants"
        :row-key="(v: DisplayVariant) => v.name"
        :scroll-x="1050"
        size="small"
      />
      <n-text depth="3" class="hint">“继承”表示该值来自条目级定义。</n-text>
    </template>

    <template v-if="entry.remark || entry.updatedAt">
      <n-h3 class="section-title">维护信息</n-h3>
      <n-descriptions bordered :column="1" label-placement="left" size="small">
        <n-descriptions-item v-if="entry.remark" label="remark">{{ entry.remark }}</n-descriptions-item>
        <n-descriptions-item v-if="entry.updatedAt" label="updated_at">{{ entry.updatedAt }}</n-descriptions-item>
      </n-descriptions>
    </template>
  </n-space>
</template>

<style scoped>
.detail-nav { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.plain-link { text-decoration: none; }
.detail-title, .section-title { margin-bottom: 0; }
.triplet { font-size: 16px; }
.hint { color: #62676d !important; font-size: 12px; }
:deep(.when-code) { white-space: normal; overflow-wrap: anywhere; }
@media (max-width: 640px) {
  .detail-nav { align-items: flex-start; flex-direction: column; }
  .detail-title { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
}
</style>
