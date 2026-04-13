<template>
  <!-- 资讯列表页面 -->
  <div class="list-container">
    <el-card class="card-container">
      <template #header>
        <div class="card-header">
          <span>资讯列表</span>
          <div class="header-actions">
            <el-button type="primary" @click="handleRefresh">刷新</el-button>
            <el-button type="success" @click="handleBatchPublish">批量发布</el-button>
            <el-button type="danger" @click="handleBatchDelete">批量删除</el-button>
          </div>
        </div>
      </template>

      <!-- 搜索区域 -->
      <div class="search-box">
        <el-form :model="searchForm" inline>
          <el-form-item label="标题">
            <el-input 
              v-model="searchForm.title" 
              placeholder="请输入标题" 
              clearable
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item label="来源">
            <el-select v-model="searchForm.source" placeholder="请选择来源" clearable>
              <el-option label="科技新闻RSS" value="tech_rss" />
              <el-option label="微博热搜API" value="weibo_api" />
              <el-option label="知乎热门爬虫" value="zhihu_crawler" />
              <el-option label="抖音热榜API" value="douyin_api" />
              <el-option label="Twitter趋势" value="twitter_trend" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
              <el-option label="待处理" value="pending" />
              <el-option label="已采集" value="collected" />
              <el-option label="已处理" value="processed" />
              <el-option label="已发布" value="published" />
              <el-option label="已删除" value="deleted" />
            </el-select>
          </el-form-item>
          <el-form-item label="分类">
            <el-input 
              v-model="searchForm.category" 
              placeholder="请输入分类" 
              clearable
            />
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
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="标题" min-width="250" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="title-cell">
              <span>{{ row.title }}</span>
              <el-tag 
                v-if="row.isOriginal" 
                type="success" 
                size="small"
                style="margin-left: 8px;"
              >
                原创
              </el-tag>
              <el-tag 
                v-if="row.isHot" 
                type="danger" 
                size="small"
                style="margin-left: 8px;"
              >
                热门
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="source" label="来源" width="150">
          <template #default="{ row }">
            <el-tag type="info">{{ getSourceLabel(row.source) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="wordCount" label="字数" width="80" />
        <el-table-column prop="publishDate" label="发布时间" width="180" />
        <el-table-column prop="createdAt" label="采集时间" width="180" />
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleView(row)">查看</el-button>
            <el-button size="small" type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button 
              size="small" 
              :type="row.status === 'published' ? 'info' : 'success'"
              @click="handlePublish(row)"
            >
              {{ row.status === 'published' ? '已发布' : '发布' }}
            </el-button>
            <el-dropdown size="small" split-button type="danger" @click="handleDelete(row)">
              删除
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleSoftDelete(row)">软删除</el-dropdown-item>
                  <el-dropdown-item @click="handleHardDelete(row)">硬删除</el-dropdown-item>
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

    <!-- 资讯详情对话框 -->
    <el-dialog 
      v-model="detailDialog.visible" 
      title="资讯详情" 
      width="900px"
      top="5vh"
    >
      <div v-if="detailData" class="detail-content">
        <div class="detail-header">
          <h3>{{ detailData.title }}</h3>
          <div class="detail-meta">
            <el-tag type="info" style="margin-right: 10px;">{{ getSourceLabel(detailData.source) }}</el-tag>
            <el-tag type="warning" style="margin-right: 10px;">{{ detailData.category }}</el-tag>
            <el-tag :type="getStatusTag(detailData.status)">{{ getStatusLabel(detailData.status) }}</el-tag>
          </div>
        </div>
        
        <div class="detail-body">
          <div class="detail-section">
            <h4>摘要</h4>
            <p>{{ detailData.summary || '暂无摘要' }}</p>
          </div>
          
          <div class="detail-section">
            <h4>内容</h4>
            <div class="content-preview" v-html="detailData.content"></div>
          </div>
          
          <div class="detail-section">
            <h4>关键词</h4>
            <div class="keywords-container">
              <el-tag 
                v-for="(keyword, index) in detailData.keywords || []" 
                :key="index" 
                type="primary"
                style="margin-right: 8px; margin-bottom: 8px;"
              >
                {{ keyword }}
              </el-tag>
              <span v-if="!(detailData.keywords && detailData.keywords.length)" class="no-keywords">暂无关键词</span>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>统计信息</h4>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="字数">{{ detailData.wordCount }}</el-descriptions-item>
              <el-descriptions-item label="阅读时长">{{ Math.ceil(detailData.wordCount / 300) }}分钟</el-descriptions-item>
              <el-descriptions-item label="热度">{{ detailData.hotScore || 0 }}</el-descriptions-item>
              <el-descriptions-item label="点赞数">{{ detailData.likes || 0 }}</el-descriptions-item>
              <el-descriptions-item label="评论数">{{ detailData.comments || 0 }}</el-descriptions-item>
              <el-descriptions-item label="分享数">{{ detailData.shares || 0 }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailDialog.visible = false">关闭</el-button>
          <el-button type="primary" @click="handleEdit(detailData)">编辑</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 编辑对话框 -->
    <el-dialog 
      v-model="editDialog.visible" 
      :title="editDialog.title" 
      width="900px"
      top="5vh"
      @close="handleEditDialogClose"
    >
      <el-form 
        ref="editFormRef" 
        :model="editFormData" 
        :rules="editFormRules" 
        label-width="100px"
      >
        <el-form-item label="标题" prop="title">
          <el-input 
            v-model="editFormData.title" 
            placeholder="请输入标题" 
            maxlength="200"
          />
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="来源" prop="source">
              <el-select v-model="editFormData.source" placeholder="请选择来源" style="width: 100%">
                <el-option label="科技新闻RSS" value="tech_rss" />
                <el-option label="微博热搜API" value="weibo_api" />
                <el-option label="知乎热门爬虫" value="zhihu_crawler" />
                <el-option label="抖音热榜API" value="douyin_api" />
                <el-option label="Twitter趋势" value="twitter_trend" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分类" prop="category">
              <el-input v-model="editFormData.category" placeholder="请输入分类" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="摘要">
          <el-input 
            v-model="editFormData.summary" 
            type="textarea"
            :rows="3"
            placeholder="请输入摘要"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item label="内容" prop="content">
          <el-input 
            v-model="editFormData.content" 
            type="textarea"
            :rows="10"
            placeholder="请输入内容"
          />
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="字数">
              <el-input-number 
                v-model="editFormData.wordCount" 
                :min="0"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="热度">
              <el-input-number 
                v-model="editFormData.hotScore" 
                :min="0"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="关键词">
          <el-input 
            v-model="editFormData.keywordsStr" 
            placeholder="请输入关键词，用逗号分隔"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleEditDialogCancel">取消</el-button>
          <el-button type="primary" @click="handleEditDialogConfirm">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

// 资讯类型定义
interface NewsItem {
  id: number;
  title: string;
  source: string;
  category: string;
  status: 'pending' | 'collected' | 'processed' | 'published' | 'deleted';
  summary?: string;
  content: string;
  keywords?: string[];
  wordCount: number;
  hotScore?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  isOriginal: boolean;
  isHot: boolean;
  publishDate?: string;
  createdAt: string;
  updatedAt: string;
}

// 搜索表单
const searchForm = reactive({
  title: '',
  source: '',
  status: '',
  category: ''
});

// 表格数据
const tableData = ref<NewsItem[]>([]);
const loading = ref(false);
const selectedRows = ref<NewsItem[]>([]);

// 分页信息
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
});

// 详情对话框
const detailDialog = reactive({
  visible: false
});

// 详情数据
const detailData = ref<NewsItem | null>(null);

// 编辑对话框
const editDialog = reactive({
  visible: false,
  title: ''
});

// 编辑表单数据
const editFormData = reactive<Partial<NewsItem> & { keywordsStr?: string }>({
  id: undefined,
  title: '',
  source: '',
  category: '',
  status: 'collected',
  summary: '',
  content: '',
  keywords: [],
  wordCount: 0,
  hotScore: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  isOriginal: false,
  isHot: false,
  keywordsStr: ''
});

// 编辑表单验证规则
const editFormRules = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    { min: 1, max: 200, message: '长度在 1 到 200 个字符', trigger: 'blur' }
  ],
  source: [
    { required: true, message: '请选择来源', trigger: 'change' }
  ],
  category: [
    { required: true, message: '请输入分类', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入内容', trigger: 'blur' }
  ]
};

// 编辑表单引用
const editFormRef = ref();

// 获取资讯列表
const loadData = () => {
  loading.value = true;
  
  // 模拟异步加载数据
  setTimeout(() => {
    // 模拟数据
    const mockData: NewsItem[] = [
      {
        id: 1,
        title: '人工智能在医疗领域的最新突破',
        source: 'tech_rss',
        category: '科技',
        status: 'published',
        summary: '最新的AI技术在医疗诊断中展现出前所未有的准确性和效率。',
        content: '<p>人工智能技术在医疗领域的应用正在快速发展...</p><p>研究人员开发了一种新的算法...</p>',
        keywords: ['人工智能', '医疗', '诊断', '算法'],
        wordCount: 1200,
        hotScore: 95,
        likes: 120,
        comments: 25,
        shares: 45,
        isOriginal: true,
        isHot: true,
        publishDate: '2024-01-01 10:00:00',
        createdAt: '2024-01-01 09:30:00',
        updatedAt: '2024-01-01 10:00:00'
      },
      {
        id: 2,
        title: '全球股市迎来新一轮上涨行情',
        source: 'weibo_api',
        category: '财经',
        status: 'processed',
        summary: '受利好政策影响，全球主要股市普遍上涨。',
        content: '<p>受到多项利好政策推动...</p><p>投资者信心明显增强...</p>',
        keywords: ['股市', '上涨', '投资', '经济'],
        wordCount: 850,
        hotScore: 80,
        likes: 85,
        comments: 18,
        shares: 32,
        isOriginal: false,
        isHot: true,
        publishDate: '2024-01-01 11:00:00',
        createdAt: '2024-01-01 10:45:00',
        updatedAt: '2024-01-01 11:00:00'
      },
      {
        id: 3,
        title: '新能源汽车销量创新高',
        source: 'zhihu_crawler',
        category: '汽车',
        status: 'collected',
        summary: '本月新能源汽车销量同比增长超过50%。',
        content: '<p>新能源汽车市场持续火热...</p><p>消费者对环保车型的需求不断增长...</p>',
        keywords: ['新能源', '汽车', '销量', '环保'],
        wordCount: 750,
        hotScore: 75,
        likes: 65,
        comments: 15,
        shares: 28,
        isOriginal: true,
        isHot: false,
        createdAt: '2024-01-01 12:00:00',
        updatedAt: '2024-01-01 12:00:00'
      },
      {
        id: 4,
        title: '明星恋情曝光引发热议',
        source: 'douyin_api',
        category: '娱乐',
        status: 'pending',
        summary: '知名演员张三和李四被拍到一起用餐，疑似恋情曝光。',
        content: '<p>近日有网友拍到...</p><p>两人互动亲密，疑似正在交往...</p>',
        keywords: ['明星', '恋情', '八卦', '娱乐'],
        wordCount: 600,
        hotScore: 90,
        likes: 200,
        comments: 50,
        shares: 80,
        isOriginal: false,
        isHot: true,
        createdAt: '2024-01-01 13:00:00',
        updatedAt: '2024-01-01 13:00:00'
      },
      {
        id: 5,
        title: '国际体育赛事精彩纷呈',
        source: 'twitter_trend',
        category: '体育',
        status: 'deleted',
        summary: '多项国际体育赛事正在进行中，竞争激烈。',
        content: '<p>国际足球比赛精彩不断...</p><p>篮球赛事也吸引了大量观众...</p>',
        keywords: ['体育', '赛事', '比赛', '运动'],
        wordCount: 950,
        hotScore: 70,
        likes: 45,
        comments: 12,
        shares: 20,
        isOriginal: true,
        isHot: false,
        createdAt: '2024-01-01 14:00:00',
        updatedAt: '2024-01-01 14:30:00'
      },
      {
        id: 6,
        title: '教育改革新政策解读',
        source: 'tech_rss',
        category: '教育',
        status: 'published',
        summary: '教育部发布新政策，推动教育公平发展。',
        content: '<p>新政策重点关注教育资源均衡分配...</p><p>旨在缩小城乡教育差距...</p>',
        keywords: ['教育', '政策', '改革', '公平'],
        wordCount: 1100,
        hotScore: 85,
        likes: 95,
        comments: 30,
        shares: 35,
        isOriginal: true,
        isHot: true,
        publishDate: '2024-01-01 15:00:00',
        createdAt: '2024-01-01 14:45:00',
        updatedAt: '2024-01-01 15:00:00'
      },
      {
        id: 7,
        title: '科技创新大会圆满落幕',
        source: 'weibo_api',
        category: '科技',
        status: 'processed',
        summary: '为期三天的科技创新大会展示了众多前沿技术。',
        content: '<p>大会汇集了全球顶尖科技公司...</p><p>展示了人工智能、量子计算等新技术...</p>',
        keywords: ['科技', '创新', '大会', '技术'],
        wordCount: 1050,
        hotScore: 88,
        likes: 110,
        comments: 22,
        shares: 40,
        isOriginal: true,
        isHot: true,
        publishDate: '2024-01-01 16:00:00',
        createdAt: '2024-01-01 15:30:00',
        updatedAt: '2024-01-01 16:00:00'
      },
      {
        id: 8,
        title: '健康饮食新潮流',
        source: 'zhihu_crawler',
        category: '健康',
        status: 'collected',
        summary: '专家推荐的健康饮食方法受到广泛关注。',
        content: '<p>营养学家提出新的饮食搭配原则...</p><p>强调膳食纤维的重要性...</p>',
        keywords: ['健康', '饮食', '营养', '养生'],
        wordCount: 700,
        hotScore: 72,
        likes: 75,
        comments: 16,
        shares: 25,
        isOriginal: true,
        isHot: false,
        createdAt: '2024-01-01 17:00:00',
        updatedAt: '2024-01-01 17:00:00'
      },
      {
        id: 9,
        title: '旅游景点推荐攻略',
        source: 'douyin_api',
        category: '旅游',
        status: 'pending',
        summary: '春季旅游旺季来临，多地推出优惠活动。',
        content: '<p>春暖花开时节，适合出游踏青...</p><p>推荐几个热门旅游目的地...</p>',
        keywords: ['旅游', '景点', '攻略', '春季'],
        wordCount: 800,
        hotScore: 78,
        likes: 88,
        comments: 19,
        shares: 30,
        isOriginal: true,
        isHot: false,
        createdAt: '2024-01-01 18:00:00',
        updatedAt: '2024-01-01 18:00:00'
      },
      {
        id: 10,
        title: '房产市场调控政策分析',
        source: 'twitter_trend',
        category: '房产',
        status: 'published',
        summary: '最新房产调控政策对市场产生积极影响。',
        content: '<p>政策重点调控房价过快上涨...</p><p>保障刚需购房者权益...</p>',
        keywords: ['房产', '政策', '调控', '市场'],
        wordCount: 900,
        hotScore: 82,
        likes: 78,
        comments: 21,
        shares: 27,
        isOriginal: true,
        isHot: true,
        publishDate: '2024-01-01 19:00:00',
        createdAt: '2024-01-01 18:30:00',
        updatedAt: '2024-01-01 19:00:00'
      }
    ];
    
    // 应用搜索过滤
    let filteredData = mockData.filter(item => {
      let match = true;
      if (searchForm.title && !item.title.includes(searchForm.title)) {
        match = false;
      }
      if (searchForm.source && item.source !== searchForm.source) {
        match = false;
      }
      if (searchForm.status && item.status !== searchForm.status) {
        match = false;
      }
      if (searchForm.category && !item.category.includes(searchForm.category)) {
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

// 来源标签显示文本
const getSourceLabel = (source: string) => {
  switch (source) {
    case 'tech_rss': return '科技新闻RSS';
    case 'weibo_api': return '微博热搜API';
    case 'zhihu_crawler': return '知乎热门爬虫';
    case 'douyin_api': return '抖音热榜API';
    case 'twitter_trend': return 'Twitter趋势';
    default: return source;
  }
};

// 状态标签样式
const getStatusTag = (status: string) => {
  switch (status) {
    case 'pending': return 'info';
    case 'collected': return 'primary';
    case 'processed': return 'warning';
    case 'published': return 'success';
    case 'deleted': return 'danger';
    default: return 'info';
  }
};

// 状态标签显示文本
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending': return '待处理';
    case 'collected': return '已采集';
    case 'processed': return '已处理';
    case 'published': return '已发布';
    case 'deleted': return '已删除';
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
  searchForm.title = '';
  searchForm.source = '';
  searchForm.status = '';
  searchForm.category = '';
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

// 选择变化
const handleSelectionChange = (selection: NewsItem[]) => {
  selectedRows.value = selection;
};

// 刷新
const handleRefresh = () => {
  loadData();
  ElMessage.success('已刷新数据');
};

// 批量发布
const handleBatchPublish = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要发布的资讯');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要发布选中的 ${selectedRows.value.length} 条资讯吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    // 模拟批量发布
    selectedRows.value.forEach(item => {
      item.status = 'published';
      item.publishDate = new Date().toLocaleString();
      item.updatedAt = new Date().toLocaleString();
    });

    ElMessage.success(`成功发布了 ${selectedRows.value.length} 条资讯`);
  } catch (error) {
    console.error('Batch publish cancelled:', error);
  }
};

// 批量删除
const handleBatchDelete = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要删除的资讯');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 条资讯吗？`,
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    // 模拟批量删除
    const idsToDelete = selectedRows.value.map(item => item.id);
    tableData.value = tableData.value.filter(item => !idsToDelete.includes(item.id));
    pagination.total -= selectedRows.value.length;

    ElMessage.success(`成功删除了 ${selectedRows.value.length} 条资讯`);
  } catch (error) {
    console.error('Batch delete cancelled:', error);
  }
};

// 查看资讯详情
const handleView = (row: NewsItem) => {
  detailData.value = { ...row };
  detailDialog.visible = true;
};

// 编辑资讯
const handleEdit = (row: NewsItem) => {
  editDialog.title = '编辑资讯';
  editDialog.visible = true;
  
  // 填充表单数据
  Object.assign(editFormData, {
    ...row,
    keywordsStr: row.keywords ? row.keywords.join(',') : ''
  });
};

// 发布资讯
const handlePublish = async (row: NewsItem) => {
  if (row.status === 'published') {
    ElMessage.info('该资讯已发布');
    return;
  }

  try {
    await ElMessageBox.confirm(
      '确定要发布此资讯吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    // 模拟发布操作
    row.status = 'published';
    row.publishDate = new Date().toLocaleString();
    row.updatedAt = new Date().toLocaleString();

    ElMessage.success('发布成功');
  } catch (error) {
    console.error('Publish cancelled:', error);
  }
};

// 软删除
const handleSoftDelete = async (row: NewsItem) => {
  try {
    await ElMessageBox.confirm(
      '确定要软删除此资讯吗？数据将被标记为删除但不会物理删除。',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    // 模拟软删除操作
    row.status = 'deleted';
    row.updatedAt = new Date().toLocaleString();

    ElMessage.success('软删除成功');
  } catch (error) {
    console.error('Soft delete cancelled:', error);
  }
};

// 硬删除
const handleHardDelete = async (row: NewsItem) => {
  try {
    await ElMessageBox.confirm(
      '确定要硬删除此资讯吗？此操作不可恢复。',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'error'
      }
    );

    // 模拟硬删除操作
    const index = tableData.value.findIndex(item => item.id === row.id);
    if (index > -1) {
      tableData.value.splice(index, 1);
      pagination.total--;
      ElMessage.success('硬删除成功');
    }
  } catch (error) {
    console.error('Hard delete cancelled:', error);
  }
};

// 删除资讯
const handleDelete = (row: NewsItem) => {
  handleSoftDelete(row);
};

// 编辑对话框关闭
const handleEditDialogClose = () => {
  if (editFormRef.value) {
    editFormRef.value.clearValidate();
  }
};

// 编辑对话框取消
const handleEditDialogCancel = () => {
  editDialog.visible = false;
};

// 编辑对话框确认
const handleEditDialogConfirm = async () => {
  if (!editFormRef.value) return;
  
  try {
    await editFormRef.value.validate();
    
    // 处理关键词字符串
    if (editFormData.keywordsStr) {
      editFormData.keywords = editFormData.keywordsStr.split(',').map(k => k.trim()).filter(k => k);
    } else {
      editFormData.keywords = [];
    }
    
    // 模拟更新操作
    const index = tableData.value.findIndex(item => item.id === editFormData.id);
    if (index > -1) {
      Object.assign(tableData.value[index], {
        ...editFormData,
        updatedAt: new Date().toLocaleString()
      });
      ElMessage.success('更新成功');
    }
    
    editDialog.visible = false;
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
.list-container {
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

.pagination-container {
  margin-top: 20px;
  text-align: right;
}

.dialog-footer {
  text-align: right;
}

.title-cell {
  display: flex;
  align-items: center;
}

.detail-content {
  max-height: 70vh;
  overflow-y: auto;
}

.detail-header h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
  font-weight: bold;
}

.detail-meta {
  margin-bottom: 20px;
}

.detail-section {
  margin-bottom: 25px;
}

.detail-section h4 {
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: bold;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

.content-preview {
  line-height: 1.6;
  color: #606266;
}

.keywords-container {
  display: flex;
  flex-wrap: wrap;
}

.no-keywords {
  color: #909399;
  font-style: italic;
}
</style>