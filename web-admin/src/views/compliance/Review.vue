<template>
  <!-- 内容审核页面 -->
  <div class="review-container">
    <el-card class="card-container">
      <template #header>
        <div class="card-header">
          <span>内容审核</span>
          <div class="header-actions">
            <el-button type="primary" @click="handleBatchApprove">批量通过</el-button>
            <el-button type="danger" @click="handleBatchReject">批量拒绝</el-button>
            <el-button type="info" @click="handleRefresh">刷新</el-button>
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
          <el-form-item label="来源">
            <el-select v-model="searchForm.source" placeholder="请选择来源" clearable>
              <el-option label="用户投稿" value="user_submission" />
              <el-option label="AI生成" value="ai_generated" />
              <el-option label="采集系统" value="collector" />
              <el-option label="外部导入" value="external_import" />
            </el-select>
          </el-form-item>
          <el-form-item label="审核状态">
            <el-select v-model="searchForm.status" placeholder="请选择审核状态" clearable>
              <el-option label="待审核" value="pending" />
              <el-option label="已通过" value="approved" />
              <el-option label="已拒绝" value="rejected" />
              <el-option label="待复查" value="pending_review" />
            </el-select>
          </el-form-item>
          <el-form-item label="违规类型">
            <el-select v-model="searchForm.violationType" placeholder="请选择违规类型" clearable>
              <el-option label="政治敏感" value="political" />
              <el-option label="色情低俗" value="pornographic" />
              <el-option label="暴力恐怖" value="violent" />
              <el-option label="虚假信息" value="false_info" />
              <el-option label="侵犯隐私" value="privacy" />
              <el-option label="版权问题" value="copyright" />
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
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column prop="status" label="审核状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="violationType" label="违规类型" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.violationType" :type="getViolationTag(row.violationType)">
              {{ getViolationLabel(row.violationType) }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="100">
          <template #default="{ row }">
            <el-tag :type="getPriorityTag(row.priority)">{{ getPriorityLabel(row.priority) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submitter" label="提交者" width="120" />
        <el-table-column prop="reviewer" label="审核员" width="120" />
        <el-table-column prop="createdAt" label="提交时间" width="180" />
        <el-table-column prop="reviewTime" label="审核时间" width="180" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleView(row)">查看</el-button>
            <el-button 
              size="small" 
              type="success" 
              @click="handleApprove(row)"
              :disabled="row.status !== 'pending'"
            >
              通过
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="handleReject(row)"
              :disabled="row.status !== 'pending'"
            >
              拒绝
            </el-button>
            <el-dropdown size="small" split-button type="info" @click="handleMore(row)">
              更多
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleAssign(row)">分配审核员</el-dropdown-item>
                  <el-dropdown-item @click="handleEscalate(row)">升级处理</el-dropdown-item>
                  <el-dropdown-item @click="handleRequestReview(row)">申请复审</el-dropdown-item>
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

    <!-- 内容预览对话框 -->
    <el-dialog 
      v-model="previewDialog.visible" 
      title="内容预览" 
      width="900px"
      top="5vh"
    >
      <div v-if="currentItem" class="preview-content">
        <div class="preview-header">
          <h3>{{ currentItem.title }}</h3>
          <div class="preview-meta">
            <el-tag :type="getSourceTag(currentItem.source)" style="margin-right: 10px;">
              {{ getSourceLabel(currentItem.source) }}
            </el-tag>
            <el-tag :type="getStatusTag(currentItem.status)">
              {{ getStatusLabel(currentItem.status) }}
            </el-tag>
          </div>
        </div>
        
        <div class="preview-body">
          <div class="preview-section">
            <h4>内容摘要</h4>
            <p>{{ currentItem.summary || '暂无摘要' }}</p>
          </div>
          
          <div class="preview-section">
            <h4>内容详情</h4>
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
            <h4>违规信息</h4>
            <div v-if="currentItem.violationType" class="violation-info">
              <el-tag type="danger">{{ getViolationLabel(currentItem.violationType) }}</el-tag>
              <p><strong>违规详情：</strong>{{ currentItem.violationDetails || '无' }}</p>
            </div>
            <p v-else class="no-violation">未检测到违规内容</p>
          </div>
          
          <div class="preview-section">
            <h4>审核意见</h4>
            <el-input 
              v-model="reviewComment" 
              type="textarea"
              :rows="4"
              placeholder="请输入审核意见（可选）"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="previewDialog.visible = false">关闭</el-button>
          <el-button type="success" @click="handleApprove(currentItem)">通过</el-button>
          <el-button type="danger" @click="handleReject(currentItem)">拒绝</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 拒绝原因对话框 -->
    <el-dialog 
      v-model="rejectDialog.visible" 
      title="拒绝原因" 
      width="500px"
    >
      <el-form :model="rejectForm" label-width="80px">
        <el-form-item label="拒绝原因">
          <el-select 
            v-model="rejectForm.reason" 
            placeholder="请选择拒绝原因"
            style="width: 100%"
            multiple
          >
            <el-option label="政治敏感" value="political" />
            <el-option label="色情低俗" value="pornographic" />
            <el-option label="暴力恐怖" value="violent" />
            <el-option label="虚假信息" value="false_info" />
            <el-option label="侵犯隐私" value="privacy" />
            <el-option label="版权问题" value="copyright" />
            <el-option label="广告营销" value="advertising" />
            <el-option label="垃圾信息" value="spam" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="详细说明">
          <el-input 
            v-model="rejectForm.description" 
            type="textarea"
            :rows="4"
            placeholder="请输入详细说明"
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

// 审核项目类型定义
interface ReviewItem {
  id: number;
  title: string;
  source: 'user_submission' | 'ai_generated' | 'collector' | 'external_import';
  category: string;
  status: 'pending' | 'approved' | 'rejected' | 'pending_review';
  violationType?: 'political' | 'pornographic' | 'violent' | 'false_info' | 'privacy' | 'copyright';
  violationDetails?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  submitter: string;
  reviewer?: string;
  reviewTime?: string;
  reviewComment?: string;
  summary?: string;
  content: string;
  keywords?: string[];
  isUrgent: boolean;
  isOriginal: boolean;
  createdAt: string;
  updatedAt: string;
}

// 搜索表单
const searchForm = reactive({
  title: '',
  source: '',
  status: '',
  violationType: ''
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
  visible: false
});

// 拒绝对话框
const rejectDialog = reactive({
  visible: false
});

// 拒绝表单
const rejectForm = reactive({
  reason: [] as string[],
  description: ''
});

// 当前操作项目
const currentItem = ref<ReviewItem | null>(null);
const reviewComment = ref('');

// 获取审核列表
const loadData = () => {
  loading.value = true;
  
  // 模拟异步加载数据
  setTimeout(() => {
    // 模拟数据
    const mockData: ReviewItem[] = [
      {
        id: 1,
        title: '人工智能在医疗领域的最新突破',
        source: 'ai_generated',
        category: '科技',
        status: 'pending',
        priority: 'high',
        submitter: 'AI系统',
        summary: '最新的AI技术在医疗诊断中展现出前所未有的准确性和效率。',
        content: '<p>人工智能技术在医疗领域的应用正在快速发展...</p><p>研究人员开发了一种新的算法...</p>',
        keywords: ['人工智能', '医疗', '诊断', '算法'],
        isUrgent: true,
        isOriginal: true,
        createdAt: '2024-01-01 10:00:00',
        updatedAt: '2024-01-01 10:00:00'
      },
      {
        id: 2,
        title: '明星恋情曝光引发热议',
        source: 'user_submission',
        category: '娱乐',
        status: 'pending',
        violationType: 'privacy',
        violationDetails: '涉及个人隐私信息',
        priority: 'medium',
        submitter: '用户张三',
        summary: '知名演员张三和李四被拍到一起用餐，疑似恋情曝光。',
        content: '<p>近日有网友拍到...</p><p>两人互动亲密，疑似正在交往...</p>',
        keywords: ['明星', '恋情', '八卦', '娱乐'],
        isUrgent: false,
        isOriginal: false,
        createdAt: '2024-01-01 10:15:00',
        updatedAt: '2024-01-01 10:15:00'
      },
      {
        id: 3,
        title: '全球股市迎来新一轮上涨行情',
        source: 'collector',
        category: '财经',
        status: 'approved',
        reviewer: '审核员王五',
        reviewTime: '2024-01-01 11:00:00',
        reviewComment: '内容真实可靠，符合发布标准',
        priority: 'medium',
        submitter: '采集系统',
        summary: '受利好政策影响，全球主要股市普遍上涨。',
        content: '<p>受到多项利好政策推动...</p><p>投资者信心明显增强...</p>',
        keywords: ['股市', '上涨', '投资', '经济'],
        isUrgent: false,
        isOriginal: false,
        createdAt: '2024-01-01 09:30:00',
        updatedAt: '2024-01-01 11:00:00'
      },
      {
        id: 4,
        title: '健康饮食新潮流',
        source: 'ai_generated',
        category: '健康',
        status: 'rejected',
        violationType: 'false_info',
        violationDetails: '包含未经证实的健康建议',
        reviewer: '审核员赵六',
        reviewTime: '2024-01-01 11:30:00',
        priority: 'low',
        submitter: 'AI系统',
        summary: '专家推荐的健康饮食方法受到广泛关注。',
        content: '<p>营养学家提出新的饮食搭配原则...</p><p>强调膳食纤维的重要性...</p>',
        keywords: ['健康', '饮食', '营养', '养生'],
        isUrgent: false,
        isOriginal: true,
        createdAt: '2024-01-01 10:45:00',
        updatedAt: '2024-01-01 11:30:00'
      },
      {
        id: 5,
        title: '教育改革新政策解读',
        source: 'external_import',
        category: '教育',
        status: 'pending_review',
        priority: 'high',
        submitter: '外部系统',
        summary: '教育部发布新政策，推动教育公平发展。',
        content: '<p>新政策重点关注教育资源均衡分配...</p><p>旨在缩小城乡教育差距...</p>',
        keywords: ['教育', '政策', '改革', '公平'],
        isUrgent: true,
        isOriginal: true,
        createdAt: '2024-01-01 11:00:00',
        updatedAt: '2024-01-01 11:00:00'
      },
      {
        id: 6,
        title: '旅游景点推荐攻略',
        source: 'user_submission',
        category: '旅游',
        status: 'pending',
        priority: 'medium',
        submitter: '用户李四',
        summary: '春季旅游旺季来临，多地推出优惠活动。',
        content: '<p>春暖花开时节，适合出游踏青...</p><p>推荐几个热门旅游目的地...</p>',
        keywords: ['旅游', '景点', '攻略', '春季'],
        isUrgent: false,
        isOriginal: true,
        createdAt: '2024-01-01 11:30:00',
        updatedAt: '2024-01-01 11:30:00'
      },
      {
        id: 7,
        title: '房产市场调控政策分析',
        source: 'collector',
        category: '房产',
        status: 'approved',
        reviewer: '审核员钱七',
        reviewTime: '2024-01-01 12:00:00',
        reviewComment: '政策分析客观准确',
        priority: 'medium',
        submitter: '采集系统',
        summary: '最新房产调控政策对市场产生积极影响。',
        content: '<p>政策重点调控房价过快上涨...</p><p>保障刚需购房者权益...</p>',
        keywords: ['房产', '政策', '调控', '市场'],
        isUrgent: false,
        isOriginal: false,
        createdAt: '2024-01-01 11:15:00',
        updatedAt: '2024-01-01 12:00:00'
      },
      {
        id: 8,
        title: 'AI伦理问题深度探讨',
        source: 'ai_generated',
        category: '科技',
        status: 'pending',
        priority: 'high',
        submitter: 'AI系统',
        summary: '随着AI技术的发展，伦理问题日益凸显。',
        content: '<p>人工智能技术的快速发展带来了诸多伦理挑战...</p><p>我们需要建立相应的规范和标准...</p>',
        keywords: ['人工智能', '伦理', '技术', '规范'],
        isUrgent: true,
        isOriginal: true,
        createdAt: '2024-01-01 12:00:00',
        updatedAt: '2024-01-01 12:00:00'
      },
      {
        id: 9,
        title: '美食探店体验分享',
        source: 'user_submission',
        category: '美食',
        status: 'rejected',
        violationType: 'advertising',
        violationDetails: '过度商业化，疑似广告',
        reviewer: '审核员孙八',
        reviewTime: '2024-01-01 12:30:00',
        priority: 'low',
        submitter: '用户王五',
        summary: '今天给大家推荐一家新开的餐厅，环境优雅，菜品丰富。',
        content: '<p>今天给大家推荐这家餐厅...</p><p>强烈推荐大家来试试...</p>',
        keywords: ['美食', '探店', '推荐', '餐厅'],
        isUrgent: false,
        isOriginal: false,
        createdAt: '2024-01-01 12:15:00',
        updatedAt: '2024-01-01 12:30:00'
      },
      {
        id: 10,
        title: '健身运动科学指导',
        source: 'ai_generated',
        category: '健康',
        status: 'pending',
        priority: 'medium',
        submitter: 'AI系统',
        summary: '科学的健身方法对身体健康至关重要。',
        content: '<p>健身运动需要注意的事项...</p><p>科学训练才能达到最佳效果...</p>',
        keywords: ['健身', '运动', '健康', '科学'],
        isUrgent: false,
        isOriginal: true,
        createdAt: '2024-01-01 12:30:00',
        updatedAt: '2024-01-01 12:30:00'
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
      if (searchForm.violationType && item.violationType !== searchForm.violationType) {
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
    case 'user_submission': return 'warning';
    case 'ai_generated': return 'success';
    case 'collector': return 'primary';
    case 'external_import': return 'info';
    default: return 'info';
  }
};

// 来源标签显示文本
const getSourceLabel = (source: string) => {
  switch (source) {
    case 'user_submission': return '用户投稿';
    case 'ai_generated': return 'AI生成';
    case 'collector': return '采集系统';
    case 'external_import': return '外部导入';
    default: return source;
  }
};

// 状态标签样式
const getStatusTag = (status: string) => {
  switch (status) {
    case 'pending': return 'info';
    case 'approved': return 'success';
    case 'rejected': return 'danger';
    case 'pending_review': return 'warning';
    default: return 'info';
  }
};

// 状态标签显示文本
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending': return '待审核';
    case 'approved': return '已通过';
    case 'rejected': return '已拒绝';
    case 'pending_review': return '待复查';
    default: return status;
  }
};

// 违规类型标签样式
const getViolationTag = (type: string) => {
  switch (type) {
    case 'political': return 'danger';
    case 'pornographic': return 'warning';
    case 'violent': return 'danger';
    case 'false_info': return 'info';
    case 'privacy': return 'warning';
    case 'copyright': return 'info';
    default: return 'info';
  }
};

// 违规类型标签显示文本
const getViolationLabel = (type: string) => {
  switch (type) {
    case 'political': return '政治敏感';
    case 'pornographic': return '色情低俗';
    case 'violent': return '暴力恐怖';
    case 'false_info': return '虚假信息';
    case 'privacy': return '侵犯隐私';
    case 'copyright': return '版权问题';
    default: return type;
  }
};

// 优先级标签样式
const getPriorityTag = (priority: string) => {
  switch (priority) {
    case 'low': return 'info';
    case 'medium': return 'warning';
    case 'high': return 'danger';
    case 'urgent': return 'danger';
    default: return 'info';
  }
};

// 优先级标签显示文本
const getPriorityLabel = (priority: string) => {
  switch (priority) {
    case 'low': return '低';
    case 'medium': return '中';
    case 'high': return '高';
    case 'urgent': return '紧急';
    default: return priority;
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
  searchForm.status = '';
  searchForm.violationType = '';
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
  reviewComment.value = row.reviewComment || '';
  previewDialog.visible = true;
};

// 通过审核
const handleApprove = async (row: ReviewItem) => {
  try {
    await ElMessageBox.confirm(
      '确定要通过此内容的审核吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    // 模拟通过操作
    row.status = 'approved';
    row.reviewer = '当前审核员'; // 实际项目中应该是当前登录用户
    row.reviewTime = new Date().toLocaleString();
    row.reviewComment = reviewComment.value || '内容符合审核标准';
    row.updatedAt = new Date().toLocaleString();

    // 关闭预览对话框
    previewDialog.visible = false;
    
    ElMessage.success('内容已通过审核');
  } catch (error) {
    console.error('Approve cancelled:', error);
  }
};

// 拒绝内容
const handleReject = (row: ReviewItem) => {
  currentItem.value = { ...row };
  rejectDialog.visible = true;
};

// 确认拒绝
const confirmReject = async () => {
  if (!currentItem.value) {
    ElMessage.error('没有选择要拒绝的内容');
    return;
  }

  try {
    await ElMessageBox.confirm(
      '确定要拒绝此内容吗？',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'error'
      }
    );

    // 模拟拒绝操作
    currentItem.value.status = 'rejected';
    currentItem.value.reviewer = '当前审核员'; // 实际项目中应该是当前登录用户
    currentItem.value.reviewTime = new Date().toLocaleString();
    currentItem.value.violationType = rejectForm.reason[0] as any;
    currentItem.value.violationDetails = rejectForm.description;
    currentItem.value.updatedAt = new Date().toLocaleString();

    // 关闭对话框
    rejectDialog.visible = false;
    
    ElMessage.success('内容已拒绝');
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
      item.status = 'approved';
      item.reviewer = '当前审核员'; // 实际项目中应该是当前登录用户
      item.reviewTime = new Date().toLocaleString();
      item.reviewComment = '批量通过';
      item.updatedAt = new Date().toLocaleString();
    });

    ElMessage.success(`成功通过了 ${selectedRows.value.length} 条内容`);
  } catch (error) {
    console.error('Batch approve cancelled:', error);
  }
};

// 批量拒绝
const handleBatchReject = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要拒绝的内容');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要拒绝选中的 ${selectedRows.value.length} 条内容吗？`,
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'error'
      }
    );

    // 模拟批量拒绝操作
    selectedRows.value.forEach(item => {
      item.status = 'rejected';
      item.reviewer = '当前审核员'; // 实际项目中应该是当前登录用户
      item.reviewTime = new Date().toLocaleString();
      item.violationType = 'other';
      item.violationDetails = '批量拒绝';
      item.updatedAt = new Date().toLocaleString();
    });

    ElMessage.success(`成功拒绝了 ${selectedRows.value.length} 条内容`);
  } catch (error) {
    console.error('Batch reject cancelled:', error);
  }
};

// 刷新
const handleRefresh = () => {
  loadData();
  ElMessage.success('已刷新数据');
};

// 分配审核员
const handleAssign = (row: ReviewItem) => {
  ElMessage.info('分配审核员功能开发中...');
};

// 升级处理
const handleEscalate = (row: ReviewItem) => {
  ElMessage.info('升级处理功能开发中...');
};

// 申请复审
const handleRequestReview = (row: ReviewItem) => {
  ElMessage.info('申请复审功能开发中...');
};

// 更多操作
const handleMore = (row: ReviewItem) => {
  console.log('More actions for:', row);
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

.violation-info {
  padding: 10px;
  background-color: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 4px;
}

.no-violation {
  color: #67c23a;
  font-style: italic;
}

.dialog-footer {
  text-align: right;
}
</style>