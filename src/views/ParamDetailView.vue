<script setup lang="ts">
import { computed, h } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { NButton, NDescriptions, NDescriptionsItem, NDataTable, NEmpty, NH2, NH3, NSpace, NTag, NText } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { findEntry } from '../store'
import type { Variant } from '../types'

const route = useRoute()
const entry = computed(() =>
  findEntry(Number(route.params.d), Number(route.params.c), Number(route.params.n)),
)

const variantColumns: DataTableColumns<Variant> = [
  { title: '变体名', key: 'name', render: (v) => h(NText, { strong: true }, { default: () => v.name }) },
  {
    title: 'when 条件',
    key: 'whenText',
    render: (v) => h('code', v.whenText),
  },
  {
    title: 'typeOfLevel / level',
    key: 'typeOfLevel',
    render: (v) =>
      v.typeOfLevel ? `${v.typeOfLevel}${v.level !== undefined ? ` / ${v.level}` : ''}` : '',
  },
  { title: '单位', key: 'unit', width: 80, render: (v) => v.unit ?? '' },
  { title: '描述', key: 'description', render: (v) => v.descriptionCn ?? v.description ?? '' },
  { title: '别名', key: 'aliases', render: (v) => v.aliases.join('、') },
]
</script>

<template>
  <n-empty v-if="!entry" description="未找到该要素" style="margin-top: 64px">
    <template #extra>
      <router-link to="/"><n-button>返回要素总表</n-button></router-link>
    </template>
  </n-empty>
  <n-space v-else vertical size="large">
    <router-link to="/" style="text-decoration: none">← 返回要素总表</router-link>

    <n-h2 style="margin-bottom: 0">
      {{ entry.name }}
      <n-text code style="font-size: 16px">{{ entry.triplet }}</n-text>
      <n-tag type="info" size="small">{{ entry.disciplineLabel }}</n-tag>
    </n-h2>

    <n-descriptions bordered :column="1" label-placement="left" size="small">
      <n-descriptions-item label="discipline / category / number">
        {{ entry.discipline }} / {{ entry.category }} / {{ entry.number }}
      </n-descriptions-item>
      <n-descriptions-item label="name">{{ entry.name }}</n-descriptions-item>
      <n-descriptions-item v-if="entry.wgrib2Name" label="wgrib2 name">{{ entry.wgrib2Name }}</n-descriptions-item>
      <n-descriptions-item v-if="entry.unit" label="单位">{{ entry.unit }}</n-descriptions-item>
      <n-descriptions-item v-if="entry.typeOfLevel" label="typeOfLevel">{{ entry.typeOfLevel }}</n-descriptions-item>
      <n-descriptions-item v-if="entry.level !== undefined" label="level">{{ entry.level }}</n-descriptions-item>
      <n-descriptions-item v-if="entry.description" label="description">{{ entry.description }}</n-descriptions-item>
      <n-descriptions-item v-if="entry.descriptionCn" label="中文描述">{{ entry.descriptionCn }}</n-descriptions-item>
      <n-descriptions-item v-if="entry.aliases.length" label="别名">{{ entry.aliases.join('、') }}</n-descriptions-item>
    </n-descriptions>

    <template v-if="entry.variants.length">
      <n-h3 style="margin-bottom: 0">条件变体（{{ entry.variants.length }}）</n-h3>
      <n-data-table
        :columns="variantColumns"
        :data="entry.variants"
        :row-key="(v: Variant) => v.name"
        size="small"
      />
      <n-text depth="3" style="font-size: 12px">变体级单位/描述为空表示继承条目级定义。</n-text>
    </template>

    <template v-if="entry.remark || entry.updatedAt">
      <n-h3 style="margin-bottom: 0">维护信息</n-h3>
      <n-descriptions bordered :column="1" label-placement="left" size="small">
        <n-descriptions-item v-if="entry.remark" label="remark">{{ entry.remark }}</n-descriptions-item>
        <n-descriptions-item v-if="entry.updatedAt" label="updated_at">{{ entry.updatedAt }}</n-descriptions-item>
      </n-descriptions>
    </template>
  </n-space>
</template>
