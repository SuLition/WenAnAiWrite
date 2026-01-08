import { createRouter, createWebHistory } from 'vue-router';
import { ParsePage, HistoryPage, TaskQueuePage } from '@/views';
import SettingsLayout from '@/views/settings/SettingsLayout.vue';
import GeneralSettings from '@/views/settings/GeneralSettings.vue';
import StorageSettings from '@/views/settings/StorageSettings.vue';
import AccountSettings from '@/views/settings/AccountSettings.vue';
import ApiSettings from '@/views/settings/ApiSettings.vue';
import AboutSettings from '@/views/settings/AboutSettings.vue';

const routes = [
  {
    path: '/',
    redirect: '/parse'
  },
  {
    path: '/parse',
    name: 'Parse',
    component: ParsePage,
    meta: { title: '视频解析' }
  },
  {
    path: '/history',
    name: 'History',
    component: HistoryPage,
    meta: { title: '下载历史' }
  },
  {
    path: '/task-queue',
    name: 'TaskQueue',
    component: TaskQueuePage,
    meta: { title: '任务队列' }
  },
  {
    path: '/settings',
    component: SettingsLayout,
    meta: { title: '设置' },
    redirect: '/settings/general',
    children: [
      {
        path: 'general',
        name: 'SettingsGeneral',
        component: GeneralSettings,
        meta: { title: '通用设置' }
      },
      {
        path: 'storage',
        name: 'SettingsStorage',
        component: StorageSettings,
        meta: { title: '存储设置' }
      },
      {
        path: 'account',
        name: 'SettingsAccount',
        component: AccountSettings,
        meta: { title: '账号设置' }
      },
      {
        path: 'api',
        name: 'SettingsApi',
        component: ApiSettings,
        meta: { title: 'API设置' }
      },
      {
        path: 'about',
        name: 'SettingsAbout',
        component: AboutSettings,
        meta: { title: '关于' }
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
