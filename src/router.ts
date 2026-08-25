import { createRouter, createWebHashHistory } from 'vue-router'
import type { LocationQueryRaw } from 'vue-router'

export const router = createRouter({
  // hash 模式：纯静态托管无需 SPA fallback，file:// 亦可路由
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'list', component: () => import('./views/ParamListView.vue') },
    {
      path: '/params/:d(\\d+)/:c(\\d+)/:n(\\d+)',
      name: 'detail',
      component: () => import('./views/ParamDetailView.vue'),
    },
  ],
})

export function detailRoute(
  e: { discipline: number; category: number; number: number },
  query?: LocationQueryRaw,
) {
  return { name: 'detail', params: { d: e.discipline, c: e.category, n: e.number }, query }
}
