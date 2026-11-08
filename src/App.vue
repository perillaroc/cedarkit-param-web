<script setup lang="ts">
import { onMounted } from 'vue'
import { NAlert, NButton, NConfigProvider, NLayout, NLayoutContent, NLayoutHeader, NMessageProvider, NSpin, NText, dateZhCN, zhCN } from 'naive-ui'
import { RouterView } from 'vue-router'
import { model, loadError, loading, ensureLoaded, retryLoad } from './store'

onMounted(ensureLoaded)
</script>

<template>
  <n-config-provider :locale="zhCN" :date-locale="dateZhCN">
    <n-layout style="min-height: 100vh">
      <n-layout-header bordered style="padding: 12px 24px">
        <div class="site-header">
          <span class="site-title">CedarKit 参数浏览器</span>
          <n-text v-if="model" depth="3" class="site-meta">
            schema v4 · {{ model.stableIds }} 个稳定 ID · {{ model.entries.length }} 条资源内定义 · {{ model.mappingCount }} 条映射
          </n-text>
        </div>
      </n-layout-header>
      <n-layout-content class="site-content">
        <n-alert v-if="loadError" type="error" title="数据加载失败" style="margin-top: 16px">
          <div class="error-content">
            <span>{{ loadError }}</span>
            <n-button size="small" @click="retryLoad">重试</n-button>
          </div>
        </n-alert>
        <div v-else-if="loading || !model" class="loading-wrap">
          <n-spin size="large" />
        </div>
        <template v-else>
          <n-alert type="info" title="当前审核切片" class="scope-summary">
            {{ model.manifest.snapshots.length }} 个资源上下文；保留各自定义和产品适用域。审核映射不保证所有时效、成员及质量单元可用。
            <details class="scope-details">
              <summary>快照与全局待验范围</summary>
              <p>{{ model.manifest.id }} · v{{ model.manifest.version }} · 目录 v{{ model.manifest.catalog.version }}</p>
              <p class="digest">manifest SHA256：{{ model.manifestSha256 }}</p>
              <ul aria-label="全局义务台账">
                <li v-for="item in model.manifest.scope.remaining_migration_obligations" :key="item.id">
                  {{ item.id }}：
                  <template v-if="item.total">已验 {{ item.accepted }} / {{ item.total }}；</template>
                  <template v-if="item.remaining !== undefined">余 {{ item.remaining }}；</template>
                  <template v-if="item.groups">{{ item.groups }}；</template>
                  <template v-if="item.status">{{ item.task }} {{ item.status }}；</template>
                  {{ item.note }}
                </li>
              </ul>
              <p>台账在整个快照组内只计一次。</p>
            </details>
          </n-alert>
          <n-message-provider><router-view /></n-message-provider>
        </template>
      </n-layout-content>
    </n-layout>
  </n-config-provider>
</template>

<style>
* { box-sizing: border-box; }
body { margin: 0; }
.site-header { max-width: 1200px; margin: 0 auto; display: flex; align-items: baseline; justify-content: space-between; gap: 16px; }
.site-title { font-size: 18px; font-weight: 600; }
.site-meta { color: #62676d !important; font-size: 12px; white-space: nowrap; }
.site-content { padding: 16px 24px 32px; max-width: 1200px; margin: 0 auto; }
.scope-summary { margin-bottom: 20px; }
.scope-details { margin-top: 8px; }
.scope-details summary { cursor: pointer; }
.digest { overflow-wrap: anywhere; font-family: monospace; font-size: 12px; }
.loading-wrap { display: flex; justify-content: center; padding: 64px; }
.error-content { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
@media (max-width: 640px) {
  .site-header { align-items: flex-start; flex-direction: column; gap: 2px; }
  .site-content { padding: 12px; }
  .site-meta { white-space: normal; }
}
</style>
