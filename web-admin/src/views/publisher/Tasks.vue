<template>
  <!-- 分发任务页面 -->
  <div class="tasks-container">
    <el-card class="card-container">
      <template #header>
        <div class="card-header">
          <span>分发任务</span>
          <el-button type="primary" @click="handleCreate">新建任务</el-button>
        </div>
      </template>

      <!-- 搜索区域 -->
      <div class="search-box">
        <el-form :model="searchForm" inline>
          <el-form-item label="任务名称">
            <el-input 
              v-model="searchForm.name" 
              placeholder="请输入任务名称" 
              clearable
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="searchForm.status" placeholder="请选择任务状态" clearable>
              <el-option label="待执行" value="pending" />
              <el-option label="执行中" value="running" />
              <el-option label="已完成" value="completed" />
              <el-option label="已失败" value="failed" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
          </el-form-item>
          <el-form-item label="优先级">
            <el-select v-model="searchForm.priority" placeholder="请选择优先级" clearable>
              <el-option label="高" value="high" />
              <el-option label="中" value="medium" />
              <el-option label="低" value="low" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 表格区域 -->
      <el-table 
        :data="tableData" 
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="任务名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="100">
          <template #default="{ row }">
            <el-tag :type="getPriorityTag(row.priority)">
              {{ getPriorityLabel(row.priority) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalAccounts" label="账号数" width="100" />
        <el-table-column prop="successCount" label="成功数" width="100" />
        <el-table-column prop="failureCount" label="失败数" width="100" />
        <el-table-column prop="progress" label="进度" width="120">
          <template #default="{ row }">
            <el-progress 
              :percentage="calculateProgress(row)" 
              :color="getProgressColor(row.status)"
              :status="row.status === 'completed' ? 'success' : row.status === 'failed' ? 'exception' : ''"
            />
          </template>
        </el-table-column>
        <el-table-column prop="scheduledTime" label="计划时间" width="180" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleView(row)">查看</el-button>
            <el-button size="small" type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button 
              size="small" 
              type="success" 
              @click="handleExecute(row)"
              :disabled="row.status !== 'pending'"
            >
              执行
            </el-button>
            <el-dropdown size="small" split-button type="danger" @click="handleCancel(row)">
              取消
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handlePause(row)" v-if="row.status === 'running'">暂停</el-dropdown-item>
                  <el-dropdown-item @click="handleResume(row)" v-if="row.status === 'paused'">恢复</el-dropdown-item>
                  <el-dropdown-item @click="handleRetry(row)" v-if="row.status === 'failed'">重试</el-dropdown-item>
                  <el-dropdown-item @click="handleDelete(row)">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 任务编辑对话框 -->
    <el-dialog 
      v-model="dialog.visible" 
      :title="dialog.title" 
      width="800px"
      @close="handleDialogClose"
    >
      <el-form 
        ref="formRef" 
        :model="formData" 
        :rules="formRules" 
        label-width="120px"
      >
        <el-form-item label="任务名称" prop="name">
          <el-input 
            v-model="formData.name" 
            placeholder="请输入任务名称" 
            maxlength="100"
          />
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="优先级" prop="priority">
              <el-select v-model="formData.priority" placeholder="请选择优先级" style="width: 100%">
                <el-option label="高" value="high" />
                <el-option label="中" value="medium" />
                <el-option label="低" value="low" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="formData.status" placeholder="请选择状态" style="width: 100%">
                <el-option label="待执行" value="pending" />
                <el-option label="执行中" value="running" />
                <el-option label="已暂停" value="paused" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="分发账号">
          <el-transfer
            v-model="selectedAccounts"
            filterable
            :filter-method="filterAccountMethod"
            filter-placeholder="请输入账号名称"
            :data="accountOptions"
            :titles="['可用账号', '已选账号']"
            style="width: 100%;"
          />
        </el-form-item>
        
        <el-form-item label="内容来源">
          <el-select 
            v-model="formData.contentSource" 
            placeholder="请选择内容来源" 
            style="width: 100%"
          >
            <el-option label="手动输入" value="manual" />
            <el-option label="内容库" value="library" />
            <el-option label="实时采集" value="collector" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="分发内容" v-if="formData.contentSource === 'manual'">
          <el-input 
            v-model="formData.content" 
            type="textarea"
            :rows="6"
            placeholder="请输入要分发的内容"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item label="内容模板" v-else>
          <el-input 
            v-model="formData.contentTemplate" 
            type="textarea"
            :rows="4"
            placeholder="请输入内容模板，可使用变量如：{{title}}, {{summary}}"
          />
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="计划时间">
              <el-date-picker
                v-model="formData.scheduledTime"
                type="datetime"
                placeholder="选择计划执行时间"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="发布间隔(秒)">
              <el-input-number 
                v-model="formData.interval" 
                :min="1" 
                :max="3600"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="任务描述">
          <el-input 
            v-model="formData.description" 
            type="textarea"
            :rows="3"
            placeholder="请输入任务描述"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleDialogCancel">取消</el-button>
          <el-button type="primary" @click="handleDialogConfirm">确定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 任务详情对话框 -->
    <el-dialog 
      v-model="detailDialog.visible" 
      title="任务详情" 
      width="900px"
      top="5vh"
    >
      <div v-if="currentItem" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ currentItem.id }}</el-descriptions-item>
          <el-descriptions-item label="任务名称">{{ currentItem.name }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTag(currentItem.status)">{{ getStatusLabel(currentItem.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="优先级">
            <el-tag :type="getPriorityTag(currentItem.priority)">{{ getPriorityLabel(currentItem.priority) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="账号数">{{ currentItem.totalAccounts }}</el-descriptions-item>
          <el-descriptions-item label="成功数">{{ currentItem.successCount }}</el-descriptions-item>
          <el-descriptions-item label="失败数">{{ currentItem.failureCount }}</el-descriptions-item>
          <el-descriptions-item label="进度">
            <el-progress 
              :percentage="calculateProgress(currentItem)" 
              :color="getProgressColor(currentItem.status)"
              :status="currentItem.status === 'completed' ? 'success' : currentItem.status === 'failed' ? 'exception' : ''"
            />
          </el-descriptions-item>
          <el-descriptions-item label="计划时间">{{ currentItem.scheduledTime || '立即执行' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentItem.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="完成时间">{{ currentItem.completedAt || '未完成' }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ currentItem.updatedAt }}</el-descriptions-item>
          <el-descriptions-item label="任务描述" :span="2">{{ currentItem.description || '无' }}</el-descriptions-item>
          <el-descriptions-item label="分发账号" :span="2">
            <div class="account-list">
              <el-tag 
                v-for="account in currentItem.accounts" 
                :key="account.id" 
                type="info"
                style="margin-right: 8px; margin-bottom: 8px;"
              >
                {{ account.name }}({{ getPlatformLabel(account.platform) }})
              </el-tag>
            </div>
          </el-descriptions-item>
        </el-descriptions>
        
        <div class="detail-section">
          <h4>执行详情</h4>
          <el-table :data="executionDetails" style="width: 100%" stripe>
            <el-table-column prop="accountName" label="账号名称" width="150" />
            <el-table-column prop="platform" label="平台" width="100">
              <template #default="{ row }">
                <el-tag :type="getPlatformTag(row.platform)">{{ getPlatformLabel(row.platform) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="执行状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getExecutionStatusTag(row.status)">{{ getExecutionStatusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="publishTime" label="发布时间" width="180" />
            <el-table-column prop="message" label="消息" min-width="150" show-overflow-tooltip />
          </el-table>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailDialog.visible = false">关闭</el-button>
          <el-button type="primary" @click="handleExecute(currentItem)">执行</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

// 分发任务类型定义
interface DistributionTask {
  id: number;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  priority: 'high' | 'medium' | 'low';
  totalAccounts: number;
  successCount: number;
  failureCount: number;
  accounts: Array<{
    id: number;
    name: string;
    platform: string;
  }>;
  contentSource: 'manual' | 'library' | 'collector';
  content?: string;
  contentTemplate?: string;
  scheduledTime?: string;
  interval: number;
  description?: string;
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
}

// 执行详情类型定义
interface ExecutionDetail {
  taskId: number;
  accountName: string;
  platform: string;
  status: 'pending' | 'success' | 'failed' | 'skipped';
  publishTime?: string;
  message?: string;
}

// 搜索表单
const searchForm = reactive({
  name: '',
  status: '',
  priority: ''
});

// 表格数据
const tableData = ref<DistributionTask[]>([]);
const loading = ref(false);

// 分页信息
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
});

// 对话框相关
const dialog = reactive({
  visible: false,
  title: '',
  type: 'create' // 'create' | 'edit'
});

// 详情对话框
const detailDialog = reactive({
  visible: false
});

// 当前操作项目
const currentItem = ref<DistributionTask | null>(null);

// 执行详情
const executionDetails = ref<ExecutionDetail[]>([]);

// 表单数据
const formData = reactive<Partial<DistributionTask>>({
  id: undefined,
  name: '',
  status: 'pending',
  priority: 'medium',
  totalAccounts: 0,
  successCount: 0,
  failureCount: 0,
  contentSource: 'manual',
  content: '',
  contentTemplate: '{{title}}\n\n{{summary}}\n\n#推广 #营销',
  scheduledTime: undefined,
  interval: 60,
  description: ''
});

// 已选账号
const selectedAccounts = ref<number[]>([]);

// 账号选项
const accountOptions = ref([
  { key: 1, label: '科技资讯号(微博)', platform: 'weibo' },
  { key: 2, label: '美食探索家(抖音)', platform: 'douyin' },
  { key: 3, label: '时尚穿搭指南(小红书)', platform: 'xiaohongshu' },
  { key: 4, label: '健康生活圈(知乎)', platform: 'zhihu' },
  { key: 5, label: '财经观察员(头条号)', platform: 'toutiao' },
  { key: 6, label: '旅行摄影师(B站)', platform: 'bilibili' },
  { key: 7, label: '数码测评室(微博)', platform: 'weibo' },
  { key: 8, label: '育儿经验分享(微信)', platform: 'wechat' },
  { key: 9, label: '健身教练(快手)', platform: 'kuaishou' },
  { key: 10, label: '教育资讯站(知乎)', platform: 'zhihu' }
]);

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入任务名称', trigger: 'blur' },
    { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' }
  ],
  priority: [
    { required: true, message: '请选择优先级', trigger: 'change' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
};

// 表单引用
const formRef = ref();

// 过滤账号方法
const filterAccountMethod = (query: string, item: any) => {
  return item.label.toLowerCase().includes(query.toLowerCase());
};

// 获取分发任务列表
const loadData = () => {
  loading.value = true;
  
  // 模拟异步加载数据
  setTimeout(() => {
    // 模拟数据
    const mockData: DistributionTask[] = [
      {
        id: 1,
        name: 'AI科技新闻分发任务',
        status: 'completed',
        priority: 'high',
        totalAccounts: 5,
        successCount: 5,
        failureCount: 0,
        accounts: [
          { id: 1, name: '科技资讯号', platform: 'weibo' },
          { id: 2, name: '数码测评室', platform: 'weibo' },
          { id: 3, name: '财经观察员', platform: 'toutiao' },
          { id: 4, name: '教育资讯站', platform: 'zhihu' },
          { id: 5, name: '旅行摄影师', platform: 'bilibili' }
        ],
        contentSource: 'library',
        contentTemplate: '{{title}}\n\n{{summary}}\n\n#AI #科技 #创新',
        scheduledTime: '2024-01-01 09:00:00',
        interval: 120,
        description: '分发AI相关的科技新闻',
        createdAt: '2024-01-01 08:00:00',
        completedAt: '2024-01-01 09:30:00',
        updatedAt: '2024-01-01 09:30:00'
      },
      {
        id: 2,
        name: '健康生活内容分发',
        status: 'running',
        priority: 'medium',
        totalAccounts: 3,
        successCount: 2,
        failureCount: 0,
        accounts: [
          { id: 1, name: '健康生活圈', platform: 'zhihu' },
          { id: 2, name: '育儿经验分享', platform: 'wechat' },
          { id: 3, name: '健身教练', platform: 'kuaishou' }
        ],
        contentSource: 'manual',
        content: '健康的生活方式对每个人都很重要。今天我们来聊聊如何保持身心健康...',
        scheduledTime: '2024-01-01 10:00:00',
        interval: 180,
        description: '健康生活相关内容分发',
        createdAt: '2024-01-01 09:30:00',
        updatedAt: '2024-01-01 10:15:00'
      },
      {
        id: 3,
        name: '时尚潮流内容推广',
        status: 'pending',
        priority: 'high',
        totalAccounts: 4,
        successCount: 0,
        failureCount: 0,
        accounts: [
          { id: 1, name: '时尚穿搭指南', platform: 'xiaohongshu' },
          { id: 2, name: '美妆博主', platform: 'douyin' },
          { id: 3, name: '潮流前线', platform: 'weibo' },
          { id: 4, name: '穿搭助手', platform: 'xiaohongshu' }
        ],
        contentSource: 'library',
        contentTemplate: '{{title}}\n\n{{summary}}\n\n#时尚 #穿搭 #潮流',
        scheduledTime: '2024-01-01 14:00:00',
        interval: 240,
        description: '时尚潮流相关内容分发',
        createdAt: '2024-01-01 12:00:00',
        updatedAt: '2024-01-01 12:00:00'
      },
      {
        id: 4,
        name: '美食探店内容分发',
        status: 'failed',
        priority: 'medium',
        totalAccounts: 3,
        successCount: 1,
        failureCount: 2,
        accounts: [
          { id: 1, name: '美食探索家', platform: 'douyin' },
          { id: 2, name: '吃货日记', platform: 'kuaishou' },
          { id: 3, name: '美食达人', platform: 'xiaohongshu' }
        ],
        contentSource: 'manual',
        content: '今天给大家推荐一家新开的餐厅，环境优雅，菜品丰富...',
        scheduledTime: '2024-01-01 11:00:00',
        interval: 90,
        description: '美食探店内容分发',
        createdAt: '2024-01-01 10:30:00',
        updatedAt: '2024-01-01 11:30:00'
      },
      {
        id: 5,
        name: '教育资讯内容推送',
        status: 'paused',
        priority: 'low',
        totalAccounts: 2,
        successCount: 1,
        failureCount: 0,
        accounts: [
          { id: 1, name: '教育资讯站', platform: 'zhihu' },
          { id: 2, name: '学习助手', platform: 'toutiao' }
        ],
        contentSource: 'collector',
        contentTemplate: '{{title}}\n\n{{summary}}\n\n#教育 #学习 #知识',
        scheduledTime: '2024-01-01 15:00:00',
        interval: 300,
        description: '教育资讯内容推送',
        createdAt: '2024-01-01 14:00:00',
        updatedAt: '2024-01-01 14:45:00'
      },
      {
        id: 6,
        name: '财经分析内容分发',
        status: 'pending',
        priority: 'high',
        totalAccounts: 4,
        successCount: 0,
        failureCount: 0,
        accounts: [
          { id: 1, name: '财经观察员', platform: 'toutiao' },
          { id: 2, name: '投资指南', platform: 'zhihu' },
          { id: 3, name: '理财助手', platform: 'weibo' },
          { id: 4, name: '股票分析', platform: 'toutiao' }
        ],
        contentSource: 'library',
        contentTemplate: '{{title}}\n\n{{summary}}\n\n#财经 #投资 #理财',
        scheduledTime: '2024-01-01 16:00:00',
        interval: 150,
        description: '财经分析内容分发',
        createdAt: '2024-01-01 15:30:00',
        updatedAt: '2024-01-01 15:30:00'
      },
      {
        id: 7,
        name: '旅游攻略内容推送',
        status: 'completed',
        priority: 'medium',
        totalAccounts: 3,
        successCount: 3,
        failureCount: 0,
        accounts: [
          { id: 1, name: '旅行摄影师', platform: 'bilibili' },
          { id: 2, name: '旅游达人', platform: 'douyin' },
          { id: 3, name: '户外探险', platform: 'xiaohongshu' }
        ],
        contentSource: 'manual',
        content: '春天来了，正是出游的好时节。这里为大家推荐几个适合春游的地方...',
        scheduledTime: '2024-01-01 08:00:00',
        interval: 100,
        description: '旅游攻略内容推送',
        createdAt: '2024-01-01 07:00:00',
        completedAt: '2024-01-01 08:30:00',
        updatedAt: '2024-01-01 08:30:00'
      },
      {
        id: 8,
        name: '数码产品评测分发',
        status: 'pending',
        priority: 'high',
        totalAccounts: 5,
        successCount: 0,
        failureCount: 0,
        accounts: [
          { id: 1, name: '数码测评室', platform: 'weibo' },
          { id: 2, name: '科技玩家', platform: 'zhihu' },
          { id: 3, name: '电子产品站', platform: 'toutiao' },
          { id: 4, name: '数码控', platform: 'xiaohongshu' },
          { id: 5, name: '极客数码', platform: 'bilibili' }
        ],
        contentSource: 'library',
        contentTemplate: '{{title}}\n\n{{summary}}\n\n#数码 #评测 #科技',
        scheduledTime: '2024-01-01 17:00:00',
        interval: 200,
        description: '数码产品评测内容分发',
        createdAt: '2024-01-01 16:00:00',
        updatedAt: '2024-01-01 16:00:00'
      },
      {
        id: 9,
        name: '健身运动内容推广',
        status: 'running',
        priority: 'medium',
        totalAccounts: 3,
        successCount: 1,
        failureCount: 1,
        accounts: [
          { id: 1, name: '健身教练', platform: 'kuaishou' },
          { id: 2, name: '运动达人', platform: 'douyin' },
          { id: 3, name: '瑜伽导师', platform: 'xiaohongshu' }
        ],
        contentSource: 'manual',
        content: '坚持运动对身体有很多好处，今天跟大家分享几个简单的居家运动方法...',
        scheduledTime: '2024-01-01 12:00:00',
        interval: 180,
        description: '健身运动内容推广',
        createdAt: '2024-01-01 11:30:00',
        updatedAt: '2024-01-01 12:15:00'
      },
      {
        id: 10,
        name: '育儿知识内容分发',
        status: 'completed',
        priority: 'low',
        totalAccounts: 2,
        successCount: 2,
        failureCount: 0,
        accounts: [
          { id: 1, name: '育儿经验分享', platform: 'wechat' },
          { id: 2, name: '宝妈课堂', platform: 'zhihu' }
        ],
        contentSource: 'collector',
        contentTemplate: '{{title}}\n\n{{summary}}\n\n#育儿 #教育 #成长',
        scheduledTime: '2024-01-01 13:00:00',
        interval: 240,
        description: '育儿知识内容分发',
        createdAt: '2024-01-01 12:30:00',
        completedAt: '2024-01-01 13:20:00',
        updatedAt: '2024-01-01 13:20:00'
      }
    ];
    
    // 应用搜索过滤
    let filteredData = mockData.filter(item => {
      let match = true;
      if (searchForm.name && !item.name.includes(searchForm.name)) {
        match = false;
      }
      if (searchForm.status && item.status !== searchForm.status) {
        match = false;
      }
      if (searchForm.priority && item.priority !== searchForm.priority) {
        match = false;
      }
      return match;
    });
    
    // 计算总数和当前页数据
    pagination.total = filteredData.length;
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    tableData.value = filteredData.slice(start, end);
    
    loading.value = false;
  }, 500);
};

// 状态标签样式
const getStatusTag = (status: string) => {
  switch (status) {
    case 'pending': return 'info';
    case 'running': return 'primary';
    case 'completed': return 'success';
    case 'failed': return 'danger';
    case 'cancelled': return 'danger';
    case 'paused': return 'warning';
    default: return 'info';
  }
};

// 状态标签显示文本
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending': return '待执行';
    case 'running': return '执行中';
    case 'completed': return '已完成';
    case 'failed': return '已失败';
    case 'cancelled': return '已取消';
    case 'paused': return '已暂停';
    default: return status;
  }
};

// 优先级标签样式
const getPriorityTag = (priority: string) => {
  switch (priority) {
    case 'high': return 'danger';
    case 'medium': return 'warning';
    case 'low': return 'info';
    default: return 'info';
  }
};

// 优先级标签显示文本
const getPriorityLabel = (priority: string) => {
  switch (priority) {
    case 'high': return '高';
    case 'medium': return '中';
    case 'low': return '低';
    default: return priority;
  }
};

// 计算进度
const calculateProgress = (row: DistributionTask) => {
  if (row.totalAccounts === 0) return 0;
  return Math.round(((row.successCount + row.failureCount) / row.totalAccounts) * 100);
};

// 进度条颜色
const getProgressColor = (status: string) => {
  switch (status) {
    case 'completed': return '#67c23a';
    case 'failed': return '#f56c6c';
    case 'running': return '#409eff';
    default: return '#e6a23c';
  }
};

// 平台标签样式
const getPlatformTag = (platform: string) => {
  switch (platform) {
    case 'weibo': return 'warning';
    case 'wechat': return 'success';
    case 'douyin': return 'primary';
    case 'kuaishou': return 'danger';
    case 'xiaohongshu': return 'pink';
    case 'zhihu': return 'blue';
    case 'bilibili': return 'purple';
    case 'toutiao': return 'orange';
    default: return 'info';
  }
};

// 平台标签显示文本
const getPlatformLabel = (platform: string) => {
  switch (platform) {
    case 'weibo': return '微博';
    case 'wechat': return '微信';
    case 'douyin': return '抖音';
    case 'kuaishou': return '快手';
    case 'xiaohongshu': return '小红书';
    case 'zhihu': return '知乎';
    case 'bilibili': return 'B站';
    case 'toutiao': return '头条';
    default: return platform;
  }
};

// 执行状态标签样式
const getExecutionStatusTag = (status: string) => {
  switch (status) {
    case 'pending': return 'info';
    case 'success': return 'success';
    case 'failed': return 'danger';
    case 'skipped': return 'warning';
    default: return 'info';
  }
};

// 执行状态标签显示文本
const getExecutionStatusLabel = (status: string) => {
  switch (status) {
    case 'pending': return '待执行';
    case 'success': return '成功';
    case 'failed': return '失败';
    case 'skipped': return '跳过';
    default: return status;
  }
};

// 搜索
const handleSearch = () => {
  pagination.currentPage = 1;
  loadData();
};

// 重置
const handleReset = () => {
  searchForm.name = '';
  searchForm.status = '';
  searchForm.priority = '';
  pagination.currentPage = 1;
  loadData();
};

// 分页大小改变
const handleSizeChange = (val: number) => {
  pagination.pageSize = val;
  loadData();
};

// 当前页改变
const handleCurrentChange = (val: number) => {
  pagination.currentPage = val;
  loadData();
};

// 打开创建对话框
const handleCreate = () => {
  dialog.type = 'create';
  dialog.title = '新建分发任务';
  dialog.visible = true;
  
  // 重置表单
  Object.assign(formData, {
    id: undefined,
    name: '',
    status: 'pending',
    priority: 'medium',
    totalAccounts: 0,
    successCount: 0,
    failureCount: 0,
    contentSource: 'manual',
    content: '',
    contentTemplate: '{{title}}\n\n{{summary}}\n\n#推广 #营销',
    scheduledTime: undefined,
    interval: 60,
    description: ''
  });
  
  selectedAccounts.value = [];
};

// 打开编辑对话框
const handleEdit = (row: DistributionTask) => {
  dialog.type = 'edit';
  dialog.title = '编辑分发任务';
  dialog.visible = true;
  
  // 填充表单数据
  Object.assign(formData, { ...row });
  
  // 设置已选账号
  selectedAccounts.value = row.accounts.map(acc => acc.id);
};

// 查看任务详情
const handleView = (row: DistributionTask) => {
  currentItem.value = { ...row };
  
  // 生成执行详情模拟数据
  executionDetails.value = [];
  row.accounts.forEach((account, index) => {
    const statuses: ('pending' | 'success' | 'failed' | 'skipped')[] = ['success', 'failed', 'pending', 'skipped'];
    const status = 
      row.status === 'completed' ? (index < row.successCount ? 'success' : 'failed') :
      row.status === 'failed' ? (index < row.failureCount ? 'failed' : 'pending') :
      row.status === 'running' ? (index < row.successCount + row.failureCount ? 
        (index < row.successCount ? 'success' : 'failed') : 'pending') :
      'pending';
    
    executionDetails.value.push({
      taskId: row.id,
      accountName: account.name,
      platform: account.platform,
      status: status,
      publishTime: status !== 'pending' ? new Date(Date.now() - Math.random() * 1000 * 60 * 60).toLocaleString() : undefined,
      message: status === 'failed' ? '发布失败：内容违规' : status === 'success' ? '发布成功' : undefined
    });
  });
  
  detailDialog.visible = true;
};

// 执行任务
const handleExecute = async (row: DistributionTask) => {
  try {
    await ElMessageBox.confirm(
      '确定要执行此分发任务吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 模拟执行任务
    row.status = 'running';
    row.updatedAt = new Date().toLocaleString();
    
    // 模拟执行过程
    const interval = setInterval(() => {
      if (row.status !== 'running') {
        clearInterval(interval);
        return;
      }
      
      // 更新进度
      if (row.successCount + row.failureCount < row.totalAccounts) {
        if (Math.random() > 0.3) { // 70% 成功率
          row.successCount += 1;
        } else {
          row.failureCount += 1;
        }
      } else {
        // 任务完成
        row.status = row.failureCount > 0 ? 'completed' : 'completed';
        row.completedAt = new Date().toLocaleString();
        clearInterval(interval);
      }
    }, 1000);
    
    ElMessage.success('任务开始执行');
  } catch (error) {
    console.error('Execute cancelled:', error);
  }
};

// 暂停任务
const handlePause = async (row: DistributionTask) => {
  try {
    await ElMessageBox.confirm(
      '确定要暂停此任务吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    row.status = 'paused';
    row.updatedAt = new Date().toLocaleString();
    
    ElMessage.success('任务已暂停');
  } catch (error) {
    console.error('Pause cancelled:', error);
  }
};

// 恢复任务
const handleResume = async (row: DistributionTask) => {
  try {
    await ElMessageBox.confirm(
      '确定要恢复此任务吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    row.status = 'running';
    row.updatedAt = new Date().toLocaleString();
    
    ElMessage.success('任务已恢复');
  } catch (error) {
    console.error('Resume cancelled:', error);
  }
};

// 重试任务
const handleRetry = async (row: DistributionTask) => {
  try {
    await ElMessageBox.confirm(
      '确定要重试此任务吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 重置失败计数
    row.failureCount = 0;
    row.status = 'pending';
    row.updatedAt = new Date().toLocaleString();
    
    ElMessage.success('任务已重置为待执行');
  } catch (error) {
    console.error('Retry cancelled:', error);
  }
};

// 取消任务
const handleCancel = async (row: DistributionTask) => {
  try {
    await ElMessageBox.confirm(
      '确定要取消此任务吗？',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'error'
      }
    );
    
    row.status = 'cancelled';
    row.updatedAt = new Date().toLocaleString();
    
    ElMessage.success('任务已取消');
  } catch (error) {
    console.error('Cancel cancelled:', error);
  }
};

// 删除任务
const handleDelete = async (row: DistributionTask) => {
  try {
    await ElMessageBox.confirm(
      '此操作将永久删除该分发任务, 是否继续?',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'error'
      }
    );
    
    // 模拟删除API调用
    const index = tableData.value.findIndex(item => item.id === row.id);
    if (index > -1) {
      tableData.value.splice(index, 1);
      pagination.total--;
      ElMessage.success('删除成功');
    }
  } catch (error) {
    console.error('Delete cancelled:', error);
  }
};

// 关闭对话框
const handleDialogClose = () => {
  if (formRef.value) {
    formRef.value.clearValidate();
  }
};

// 取消对话框
const handleDialogCancel = () => {
  dialog.visible = false;
};

// 确认对话框
const handleDialogConfirm = async () => {
  if (!formRef.value) return;
  
  try {
    await formRef.value.validate();
    
    // 模拟API调用
    if (dialog.type === 'create') {
      // 添加新任务
      const newTask: DistributionTask = {
        id: Math.max(...tableData.value.map(item => item.id), 0) + 1,
        name: formData.name!,
        status: formData.status as any,
        priority: formData.priority as any,
        totalAccounts: selectedAccounts.value.length,
        successCount: 0,
        failureCount: 0,
        accounts: accountOptions.value
          .filter(opt => selectedAccounts.value.includes(opt.key))
          .map(opt => ({
            id: opt.key,
            name: opt.label.split('(')[0],
            platform: opt.platform
          })),
        contentSource: formData.contentSource as any,
        content: formData.content,
        contentTemplate: formData.contentTemplate,
        scheduledTime: formData.scheduledTime,
        interval: formData.interval || 60,
        description: formData.description,
        createdAt: new Date().toLocaleString(),
        updatedAt: new Date().toLocaleString()
      };
      
      tableData.value.unshift(newTask);
      pagination.total++;
      ElMessage.success('添加成功');
    } else {
      // 更新现有任务
      const index = tableData.value.findIndex(item => item.id === formData.id);
      if (index > -1) {
        Object.assign(tableData.value[index], {
          ...formData,
          totalAccounts: selectedAccounts.value.length,
          accounts: accountOptions.value
            .filter(opt => selectedAccounts.value.includes(opt.key))
            .map(opt => ({
              id: opt.key,
              name: opt.label.split('(')[0],
              platform: opt.platform
            })),
          updatedAt: new Date().toLocaleString()
        });
        ElMessage.success('更新成功');
      }
    }
    
    dialog.visible = false;
    loadData(); // 刷新数据
  } catch (error) {
    console.error('Validation failed:', error);
  }
};

// 初始化
onMounted(() => {
  loadData();
});
</script>

<style scoped>
.tasks-container {
  padding: 20px;
}

.card-container {
  min-height: 600px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-box {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}

.dialog-footer {
  text-align: right;
}

.detail-content {
  max-height: 70vh;
  overflow-y: auto;
}

.detail-section {
  margin-top: 25px;
}

.detail-section h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: bold;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

.account-list {
  display: flex;
  flex-wrap: wrap;
}

:deep(.el-descriptions__content) {
  word-break: break-all;
}
</style>