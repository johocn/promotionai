<template>
  <!-- 发布记录页面 -->
  <div class="records-container">
    <el-card class="card-container">
      <template #header>
        <div class="card-header">
          <span>发布记录</span>
          <div class="header-actions">
            <el-button type="primary" @click="handleRefresh">刷新</el-button>
            <el-button type="success" @click="handleExport">导出记录</el-button>
          </div>
        </div>
      </template>

      <!-- 搜索区域 -->
      <div class="search-box">
        <el-form :model="searchForm" inline>
          <el-form-item label="内容标题">
            <el-input 
              v-model="searchForm.title" 
              placeholder="请输入内容标题" 
              clearable
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item label="发布平台">
            <el-select v-model="searchForm.platform" placeholder="请选择发布平台" clearable>
              <el-option label="微博" value="weibo" />
              <el-option label="微信公众号" value="wechat" />
              <el-option label="抖音" value="douyin" />
              <el-option label="快手" value="kuaishou" />
              <el-option label="小红书" value="xiaohongshu" />
              <el-option label="知乎" value="zhihu" />
              <el-option label="B站" value="bilibili" />
              <el-option label="头条号" value="toutiao" />
            </el-select>
          </el-form-item>
          <el-form-item label="发布状态">
            <el-select v-model="searchForm.status" placeholder="请选择发布状态" clearable>
              <el-option label="成功" value="success" />
              <el-option label="失败" value="failed" />
              <el-option label="待发布" value="pending" />
              <el-option label="已撤回" value="withdrawn" />
            </el-select>
          </el-form-item>
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="dateRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DD HH:mm:ss"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 统计卡片区域 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-item">
              <div class="stat-number">{{ stats.total }}</div>
              <div class="stat-label">总发布数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-item">
              <div class="stat-number" :style="{ color: '#67C23A' }">{{ stats.success }}</div>
              <div class="stat-label">成功数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-item">
              <div class="stat-number" :style="{ color: '#F56C6C' }">{{ stats.failed }}</div>
              <div class="stat-label">失败数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-item">
              <div class="stat-number" :style="{ color: '#E6A23C' }">{{ stats.pending }}</div>
              <div class="stat-label">待发布数</div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 表格区域 -->
      <el-table 
        :data="tableData" 
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="内容标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="platform" label="发布平台" width="120">
          <template #default="{ row }">
            <el-tag :type="getPlatformTag(row.platform)">{{ getPlatformLabel(row.platform) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="accountName" label="发布账号" width="150" />
        <el-table-column prop="status" label="发布状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="publishTime" label="发布时间" width="180" />
        <el-table-column prop="costTime" label="耗时(秒)" width="100" />
        <el-table-column prop="retryCount" label="重试次数" width="100" />
        <el-table-column prop="message" label="结果信息" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleView(row)">详情</el-button>
            <el-button 
              size="small" 
              type="primary" 
              @click="handleRetry(row)"
              :disabled="row.status !== 'failed'"
            >
              重试
            </el-button>
            <el-dropdown size="small" split-button type="danger" @click="handleWithdraw(row)">
              更多
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleViewContent(row)" v-if="row.content">查看原文</el-dropdown-item>
                  <el-dropdown-item @click="handleCopyLink(row)" v-if="row.publishLink">复制链接</el-dropdown-item>
                  <el-dropdown-item @click="handleWithdraw(row)" v-if="row.status === 'success'">撤回</el-dropdown-item>
                  <el-dropdown-item @click="handleDelete(row)">删除记录</el-dropdown-item>
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

    <!-- 发布记录详情对话框 -->
    <el-dialog 
      v-model="detailDialog.visible" 
      title="发布记录详情" 
      width="900px"
      top="5vh"
    >
      <div v-if="currentItem" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ currentItem.id }}</el-descriptions-item>
          <el-descriptions-item label="内容标题">{{ currentItem.title }}</el-descriptions-item>
          <el-descriptions-item label="发布平台">
            <el-tag :type="getPlatformTag(currentItem.platform)">{{ getPlatformLabel(currentItem.platform) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="发布账号">{{ currentItem.accountName }}</el-descriptions-item>
          <el-descriptions-item label="发布状态">
            <el-tag :type="getStatusTag(currentItem.status)">{{ getStatusLabel(currentItem.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="耗时">{{ currentItem.costTime }}秒</el-descriptions-item>
          <el-descriptions-item label="重试次数">{{ currentItem.retryCount }}</el-descriptions-item>
          <el-descriptions-item label="发布时间">{{ currentItem.publishTime }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentItem.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ currentItem.updatedAt }}</el-descriptions-item>
          <el-descriptions-item label="结果信息" :span="2">{{ currentItem.message || '无' }}</el-descriptions-item>
          <el-descriptions-item label="发布链接" :span="2">
            <a v-if="currentItem.publishLink" :href="currentItem.publishLink" target="_blank">{{ currentItem.publishLink }}</a>
            <span v-else>无</span>
          </el-descriptions-item>
          <el-descriptions-item label="错误详情" :span="2">{{ currentItem.errorDetail || '无' }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailDialog.visible = false">关闭</el-button>
          <el-button type="primary" @click="handleRetry(currentItem)">重试</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 内容预览对话框 -->
    <el-dialog 
      v-model="contentDialog.visible" 
      title="内容预览" 
      width="800px"
      top="5vh"
    >
      <div v-if="currentItem" class="content-preview">
        <h3>{{ currentItem.title }}</h3>
        <div class="content-body" v-html="formatContent(currentItem.content || '')"></div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="contentDialog.visible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

// 发布记录类型定义
interface PublishRecord {
  id: number;
  title: string;
  platform: 'weibo' | 'wechat' | 'douyin' | 'kuaishou' | 'xiaohongshu' | 'zhihu' | 'bilibili' | 'toutiao';
  accountName: string;
  status: 'pending' | 'success' | 'failed' | 'withdrawn';
  publishTime?: string;
  costTime: number;
  retryCount: number;
  message?: string;
  errorDetail?: string;
  publishLink?: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
}

// 搜索表单
const searchForm = reactive({
  title: '',
  platform: '',
  status: '',
  startTime: '',
  endTime: ''
});

// 时间范围
const dateRange = ref<[string, string] | null>(null);

// 表格数据
const tableData = ref<PublishRecord[]>([]);
const loading = ref(false);

// 分页信息
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
});

// 统计信息
const stats = reactive({
  total: 0,
  success: 0,
  failed: 0,
  pending: 0
});

// 详情对话框
const detailDialog = reactive({
  visible: false
});

// 内容预览对话框
const contentDialog = reactive({
  visible: false
});

// 当前操作项目
const currentItem = ref<PublishRecord | null>(null);

// 获取发布记录列表
const loadData = () => {
  loading.value = true;
  
  // 模拟异步加载数据
  setTimeout(() => {
    // 模拟数据
    const mockData: PublishRecord[] = [
      {
        id: 1,
        title: '人工智能在医疗领域的最新突破',
        platform: 'weibo',
        accountName: '科技资讯号',
        status: 'success',
        publishTime: '2024-01-01 10:30:15',
        costTime: 5,
        retryCount: 0,
        message: '发布成功',
        publishLink: 'https://weibo.com/1234567890',
        content: '人工智能技术在医疗领域的应用正在快速发展，最新的研究成果显示...',
        createdAt: '2024-01-01 10:30:10',
        updatedAt: '2024-01-01 10:30:15'
      },
      {
        id: 2,
        title: '全球股市迎来新一轮上涨行情',
        platform: 'toutiao',
        accountName: '财经观察员',
        status: 'success',
        publishTime: '2024-01-01 11:45:30',
        costTime: 8,
        retryCount: 1,
        message: '发布成功',
        publishLink: 'https://toutiao.com/article/123456',
        content: '受利好政策影响，全球主要股市普遍上涨，投资者信心明显增强...',
        createdAt: '2024-01-01 11:45:22',
        updatedAt: '2024-01-01 11:45:30'
      },
      {
        id: 3,
        title: '新能源汽车销量创新高',
        platform: 'zhihu',
        accountName: '教育资讯站',
        status: 'failed',
        costTime: 12,
        retryCount: 3,
        message: '发布失败：内容违规',
        errorDetail: '检测到敏感词汇，发布被平台拒绝',
        content: '本月新能源汽车销量同比增长超过50%，市场需求持续旺盛...',
        createdAt: '2024-01-01 12:15:00',
        updatedAt: '2024-01-01 12:15:36'
      },
      {
        id: 4,
        title: '科技创新大会圆满落幕',
        platform: 'douyin',
        accountName: '美食探索家',
        status: 'success',
        publishTime: '2024-01-01 13:20:45',
        costTime: 15,
        retryCount: 0,
        message: '发布成功',
        publishLink: 'https://douyin.com/video/123456789',
        content: '为期三天的科技创新大会展示了众多前沿技术，吸引了全球关注...',
        createdAt: '2024-01-01 13:20:30',
        updatedAt: '2024-01-01 13:20:45'
      },
      {
        id: 5,
        title: '健康饮食新潮流',
        platform: 'xiaohongshu',
        accountName: '时尚穿搭指南',
        status: 'success',
        publishTime: '2024-01-01 14:10:20',
        costTime: 6,
        retryCount: 0,
        message: '发布成功',
        publishLink: 'https://xiaohongshu.com/note/123456',
        content: '专家推荐的健康饮食方法受到广泛关注，新的饮食理念正在兴起...',
        createdAt: '2024-01-01 14:10:14',
        updatedAt: '2024-01-01 14:10:20'
      },
      {
        id: 6,
        title: '教育改革新政策解读',
        platform: 'zhihu',
        accountName: '教育资讯站',
        status: 'pending',
        costTime: 0,
        retryCount: 0,
        message: '待发布',
        content: '教育部发布新政策，推动教育公平发展，重点关注教育资源均衡分配...',
        createdAt: '2024-01-01 15:00:00',
        updatedAt: '2024-01-01 15:00:00'
      },
      {
        id: 7,
        title: '旅游景点推荐攻略',
        platform: 'bilibili',
        accountName: '旅行摄影师',
        status: 'success',
        publishTime: '2024-01-01 16:30:10',
        costTime: 20,
        retryCount: 0,
        message: '发布成功',
        publishLink: 'https://bilibili.com/video/BV123456',
        content: '春暖花开时节，适合出游踏青，推荐几个热门旅游目的地...',
        createdAt: '2024-01-01 16:29:50',
        updatedAt: '2024-01-01 16:30:10'
      },
      {
        id: 8,
        title: '房产市场调控政策分析',
        platform: 'toutiao',
        accountName: '财经观察员',
        status: 'withdrawn',
        publishTime: '2024-01-01 17:45:00',
        costTime: 7,
        retryCount: 0,
        message: '已撤回',
        publishLink: 'https://toutiao.com/article/789012',
        content: '最新房产调控政策对市场产生积极影响，有助于稳定房价...',
        createdAt: '2024-01-01 17:44:53',
        updatedAt: '2024-01-01 18:00:00'
      },
      {
        id: 9,
        title: '人工智能伦理问题探讨',
        platform: 'zhihu',
        accountName: '教育资讯站',
        status: 'failed',
        costTime: 25,
        retryCount: 5,
        message: '发布失败：API调用超时',
        errorDetail: '网络连接超时，API响应失败',
        content: '随着AI技术的发展，伦理问题日益凸显，需要建立相应的规范和标准...',
        createdAt: '2024-01-01 18:20:00',
        updatedAt: '2024-01-01 18:20:50'
      },
      {
        id: 10,
        title: '美食探店体验分享',
        platform: 'douyin',
        accountName: '美食探索家',
        status: 'success',
        publishTime: '2024-01-01 19:15:30',
        costTime: 10,
        retryCount: 0,
        message: '发布成功',
        publishLink: 'https://douyin.com/video/987654321',
        content: '今天给大家推荐一家新开的餐厅，环境优雅，菜品丰富，服务周到...',
        createdAt: '2024-01-01 19:15:20',
        updatedAt: '2024-01-01 19:15:30'
      }
    ];
    
    // 应用搜索过滤
    let filteredData = mockData.filter(item => {
      let match = true;
      
      // 标题过滤
      if (searchForm.title && !item.title.includes(searchForm.title)) {
        match = false;
      }
      
      // 平台过滤
      if (searchForm.platform && item.platform !== searchForm.platform) {
        match = false;
      }
      
      // 状态过滤
      if (searchForm.status && item.status !== searchForm.status) {
        match = false;
      }
      
      // 时间范围过滤
      if (dateRange.value) {
        const publishTime = new Date(item.publishTime || item.createdAt).getTime();
        const startTime = new Date(dateRange.value[0]).getTime();
        const endTime = new Date(dateRange.value[1]).getTime();
        
        if (publishTime < startTime || publishTime > endTime) {
          match = false;
        }
      }
      
      return match;
    });
    
    // 计算总数和当前页数据
    pagination.total = filteredData.length;
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    tableData.value = filteredData.slice(start, end);
    
    // 计算统计数据
    stats.total = mockData.length;
    stats.success = mockData.filter(item => item.status === 'success').length;
    stats.failed = mockData.filter(item => item.status === 'failed').length;
    stats.pending = mockData.filter(item => item.status === 'pending').length;
    
    loading.value = false;
  }, 500);
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
    case 'wechat': return '微信公众号';
    case 'douyin': return '抖音';
    case 'kuaishou': return '快手';
    case 'xiaohongshu': return '小红书';
    case 'zhihu': return '知乎';
    case 'bilibili': return 'B站';
    case 'toutiao': return '头条号';
    default: return platform;
  }
};

// 状态标签样式
const getStatusTag = (status: string) => {
  switch (status) {
    case 'pending': return 'info';
    case 'success': return 'success';
    case 'failed': return 'danger';
    case 'withdrawn': return 'warning';
    default: return 'info';
  }
};

// 状态标签显示文本
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending': return '待发布';
    case 'success': return '成功';
    case 'failed': return '失败';
    case 'withdrawn': return '已撤回';
    default: return status;
  }
};

// 格式化内容显示
const formatContent = (content: string) => {
  return content.replace(/\n/g, '<br>');
};

// 搜索
const handleSearch = () => {
  pagination.currentPage = 1;
  loadData();
};

// 重置
const handleReset = () => {
  searchForm.title = '';
  searchForm.platform = '';
  searchForm.status = '';
  dateRange.value = null;
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

// 刷新
const handleRefresh = () => {
  loadData();
  ElMessage.success('已刷新数据');
};

// 导出记录
const handleExport = () => {
  ElMessage.success('导出功能开发中...');
};

// 查看详情
const handleView = (row: PublishRecord) => {
  currentItem.value = { ...row };
  detailDialog.visible = true;
};

// 重试发布
const handleRetry = async (row: PublishRecord) => {
  try {
    await ElMessageBox.confirm(
      '确定要重试发布此内容吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 模拟重试过程
    row.status = 'pending';
    row.retryCount += 1;
    row.updatedAt = new Date().toLocaleString();
    
    // 模拟发布过程
    setTimeout(() => {
      row.status = 'success';
      row.publishTime = new Date().toLocaleString();
      row.costTime = Math.floor(Math.random() * 10) + 5; // 5-15秒
      row.message = '重试发布成功';
      row.updatedAt = new Date().toLocaleString();
      
      ElMessage.success('重试发布成功');
    }, 2000);
  } catch (error) {
    console.error('Retry cancelled:', error);
  }
};

// 撤回发布
const handleWithdraw = async (row: PublishRecord) => {
  try {
    await ElMessageBox.confirm(
      '确定要撤回此发布吗？',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'error'
      }
    );
    
    // 模拟撤回操作
    if (row.status === 'success') {
      row.status = 'withdrawn';
      row.message = '已撤回';
      row.updatedAt = new Date().toLocaleString();
      
      ElMessage.success('撤回成功');
    }
  } catch (error) {
    console.error('Withdraw cancelled:', error);
  }
};

// 查看原文
const handleViewContent = (row: PublishRecord) => {
  currentItem.value = { ...row };
  contentDialog.visible = true;
};

// 复制链接
const handleCopyLink = (row: PublishRecord) => {
  if (row.publishLink) {
    navigator.clipboard.writeText(row.publishLink)
      .then(() => {
        ElMessage.success('链接已复制到剪贴板');
      })
      .catch(err => {
        ElMessage.error('复制链接失败');
        console.error('Failed to copy link: ', err);
      });
  } else {
    ElMessage.warning('没有可复制的链接');
  }
};

// 删除记录
const handleDelete = async (row: PublishRecord) => {
  try {
    await ElMessageBox.confirm(
      '此操作将永久删除该发布记录, 是否继续?',
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

// 初始化
onMounted(() => {
  loadData();
});
</script>

<style scoped>
.records-container {
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

.header-actions {
  display: flex;
  gap: 10px;
}

.search-box {
  margin-bottom: 20px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-item {
  width: 100%;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}

.detail-content {
  max-height: 70vh;
  overflow-y: auto;
}

.content-preview {
  max-height: 60vh;
  overflow-y: auto;
}

.content-preview h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
  font-weight: bold;
}

.content-body {
  line-height: 1.6;
  color: #606266;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-descriptions__content) {
  word-break: break-all;
}
</style>