<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { NAlert, NCard, NEmpty, NH2, NSpace, NTag } from 'naive-ui'
import { model, findEntry } from '../store'
import { legacyCandidates } from '../data'
import { detailRoute } from '../router'

const route = useRoute()
const triplet = computed(() => `${route.params.d}.${route.params.c}.${route.params.n}`)
const candidates = computed(() => model.value ? legacyCandidates(model.value, triplet.value) : [])
</script>

<template>
  <n-space vertical size="medium">
    <router-link :to="{ name: 'list', query: route.query }">← 返回要素总表</router-link>
    <n-h2>三元组 {{ triplet }} 的参数候选</n-h2>
    <n-alert type="info" title="请选择稳定参数及资源上下文">
      三元组可能对应多个业务身份。历史链接只提供导航，当前定义和适用映射以各资源详情为准。
    </n-alert>
    <n-empty v-if="!candidates.length" description="未找到该三元组的历史或当前候选" />
    <n-card v-for="candidate in candidates" :key="candidate.parameter_id" size="small">
      <h3 class="candidate-title">{{ candidate.parameter_id }}</h3>
      <template v-if="candidate.historical_only">
        <n-tag type="warning">historical_only · 仅历史记录</n-tag>
        <p>该身份未纳入当前审核切片，尚无当前详情；这不表示已退役，也不表示当前支持。</p>
      </template>
      <n-space v-else>
        <template v-for="target in candidate.current_targets" :key="target.parameter_resource_id">
          <router-link v-if="findEntry(target.parameter_resource_id, candidate.parameter_id)"
            :to="detailRoute(findEntry(target.parameter_resource_id, candidate.parameter_id)!, route.query)">
            {{ target.snapshot }} · {{ target.parameter_resource_id }}
          </router-link>
        </template>
      </n-space>
    </n-card>
  </n-space>
</template>

<style scoped>
.candidate-title { margin: 0 0 12px; overflow-wrap: anywhere; }
a { overflow-wrap: anywhere; }
</style>
