import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/layout/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '工作台', icon: 'DataAnalysis' }
      },
      {
        path: 'collector',
        name: 'Collector',
        component: () => import('@/views/collector/index.vue'),
        meta: { title: '资讯采集', icon: 'Collection' },
        children: [
          {
            path: 'sources',
            name: 'CollectorSources',
            component: () => import('@/views/collector/Sources.vue'),
            meta: { title: '数据源管理' }
          },
          {
            path: 'tasks',
            name: 'CollectorTasks',
            component: () => import('@/views/collector/Tasks.vue'),
            meta: { title: '采集任务' }
          },
          {
            path: 'list',
            name: 'CollectorList',
            component: () => import('@/views/collector/List.vue'),
            meta: { title: '资讯列表' }
          }
        ]
      },
      {
        path: 'ai-processor',
        name: 'AiProcessor',
        component: () => import('@/views/ai-processor/index.vue'),
        meta: { title: 'AI 处理', icon: 'Cpu' },
        children: [
          {
            path: 'generate',
            name: 'AiGenerate',
            component: () => import('@/views/ai-processor/Generate.vue'),
            meta: { title: '内容生成' }
          },
          {
            path: 'review',
            name: 'AiReview',
            component: () => import('@/views/ai-processor/Review.vue'),
            meta: { title: '人工复核' }
          },
          {
            path: 'quality',
            name: 'AiQuality',
            component: () => import('@/views/ai-processor/Quality.vue'),
            meta: { title: '质量评估' }
          }
        ]
      },
      {
        path: 'publisher',
        name: 'Publisher',
        component: () => import('@/views/publisher/index.vue'),
        meta: { title: '内容分发', icon: 'Grid' },
        children: [
          {
            path: 'accounts',
            name: 'PublisherAccounts',
            component: () => import('@/views/publisher/Accounts.vue'),
            meta: { title: '账号管理' }
          },
          {
            path: 'tasks',
            name: 'PublisherTasks',
            component: () => import('@/views/publisher/Tasks.vue'),
            meta: { title: '分发任务' }
          },
          {
            path: 'records',
            name: 'PublisherRecords',
            component: () => import('@/views/publisher/Records.vue'),
            meta: { title: '发布记录' }
          }
        ]
      },
      {
        path: 'tracker',
        name: 'Tracker',
        component: () => import('@/views/tracker/index.vue'),
        meta: { title: '效果追踪', icon: 'TrendCharts' },
        children: [
          {
            path: 'links',
            name: 'TrackerLinks',
            component: () => import('@/views/tracker/Links.vue'),
            meta: { title: '追踪链接' }
          },
          {
            path: 'analysis',
            name: 'TrackerAnalysis',
            component: () => import('@/views/tracker/Analysis.vue'),
            meta: { title: '转化分析' }
          },
          {
            path: 'reports',
            name: 'TrackerReports',
            component: () => import('@/views/tracker/Reports.vue'),
            meta: { title: '统计报告' }
          }
        ]
      },
      {
        path: 'compliance',
        name: 'Compliance',
        component: () => import('@/views/compliance/index.vue'),
        meta: { title: '合规审核', icon: 'Checked' },
        children: [
          {
            path: 'review',
            name: 'ComplianceReview',
            component: () => import('@/views/compliance/Review.vue'),
            meta: { title: '内容审核' }
          },
          {
            path: 'keywords',
            name: 'ComplianceKeywords',
            component: () => import('@/views/compliance/Keywords.vue'),
            meta: { title: '敏感词库' }
          }
        ]
      },
      {
        path: 'system',
        name: 'System',
        component: () => import('@/views/system/index.vue'),
        meta: { title: '系统设置', icon: 'Setting' },
        children: [
          {
            path: 'users',
            name: 'SystemUsers',
            component: () => import('@/views/system/Users.vue'),
            meta: { title: '用户管理' }
          },
          {
            path: 'roles',
            name: 'SystemRoles',
            component: () => import('@/views/system/Roles.vue'),
            meta: { title: '角色管理' }
          },
          {
            path: 'settings',
            name: 'SystemSettings',
            component: () => import('@/views/system/Settings.vue'),
            meta: { title: '系统配置' }
          }
        ]
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/404.vue'),
    meta: { title: '页面不存在' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - PromotionAI` : 'PromotionAI'
  
  const token = localStorage.getItem('token')
  if (to.path !== '/login' && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/')
  } else {
    next()
  }
})

export default router
