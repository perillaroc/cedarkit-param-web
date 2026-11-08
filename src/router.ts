import { createRouter, createWebHashHistory } from 'vue-router'
import type { LocationQueryRaw } from 'vue-router'
import type { Entry } from './types'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'list', component: () => import('./views/ParamListView.vue') },
    { path: '/parameters/:resource/:parameter', name: 'detail', component: () => import('./views/ParamDetailView.vue') },
    { path: '/params/:d(\\d+)/:c(\\d+)/:n(\\d+)', name: 'legacy', component: () => import('./views/LegacyView.vue') },
  ],
})

export function detailRoute(entry: Entry, query?: LocationQueryRaw) {
  return { name: 'detail', params: { resource: entry.resource.id, parameter: entry.definition.parameter_id }, query }
}
