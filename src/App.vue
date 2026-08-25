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
          <span class="site-title">CedarKit GRIB2 要素数据库</span>
          <n-text v-if="model" depth="3" class="site-meta">
            schema v{{ model.meta.schema_version }} · {{ model.meta.stats?.entries ?? model.entries.length }} 条目 ·
            {{ model.meta.stats?.variants ?? 0 }} 变体
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
        <n-message-provider v-else><router-view /></n-message-provider>
      </n-layout-content>
    </n-layout>
  </n-config-provider>
</template>

<style>
* { box-sizing: border-box; }
body { margin: 0; }
.site-header { max-width: 1200px; margin: 0 auto; display: flex; align-items: baseline; justify-content: space-between; gap: 16px; }
.site-title { font-size: 18px; font-weight: 600; }
.site-meta { font-size: 12px; white-space: nowrap; }
.site-content { padding: 16px 24px 32px; max-width: 1200px; margin: 0 auto; }
.loading-wrap { display: flex; justify-content: center; padding: 64px; }
.error-content { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
@media (max-width: 640px) {
  .site-header { align-items: flex-start; flex-direction: column; gap: 2px; }
  .site-content { padding: 12px; }
  .site-meta { white-space: normal; }
}
</style>
