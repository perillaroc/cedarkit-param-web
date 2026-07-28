<script setup lang="ts">
import { onMounted } from 'vue'
import { NConfigProvider, NLayout, NLayoutHeader, NLayoutContent, NSpin, NAlert, zhCN, dateZhCN } from 'naive-ui'
import { RouterView } from 'vue-router'
import { model, loadError, ensureLoaded } from './store'

onMounted(ensureLoaded)
</script>

<template>
  <n-config-provider :locale="zhCN" :date-locale="dateZhCN">
    <n-layout style="min-height: 100vh">
      <n-layout-header bordered style="padding: 12px 24px">
        <span style="font-size: 18px; font-weight: 600">CEMC GRIB2 要素数据库</span>
      </n-layout-header>
      <n-layout-content style="padding: 16px 24px; max-width: 1200px; margin: 0 auto">
        <n-alert v-if="loadError" type="error" title="数据加载失败" style="margin-top: 16px">
          {{ loadError }}
        </n-alert>
        <div v-else-if="!model" style="display: flex; justify-content: center; padding: 64px">
          <n-spin size="large" />
        </div>
        <router-view v-else />
      </n-layout-content>
    </n-layout>
  </n-config-provider>
</template>
