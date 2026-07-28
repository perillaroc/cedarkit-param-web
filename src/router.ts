import { createRouter, createWebHashHistory } from 'vue-router'
import ParamListView from './views/ParamListView.vue'
import ParamDetailView from './views/ParamDetailView.vue'

export const router = createRouter({
  // hash 模式：纯静态托管无需 SPA fallback，file:// 亦可路由
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'list', component: ParamListView },
    {
      path: '/params/:d(\\d+)/:c(\\d+)/:n(\\d+)',
      name: 'detail',
      component: ParamDetailView,
    },
  ],
})

export function detailRoute(e: { discipline: number; category: number; number: number }) {
  return { name: 'detail', params: { d: e.discipline, c: e.category, n: e.number } }
}
