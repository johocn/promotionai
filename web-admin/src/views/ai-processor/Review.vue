<template>
  <!-- 人工复核页面 -->
  <div class="review-container">
    <el-card class="card-container">
      <template #header>
        <div class="card-header">
          <span>人工复核</span>
          <div class="header-actions">
            <el-button type="primary" @click="handleBatchApprove">批量通过</el-button>
            <el-button type="danger" @click="handleBatchReject">批量驳回</el-button>
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
              <el-option label="采集系统" value="collector" />
              <el-option label="AI生成" value="ai_generator" />
              <el-option label="用户投稿" value="user_submission" />
              <el-option label="外部导入" value="external_import" />
            </el-select>
          </el-form-item>
          <el-form-item label="复核状态">
            <el-select v-model="searchForm.reviewStatus" placeholder="请选择复核状态" clearable>
              <el-option label="待复核" value="pending" />
              <el-option label="已通过" value="approved" />
              <el-option label="已驳回" value="rejected" />
            </el-select>
          </el-form-item>
          <el-form-item label="内容类型">
            <el-select v-model="searchForm.contentType" placeholder="请选择内容类型" clearable>
              <el-option label="新闻" value="news" />
              <el-option label="博客" value="blog" />
              <el-option label="产品" value="product" />
              <el-option label="广告" value="ad" />
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
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="title-cell">
              <span>{{ row.title }}</span>
              <el-tag 
                v-if="row.isUrgent" 
                type="danger" 
                size="small"
                style="margin-left: 8px;"
              >
                紧急
              </el-tag>
              <el-tag 
                v-if="row.isOriginal" 
                type="success" 
                size="small"
                style="margin-left: 8px;"
              >
                原创
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="source" label="来源" width="120">
          <template #default="{ row }">
            <el-tag :type="getSourceTag(row.source)">{{ getSourceLabel(row.source) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="contentType" label="内容类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getContentTypeTag(row.contentType)">{{ getContentTypeLabel(row.contentType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reviewStatus" label="复核状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getReviewStatusTag(row.reviewStatus)">
              {{ getReviewStatusLabel(row.reviewStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reviewer" label="复核人" width="120" />
        <el-table-column prop="reviewTime" label="复核时间" width="180" />
        <el-table-column prop="createdAt" label="提交时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button 
              size="small" 
              type="primary" 
              @click="handleView(row)"
              :disabled="row.reviewStatus !== 'pending'"
            >
              查看
            </el-button>
            <el-button 
              size="small" 
              type="success" 
              @click="handleApprove(row)"
              :disabled="row.reviewStatus !== 'pending'"
            >
              通过
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="handleReject(row)"
              :disabled="row.reviewStatus !== 'pending'"
            >
              驳回
            </el-button>
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

    <!-- 内容预览对话框 -->
    <el-dialog 
      v-model="previewDialog.visible" 
      :title="previewDialog.title" 
      width="900px"
      top="5vh"
    >
      <div v-if="currentItem" class="preview-content">
        <div class="preview-header">
          <h3>{{ currentItem.title }}</h3>
          <div class="preview-meta">
            <el-tag type="info" style="margin-right: 10px;">{{ getSourceLabel(currentItem.source) }}</el-tag>
            <el-tag :type="getContentTypeTag(currentItem.contentType)" style="margin-right: 10px;">
              {{ getContentTypeLabel(currentItem.contentType) }}
            </el-tag>
            <el-tag :type="getReviewStatusTag(currentItem.reviewStatus)">
              {{ getReviewStatusLabel(currentItem.reviewStatus) }}
            </el-tag>
          </div>
        </div>
        
        <div class="preview-body">
          <div class="preview-section">
            <h4>摘要</h4>
            <p>{{ currentItem.summary || '暂无摘要' }}</p>
          </div>
          
          <div class="preview-section">
            <h4>内容</h4>
            <div class="content-preview" v-html="formatContent(currentItem.content)"></div>
          </div>
          
          <div class="preview-section">
            <h4>关键词</h4>
            <div class="keywords-container">
              <el-tag 
                v-for="(keyword, index) in currentItem.keywords || []" 
                :key="index" 
                type="primary"
                style="margin-right: 8px; margin-bottom: 8px;"
              >
                {{ keyword }}
              </el-tag>
              <span v-if="!(currentItem.keywords && currentItem.keywords.length)" class="no-keywords">暂无关键词</span>
            </div>
          </div>
          
          <div class="preview-section">
            <h4>统计信息</h4>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="字数">{{ currentItem.wordCount }}</el-descriptions-item>
              <el-descriptions-item label="阅读时长">{{ Math.ceil(currentItem.wordCount / 300) }}分钟</el-descriptions-item>
              <el-descriptions-item label="来源">{{ getSourceLabel(currentItem.source) }}</el-descriptions-item>
              <el-descriptions-item label="内容类型">{{ getContentTypeLabel(currentItem.contentType) }}</el-descriptions-item>
            </el-descriptions>
          </div>
          
          <div class="preview-section">
            <h4>复核意见</h4>
            <el-input 
              v-model="reviewOpinion" 
              type="textarea"
              :rows="4"
              placeholder="请输入复核意见（可选）"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="previewDialog.visible = false">关闭</el-button>
          <el-button type="success" @click="handleApprove(currentItem)">通过</el-button>
          <el-button type="danger" @click="handleReject(currentItem)">驳回</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 驳回理由对话框 -->
    <el-dialog 
      v-model="rejectDialog.visible" 
      title="驳回理由" 
      width="500px"
    >
      <el-form :model="rejectForm" label-width="80px">
        <el-form-item label="驳回理由">
          <el-select 
            v-model="rejectForm.reason" 
            placeholder="请选择驳回理由"
            style="width: 100%"
          >
            <el-option label="内容质量差" value="quality" />
            <el-option label="事实错误" value="factual_error" />
            <el-option label="违反规定" value="violation" />
            <el-option label="版权问题" value="copyright" />
            <el-option label="重复内容" value="duplicate" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="详细说明">
          <el-input 
            v-model="rejectForm.description" 
            type="textarea"
            :rows="4"
            placeholder="请输入详细说明（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="rejectDialog.visible = false">取消</el-button>
          <el-button type="primary" @click="confirmReject">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

// 复核项目类型定义
interface ReviewItem {
  id: number;
  title: string;
  source: 'collector' | 'ai_generator' | 'user_submission' | 'external_import';
  contentType: 'news' | 'blog' | 'product' | 'ad';
  reviewStatus: 'pending' | 'approved' | 'rejected';
  reviewer?: string;
  reviewTime?: string;
  reviewOpinion?: string;
  rejectReason?: string;
  rejectDescription?: string;
  summary?: string;
  content: string;
  keywords?: string[];
  wordCount: number;
  isUrgent: boolean;
  isOriginal: boolean;
  createdAt: string;
  updatedAt: string;
}

// 搜索表单
const searchForm = reactive({
  title: '',
  source: '',
  reviewStatus: '',
  contentType: ''
});

// 表格数据
const tableData = ref<ReviewItem[]>([]);
const loading = ref(false);
const selectedRows = ref<ReviewItem[]>([]);

// 分页信息
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
});

// 预览对话框
const previewDialog = reactive({
  visible: false,
  title: '内容预览'
});

// 驳回对话框
const rejectDialog = reactive({
  visible: false
});

// 驳回表单
const rejectForm = reactive({
  reason: '',
  description: ''
});

// 当前操作项目
const currentItem = ref<ReviewItem | null>(null);
const reviewOpinion = ref('');

// 获取复核列表
const loadData = () => {
  loading.value = true;
  
  // 模拟异步加载数据
  setTimeout(() => {
    // 模拟数据
    const mockData: ReviewItem[] = [
      {
        id: 1,
        title: '人工智能在医疗领域的最新突破',
        source: 'collector',
        contentType: 'news',
        reviewStatus: 'pending',
        summary: '最新的AI技术在医疗诊断中展现出前所未有的准确性和效率。',
        content: '<p>人工智能技术在医疗领域的应用正在快速发展...</p><p>研究人员开发了一种新的算法...</p>',
        keywords: ['人工智能', '医疗', '诊断', '算法'],
        wordCount: 1200,
        isUrgent: true,
        isOriginal: true,
        createdAt: '2024-01-01 09:00:00',
        updatedAt: '2024-01-01 09:00:00'
      },
      {
        id: 2,
        title: '全球股市迎来新一轮上涨行情',
        source: 'ai_generator',
        contentType: 'news',
        reviewStatus: 'pending',
        summary: '受利好政策影响，全球主要股市普遍上涨。',
        content: '<p>受到多项利好政策推动...</p><p>投资者信心明显增强...</p>',
        keywords: ['股市', '上涨', '投资', '经济'],
        wordCount: 850,
        isUrgent: false,
        isOriginal: false,
        createdAt: '2024-01-01 09:15:00',
        updatedAt: '2024-01-01 09:15:00'
      },
      {
        id: 3,
        title: '新能源汽车销量创新高',
        source: 'collector',
        contentType: 'news',
        reviewStatus: 'approved',
        reviewer: '张三',
        reviewTime: '2024-01-01 10:30:00',
        reviewOpinion: '内容质量良好，数据准确',
        summary: '本月新能源汽车销量同比增长超过50%。',
        content: '<p>新能源汽车市场持续火热...</p><p>消费者对环保车型的需求不断增长...</p>',
        keywords: ['新能源', '汽车', '销量', '环保'],
        wordCount: 750,
        isUrgent: false,
        isOriginal: true,
        createdAt: '2024-01-01 09:30:00',
        updatedAt: '2024-01-01 10:30:00'
      },
      {
        id: 4,
        title: '明星恋情曝光引发热议',
        source: 'user_submission',
        contentType: 'blog',
        reviewStatus: 'rejected',
        reviewer: '李四',
        reviewTime: '2024-01-01 10:45:00',
        rejectReason: 'violation',
        rejectDescription: '涉及隐私内容，不符合发布标准',
        summary: '知名演员张三和李四被拍到一起用餐，疑似恋情曝光。',
        content: '<p>近日有网友拍到...</p><p>两人互动亲密，疑似正在交往...</p>',
        keywords: ['明星', '恋情', '八卦', '娱乐'],
        wordCount: 600,
        isUrgent: false,
        isOriginal: false,
        createdAt: '2024-01-01 09:45:00',
        updatedAt: '2024-01-01 10:45:00'
      },
      {
        id: 5,
        title: '科技创新大会圆满落幕',
        source: 'collector',
        contentType: 'news',
        reviewStatus: 'pending',
        summary: '为期三天的科技创新大会展示了众多前沿技术。',
        content: '<p>大会汇集了全球顶尖科技公司...</p><p>展示了人工智能、量子计算等新技术...</p>',
        keywords: ['科技', '创新', '大会', '技术'],
        wordCount: 1050,
        isUrgent: true,
        isOriginal: true,
        createdAt: '2024-01-01 10:00:00',
        updatedAt: '2024-01-01 10:00:00'
      },
      {
        id: 6,
        title: '健康饮食新潮流',
        source: 'ai_generator',
        contentType: 'blog',
        reviewStatus: 'pending',
        summary: '专家推荐的健康饮食方法受到广泛关注。',
        content: '<p>营养学家提出新的饮食搭配原则...</p><p>强调膳食纤维的重要性...</p>',
        keywords: ['健康', '饮食', '营养', '养生'],
        wordCount: 700,
        isUrgent: false,
        isOriginal: true,
        createdAt: '2024-01-01 10:15:00',
        updatedAt: '2024-01-01 10:15:00'
      },
      {
        id: 7,
        title: '教育改革新政策解读',
        source: 'collector',
        contentType: 'news',
        reviewStatus: 'approved',
        reviewer: '王五',
        reviewTime: '2024-01-01 11:00:00',
        reviewOpinion: '政策解读准确，信息有价值',
        summary: '教育部发布新政策，推动教育公平发展。',
        content: '<p>新政策重点关注教育资源均衡分配...</p><p>旨在缩小城乡教育差距...</p>',
        keywords: ['教育', '政策', '改革', '公平'],
        wordCount: 1100,
        isUrgent: false,
        isOriginal: true,
        createdAt: '2024-01-01 10:30:00',
        updatedAt: '2024-01-01 11:00:00'
      },
      {
        id: 8,
        title: '旅游景点推荐攻略',
        source: 'user_submission',
        contentType: 'blog',
        reviewStatus: 'pending',
        summary: '春季旅游旺季来临，多地推出优惠活动。',
        content: '<p>春暖花开时节，适合出游踏青...</p><p>推荐几个热门旅游目的地...</p>',
        keywords: ['旅游', '景点', '攻略', '春季'],
        wordCount: 800,
        isUrgent: false,
        isOriginal: true,
        createdAt: '2024-01-01 10:45:00',
        updatedAt: '2024-01-01 10:45:00'
      },
      {
        id: 9,
        title: '房产市场调控政策分析',
        source: 'external_import',
        contentType: 'news',
        reviewStatus: 'pending',
        summary: '最新房产调控政策对市场产生积极影响。',
        content: '<p>政策重点调控房价过快上涨...</p><p>保障刚需购房者权益...</p>',
        keywords: ['房产', '政策', '调控', '市场'],
        wordCount: 900,
        isUrgent: true,
        isOriginal: false,
        createdAt: '2024-01-01 11:00:00',
        updatedAt: '2024-01-01 11:00:00'
      },
      {
        id: 10,
        title: '人工智能伦理问题探讨',
        source: 'ai_generator',
        contentType: 'blog',
        reviewStatus: 'pending',
        summary: '随着AI技术的发展，伦理问题日益凸显。',
        content: '<p>人工智能技术的快速发展带来了诸多伦理挑战...</p><p>我们需要建立相应的规范和标准...</p>',
        keywords: ['人工智能', '伦理', '技术', '规范'],
        wordCount: 1300,
        isUrgent: false,
        isOriginal: true,
        createdAt: '2024-01-01 11:15:00',
        updatedAt: '2024-01-01 11:15:00'
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
      if (searchForm.reviewStatus && item.reviewStatus !== searchForm.reviewStatus) {
        match = false;
      }
      if (searchForm.contentType && item.contentType !== searchForm.contentType) {
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

// 来源标签样式
const getSourceTag = (source: string) => {
  switch (source) {
    case 'collector': return 'primary';
    case 'ai_generator': return 'success';
    case 'user_submission': return 'warning';
    case 'external_import': return 'info';
    default: return 'info';
  }
};

// 来源标签显示文本
const getSourceLabel = (source: string) => {
  switch (source) {
    case 'collector': return '采集系统';
    case 'ai_generator': return 'AI生成';
    case 'user_submission': return '用户投稿';
    case 'external_import': return '外部导入';
    default: return source;
  }
};

// 内容类型标签样式
const getContentTypeTag = (type: string) => {
  switch (type) {
    case 'news': return 'info';
    case 'blog': return 'primary';
    case 'product': return 'warning';
    case 'ad': return 'danger';
    default: return 'info';
  }
};

// 内容类型标签显示文本
const getContentTypeLabel = (type: string) => {
  switch (type) {
    case 'news': return '新闻';
    case 'blog': return '博客';
    case 'product': return '产品';
    case 'ad': return '广告';
    default: return type;
  }
};

// 复核状态标签样式
const getReviewStatusTag = (status: string) => {
  switch (status) {
    case 'pending': return 'info';
    case 'approved': return 'success';
    case 'rejected': return 'danger';
    default: return 'info';
  }
};

// 复核状态标签显示文本
const getReviewStatusLabel = (status: string) => {
  switch (status) {
    case 'pending': return '待复核';
    case 'approved': return '已通过';
    case 'rejected': return '已驳回';
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
  searchForm.source = '';
  searchForm.reviewStatus = '';
  searchForm.contentType = '';
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
const handleSelectionChange = (selection: ReviewItem[]) => {
  selectedRows.value = selection;
};

// 查看内容
const handleView = (row: ReviewItem) => {
  currentItem.value = { ...row };
  reviewOpinion.value = row.reviewOpinion || '';
  previewDialog.visible = true;
};

// 通过复核
const handleApprove = async (row: ReviewItem) => {
  try {
    await ElMessageBox.confirm(
      '确定要通过此内容的复核吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    // 模拟通过操作
    row.reviewStatus = 'approved';
    row.reviewer = '当前用户'; // 实际项目中应该是当前登录用户
    row.reviewTime = new Date().toLocaleString();
    row.reviewOpinion = reviewOpinion.value || '内容符合发布标准';
    row.updatedAt = new Date().toLocaleString();

    // 关闭预览对话框
    previewDialog.visible = false;
    
    ElMessage.success('内容已通过复核');
  } catch (error) {
    console.error('Approve cancelled:', error);
  }
};

// 驳回内容
const handleReject = async (row: ReviewItem) => {
  currentItem.value = { ...row };
  rejectDialog.visible = true;
};

// 确认驳回
const confirmReject = async () => {
  if (!currentItem.value) {
    ElMessage.error('没有选择要驳回的内容');
    return;
  }

  try {
    await ElMessageBox.confirm(
      '确定要驳回此内容吗？',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'error'
      }
    );

    // 模拟驳回操作
    currentItem.value.reviewStatus = 'rejected';
    currentItem.value.reviewer = '当前用户'; // 实际项目中应该是当前登录用户
    currentItem.value.reviewTime = new Date().toLocaleString();
    currentItem.value.rejectReason = rejectForm.reason;
    currentItem.value.rejectDescription = rejectForm.description;
    currentItem.value.updatedAt = new Date().toLocaleString();

    // 关闭对话框
    rejectDialog.visible = false;
    
    ElMessage.success('内容已驳回');
  } catch (error) {
    console.error('Reject cancelled:', error);
  }
};

// 批量通过
const handleBatchApprove = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要通过的内容');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要通过选中的 ${selectedRows.value.length} 条内容吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    // 模拟批量通过操作
    selectedRows.value.forEach(item => {
      item.reviewStatus = 'approved';
      item.reviewer = '当前用户'; // 实际项目中应该是当前登录用户
      item.reviewTime = new Date().toLocaleString();
      item.reviewOpinion = '批量通过';
      item.updatedAt = new Date().toLocaleString();
    });

    ElMessage.success(`成功通过了 ${selectedRows.value.length} 条内容`);
  } catch (error) {
    console.error('Batch approve cancelled:', error);
  }
};

// 批量驳回
const handleBatchReject = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要驳回的内容');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要驳回选中的 ${selectedRows.value.length} 条内容吗？`,
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'error'
      }
    );

    // 模拟批量驳回操作
    selectedRows.value.forEach(item => {
      item.reviewStatus = 'rejected';
      item.reviewer = '当前用户'; // 实际项目中应该是当前登录用户
      item.reviewTime = new Date().toLocaleString();
      item.rejectReason = '批量驳回';
      item.updatedAt = new Date().toLocaleString();
    });

    ElMessage.success(`成功驳回了 ${selectedRows.value.length} 条内容`);
  } catch (error) {
    console.error('Batch reject cancelled:', error);
  }
};

// 初始化
onMounted(() => {
  loadData();
});
</script>

<style scoped>
.review-container {
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

.title-cell {
  display: flex;
  align-items: center;
}

.preview-content {
  max-height: 70vh;
  overflow-y: auto;
}

.preview-header h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
  font-weight: bold;
}

.preview-meta {
  margin-bottom: 20px;
}

.preview-section {
  margin-bottom: 25px;
}

.preview-section h4 {
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

.dialog-footer {
  text-align: right;
}
</style>