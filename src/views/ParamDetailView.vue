<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { NAlert, NButton, NDescriptions, NDescriptionsItem, NEmpty, NH2, NH3, NSpace, NTag, useMessage } from 'naive-ui'
import { findEntry } from '../store'
import { detailRoute } from '../router'
import { pretty } from '../data'
import { model } from '../store'
const route = useRoute()
const message = useMessage()
async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    message.success('已复制')
  } catch { message.error('复制失败，请手动选择文本') }
}
const entry = computed(() => findEntry(String(route.params.resource), String(route.params.parameter)))
const variants = computed(() => model.value?.entries.filter((e) =>
  e.resource.id === entry.value?.resource.id && e.definition.parent === entry.value?.definition.parameter_id) ?? [])
const alternatives = computed(() => model.value?.entries.filter((e) =>
  e.definition.parameter_id === entry.value?.definition.parameter_id && e.resource.id !== entry.value?.resource.id) ?? [])
const parentEntry = computed(() => entry.value?.definition.parent ? findEntry(entry.value.resource.id, entry.value.definition.parent) : undefined)
</script>

<template>
  <n-space vertical size="large">
    <router-link :to="{ name: 'list', query: route.query }">← 返回要素总表</router-link>
    <n-empty v-if="!entry" description="未找到该资源中的参数定义" />
    <template v-else>
      <n-h2 class="detail-title">{{ entry.definition.parameter_id }}</n-h2>
      <n-space>
        <n-tag type="info">{{ entry.snapshot }}</n-tag>
        <n-button size="small" @click="copy(entry.definition.parameter_id)">复制稳定 ID</n-button>
        <n-button size="small" @click="copy(entry.definition.name)">复制名称</n-button>
        <n-tag>{{ entry.mappings.length ? `${entry.mappings.length} 条直接映射` : '无直接映射 · 家族或未直接映射定义' }}</n-tag>
      </n-space>
      <n-descriptions bordered :column="1" label-placement="left" size="small">
        <n-descriptions-item label="参数资源">{{ entry.resource.id }} · v{{ entry.resource.version }}</n-descriptions-item>
        <n-descriptions-item label="资源 SHA256"><code>{{ entry.resource.sha256 }}</code></n-descriptions-item>
        <n-descriptions-item label="名称">{{ entry.definition.name }}</n-descriptions-item>
        <n-descriptions-item label="单位">{{ entry.unit ?? '未声明' }}<span v-if="!entry.definition.unit && entry.unit">（继承父定义）</span></n-descriptions-item>
        <n-descriptions-item v-if="entry.descriptionCn || entry.description" label="描述">{{ entry.descriptionCn }} {{ entry.description }}</n-descriptions-item>
        <n-descriptions-item label="别名">{{ entry.aliases.join('、') || '无' }}</n-descriptions-item>
        <n-descriptions-item v-if="parentEntry" label="父定义">
          <router-link :to="detailRoute(parentEntry, route.query)">{{ parentEntry.definition.parameter_id }}</router-link>
        </n-descriptions-item>
        <n-descriptions-item label="固定条件（含父约束）"><pre>{{ pretty(entry.fixedConditions) }}</pre></n-descriptions-item>
        <n-descriptions-item label="当前 GRIB 三元组">{{ entry.triplets.join('、') || '无直接 GRIB 映射' }} <n-button v-if="entry.triplets.length" size="small" @click="copy(entry.triplets.join('、'))">复制三元组</n-button></n-descriptions-item>
      </n-descriptions>
      <n-alert v-if="entry.resource.id === 'cedarkit.parameters.cmadaas' && ['cedarkit.gusw.any', 'cedarkit.gusw', 'cedarkit.tusw'].includes(entry.definition.parameter_id)" class="usrf-semantics" type="info" title="USRF 单位与符号">
        <p>本批 GFS USRF 具名结果使用 J/m2，表示保留原符号的时间积分能量。</p>
        <p>原生地表解码头为 <code>W m**-2</code>，大气顶为 <code>unknown</code>；服务原头为 <code>W.m-2</code>，历史记录为 <code>w/m2</code>。当前单位依据生产声明、原始 GRIB 和实际响应审核，原声明保留供追溯。</p>
        <p>保留全部原正负值，不翻转符号、不裁剪、不除时长；本批未确立 positive-up 或单调性。请在对应产品映射中查看有限适用范围与审核证据。</p>
      </n-alert>
      <details v-if="alternatives.length">
        <summary>同一稳定 ID 的其他资源定义（{{ alternatives.length }}）</summary>
        <ul><li v-for="other in alternatives" :key="other.key">
          <router-link :to="detailRoute(other, route.query)">{{ other.snapshot }} · {{ other.resource.id }}</router-link>
        </li></ul>
      </details>
      <template v-if="variants.length">
        <n-h3>子定义／变体（{{ variants.length }}）</n-h3>
        <n-space><router-link v-for="child in variants" :key="child.key" :to="detailRoute(child, route.query)">{{ child.definition.parameter_id }}</router-link></n-space>
      </template>
      <details class="definition-records">
        <summary>原始本地定义与父定义链</summary>
        <pre>{{ pretty(entry.lineage) }}</pre>
      </details>
      <n-h3>产品／来源适用映射（{{ entry.mappings.length }}）</n-h3>
      <n-alert type="info" title="审核证据与可用性">
        定义为 reviewed_authoring，映射为 reviewed_mapping_with_references。实际可用性为 not_guaranteed_for_all_cells；
        映射审核不保证每个时效、成员及质量单元均已通过。
      </n-alert>
      <n-empty v-if="!entry.mappings.length" description="本定义没有直接映射，请查看相关子定义" />
      <article v-for="mapping in entry.mappings" :key="`${mapping.resource.id}/${mapping.id}`" class="mapping-card">
        <h4>{{ mapping.id }}</h4>
        <p>{{ mapping.backend }} · {{ mapping.resource.id }} · v{{ mapping.resource.version }}</p>
        <n-descriptions bordered :column="1" label-placement="left" size="small">
          <n-descriptions-item label="产品适用域"><pre>{{ pretty(mapping.applies_to) }}</pre></n-descriptions-item>
          <n-descriptions-item label="映射条件"><pre>{{ pretty(mapping.when ?? {}) }}</pre></n-descriptions-item>
        </n-descriptions>
        <details><summary>原生选择与转换规则</summary><pre>{{ pretty(mapping.native) }}</pre></details>
        <details v-if="mapping.tables.length"><summary>共享转换表（{{ mapping.tables.length }}）</summary><pre>{{ pretty(mapping.tables) }}</pre></details>
        <details open><summary>审核证据（{{ mapping.evidence.length }}）</summary>
          <ul class="evidence"><li v-for="reference in mapping.evidence" :key="reference"><code>{{ reference }}</code></li></ul>
        </details>
      </article>
    </template>
  </n-space>
</template>

<style scoped>
.detail-title { overflow-wrap: anywhere; margin: 0; }
pre { margin: 4px 0; white-space: pre-wrap; overflow-wrap: anywhere; }
code, p, a { overflow-wrap: anywhere; }
.mapping-card { border: 1px solid #dedede; border-radius: 6px; padding: 16px; }
h4 { margin: 0 0 8px; overflow-wrap: anywhere; }
details { margin-top: 10px; }
summary { cursor: pointer; color: #245c43; }
.evidence { padding-left: 20px; font-size: 12px; }
</style>
