import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/', // resolves to /quiz/ because your base is '/quiz/'
    component: () => import('pages/IndexPage.vue')
  },
  { path: '/:catchAll(.*)*', component: () => import('pages/ErrorNotFound.vue') }
]

export default routes
