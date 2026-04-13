<template>
  <!-- 质量评估页面 -->
  <div class="quality-container">
    <el-card class="card-container">
      <template #header>
        <div class="card-header">
          <span>质量评估</span>
          <div class="header-actions">
            <el-button type="primary" @click="handleRefresh">刷新</el-button>
            <el-button type="success" @click="handleExportReport">导出报告</el-button>
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
          <el-form-item label="评估状态">
            <el-select v-model="searchForm.status" placeholder="请选择评估状态" clearable>
              <el-option label="待评估" value="pending" />
              <el-option label="评估中" value="evaluating" />
              <el-option label="已完成" value="completed" />
              <el-option label="需人工复核" value="manual_review" />
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

      <!-- 统计卡片区域 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-item">
              <div class="stat-number">{{ stats.total }}</div>
              <div class="stat-label">总评估数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-item">
              <div class="stat-number" :style="{ color: '#67C23A' }">{{ stats.passed }}</div>
              <div class="stat-label">通过数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-item">
              <div class="stat-number" :style="{ color: '#F56C6C' }">{{ stats.failed }}</div>
              <div class="stat-label">未通过数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-item">
              <div class="stat-number" :style="{ color: '#E6A23C' }">{{ stats.pending }}</div>
              <div class="stat-label">待处理数</div>
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
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="contentType" label="内容类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getContentTypeTag(row.contentType)">{{ getContentTypeLabel(row.contentType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="评估状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="overallScore" label="综合评分" width="100">
          <template #default="{ row }">
            <el-rate 
              v-model="row.overallScore / 20" 
              :max="5" 
              disabled 
              show-score 
              score-template="{value}"
              :colors="['#F56C6C', '#E6A23C', '#67C23A']"
              :low-threshold="2"
              :high-threshold="4"
            />
          </template>
        </el-table-column>
        <el-table-column prop="qualityScore" label="质量分" width="100">
          <template #default="{ row }">
            <el-progress 
              :percentage="row.qualityScore" 
              :color="getScoreColor(row.qualityScore)"
              :stroke-width="10"
            />
          </template>
        </el-table-column>
        <el-table-column prop="originalityScore" label="原创分" width="100">
          <template #default="{ row }">
            <el-progress 
              :percentage="row.originalityScore" 
              :color="getScoreColor(row.originalityScore)"
              :stroke-width="10"
            />
          </template>
        </el-table-column>
        <el-table-column prop="complianceScore" label="合规分" width="100">
          <template #default="{ row }">
            <el-progress 
              :percentage="row.complianceScore" 
              :color="getScoreColor(row.complianceScore)"
              :stroke-width="10"
            />
          </template>
        </el-table-column>
        <el-table-column prop="evaluateTime" label="评估时间" width="180" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleView(row)">详情</el-button>
            <el-button 
              size="small" 
              type="primary" 
              @click="handleReEvaluate(row)"
              :disabled="row.status === 'evaluating'"
            >
              重评
            </el-button>
            <el-button 
              size="small" 
              type="info" 
              @click="handleManualReview(row)"
              :disabled="row.status !== 'completed'"
            >
              人工复核
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

    <!-- 评估详情对话框 -->
    <el-dialog 
      v-model="detailDialog.visible" 
      title="评估详情" 
      width="900px"
      top="5vh"
    >
      <div v-if="currentItem" class="detail-content">
        <div class="detail-header">
          <h3>{{ currentItem.title }}</h3>
          <div class="detail-meta">
            <el-tag :type="getContentTypeTag(currentItem.contentType)" style="margin-right: 10px;">
              {{ getContentTypeLabel(currentItem.contentType) }}
            </el-tag>
            <el-tag :type="getStatusTag(currentItem.status)">
              {{ getStatusLabel(currentItem.status) }}
            </el-tag>
          </div>
        </div>
        
        <div class="detail-body">
          <div class="detail-section">
            <h4>评分详情</h4>
            <el-row :gutter="20">
              <el-col :span="6">
                <div class="score-item">
                  <div class="score-value">{{ currentItem.overallScore }}</div>
                  <div class="score-label">综合评分</div>
                  <el-rate 
                    v-model="currentItem.overallScore / 20" 
                    :max="5" 
                    disabled 
                    :colors="['#F56C6C', '#E6A23C', '#67C23A']"
                    :low-threshold="2"
                    :high-threshold="4"
                  />
                </div>
              </el-col>
              <el-col :span="6">
                <div class="score-item">
                  <div class="score-value">{{ currentItem.qualityScore }}</div>
                  <div class="score-label">质量分</div>
                  <el-progress 
                    :percentage="currentItem.qualityScore" 
                    :color="getScoreColor(currentItem.qualityScore)"
                    :stroke-width="8"
                  />
                </div>
              </el-col>
              <el-col :span="6">
                <div class="score-item">
                  <div class="score-value">{{ currentItem.originalityScore }}</div>
                  <div class="score-label">原创分</div>
                  <el-progress 
                    :percentage="currentItem.originalityScore" 
                    :color="getScoreColor(currentItem.originalityScore)"
                    :stroke-width="8"
                  />
                </div>
              </el-col>
              <el-col :span="6">
                <div class="score-item">
                  <div class="score-value">{{ currentItem.complianceScore }}</div>
                  <div class="score-label">合规分</div>
                  <el-progress 
                    :percentage="currentItem.complianceScore" 
                    :color="getScoreColor(currentItem.complianceScore)"
                    :stroke-width="8"
                  />
                </div>
              </el-col>
            </el-row>
          </div>
          
          <div class="detail-section">
            <h4>评估维度详情</h4>
            <el-table :data="currentItem.dimensions" style="width: 100%" stripe>
              <el-table-column prop="name" label="维度" width="150" />
              <el-table-column prop="score" label="得分" width="100">
                <template #default="{ row }">
                  <span :style="{ color: getScoreColor(row.score) }">{{ row.score }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="maxScore" label="满分" width="80" />
              <el-table-column prop="weight" label="权重" width="80" />
              <el-table-column prop="description" label="说明" />
            </el-table>
          </div>
          
          <div class="detail-section">
            <h4>评估结果</h4>
            <div class="result-summary">
              <div class="result-item">
                <span class="result-label">是否通过:</span>
                <span :class="currentItem.passed ? 'passed' : 'failed'">
                  {{ currentItem.passed ? '通过' : '未通过' }}
                </span>
              </div>
              <div class="result-item">
                <span class="result-label">评估时间:</span>
                <span>{{ currentItem.evaluateTime || '未评估' }}</span>
              </div>
              <div class="result-item">
                <span class="result-label">评估人:</span>
                <span>{{ currentItem.evaluator || 'AI系统' }}</span>
              </div>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>评估建议</h4>
            <div class="suggestions">
              <div v-for="(suggestion, index) in currentItem.suggestions" :key="index" class="suggestion-item">
                <el-tag :type="suggestion.type" size="small" style="margin-right: 8px;">{{ suggestion.level }}</el-tag>
                <span>{{ suggestion.text }}</span>
              </div>
              <div v-if="!currentItem.suggestions || currentItem.suggestions.length === 0" class="no-suggestions">
                无评估建议
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailDialog.visible = false">关闭</el-button>
          <el-button type="primary" @click="handleReEvaluate(currentItem)">重新评估</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

// 评估项目类型定义
interface QualityItem {
  id: number;
  title: string;
  contentType: 'news' | 'blog' | 'product' | 'ad';
  status: 'pending' | 'evaluating' | 'completed' | 'manual_review';
  overallScore: number;
  qualityScore: number;
  originalityScore: number;
  complianceScore: number;
  dimensions: Array<{
    name: string;
    score: number;
    maxScore: number;
    weight: number;
    description: string;
  }>;
  suggestions: Array<{
    level: '高' | '中' | '低';
    type: 'success' | 'warning' | 'danger';
    text: string;
  }>;
  passed: boolean;
  evaluator?: string;
  evaluateTime?: string;
  createdAt: string;
  updatedAt: string;
}

// 搜索表单
const searchForm = reactive({
  title: '',
  status: '',
  contentType: ''
});

// 表格数据
const tableData = ref<QualityItem[]>([]);
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
  passed: 0,
  failed: 0,
  pending: 0
});

// 详情对话框
const detailDialog = reactive({
  visible: false
});

// 当前操作项目
const currentItem = ref<QualityItem | null>(null);

// 获取质量评估列表
const loadData = () => {
  loading.value = true;
  
  // 模拟异步加载数据
  setTimeout(() => {
    // 模拟数据
    const mockData: QualityItem[] = [
      {
        id: 1,
        title: '人工智能在医疗领域的最新突破',
        contentType: 'news',
        status: 'completed',
        overallScore: 85,
        qualityScore: 88,
        originalityScore: 92,
        complianceScore: 80,
        dimensions: [
          {
            name: '内容质量',
            score: 88,
            maxScore: 100,
            weight: 0.3,
            description: '内容结构清晰，逻辑合理'
          },
          {
            name: '原创性',
            score: 92,
            maxScore: 100,
            weight: 0.3,
            description: '内容原创度较高'
          },
          {
            name: '合规性',
            score: 80,
            maxScore: 100,
            weight: 0.2,
            description: '符合平台规范'
          },
          {
            name: '可读性',
            score: 90,
            maxScore: 100,
            weight: 0.2,
            description: '语言流畅，易于理解'
          }
        ],
        suggestions: [
          {
            level: '高',
            type: 'success',
            text: '内容质量优秀，建议直接通过'
          },
          {
            level: '中',
            type: 'warning',
            text: '可适当增加数据支撑'
          }
        ],
        passed: true,
        evaluator: 'AI系统',
        evaluateTime: '2024-01-01 10:30:00',
        createdAt: '2024-01-01 09:00:00',
        updatedAt: '2024-01-01 10:30:00'
      },
      {
        id: 2,
        title: '全球股市迎来新一轮上涨行情',
        contentType: 'news',
        status: 'completed',
        overallScore: 75,
        qualityScore: 72,
        originalityScore: 68,
        complianceScore: 85,
        dimensions: [
          {
            name: '内容质量',
            score: 72,
            maxScore: 100,
            weight: 0.3,
            description: '内容基本准确'
          },
          {
            name: '原创性',
            score: 68,
            maxScore: 100,
            weight: 0.3,
            description: '部分内容为转载'
          },
          {
            name: '合规性',
            score: 85,
            maxScore: 100,
            weight: 0.2,
            description: '完全合规'
          },
          {
            name: '可读性',
            score: 78,
            maxScore: 100,
            weight: 0.2,
            description: '语言较为流畅'
          }
        ],
        suggestions: [
          {
            level: '中',
            type: 'warning',
            text: '建议增加原创内容比例'
          },
          {
            level: '低',
            type: 'danger',
            text: '部分数据需要核实'
          }
        ],
        passed: true,
        evaluator: 'AI系统',
        evaluateTime: '2024-01-01 10:45:00',
        createdAt: '2024-01-01 09:15:00',
        updatedAt: '2024-01-01 10:45:00'
      },
      {
        id: 3,
        title: '新能源汽车销量创新高',
        contentType: 'news',
        status: 'completed',
        overallScore: 92,
        qualityScore: 95,
        originalityScore: 88,
        complianceScore: 90,
        dimensions: [
          {
            name: '内容质量',
            score: 95,
            maxScore: 100,
            weight: 0.3,
            description: '内容详实，分析深入'
          },
          {
            name: '原创性',
            score: 88,
            maxScore: 100,
            weight: 0.3,
            description: '原创度较高'
          },
          {
            name: '合规性',
            score: 90,
            maxScore: 100,
            weight: 0.2,
            description: '完全合规'
          },
          {
            name: '可读性',
            score: 92,
            maxScore: 100,
            weight: 0.2,
            description: '语言生动，吸引读者'
          }
        ],
        suggestions: [
          {
            level: '高',
            type: 'success',
            text: '内容质量优秀，可推荐首页'
          }
        ],
        passed: true,
        evaluator: 'AI系统',
        evaluateTime: '2024-01-01 11:00:00',
        createdAt: '2024-01-01 09:30:00',
        updatedAt: '2024-01-01 11:00:00'
      },
      {
        id: 4,
        title: '明星恋情曝光引发热议',
        contentType: 'blog',
        status: 'completed',
        overallScore: 58,
        qualityScore: 55,
        originalityScore: 45,
        complianceScore: 70,
        dimensions: [
          {
            name: '内容质量',
            score: 55,
            maxScore: 100,
            weight: 0.3,
            description: '内容质量一般'
          },
          {
            name: '原创性',
            score: 45,
            maxScore: 100,
            weight: 0.3,
            description: '原创度较低'
          },
          {
            name: '合规性',
            score: 70,
            maxScore: 100,
            weight: 0.2,
            description: '基本合规'
          },
          {
            name: '可读性',
            score: 62,
            maxScore: 100,
            weight: 0.2,
            description: '语言平淡'
          }
        ],
        suggestions: [
          {
            level: '低',
            type: 'danger',
            text: '原创度严重不足，建议驳回'
          },
          {
            level: '中',
            type: 'danger',
            text: '内容质量需要大幅提升'
          }
        ],
        passed: false,
        evaluator: 'AI系统',
        evaluateTime: '2024-01-01 11:15:00',
        createdAt: '2024-01-01 09:45:00',
        updatedAt: '2024-01-01 11:15:00'
      },
      {
        id: 5,
        title: '科技创新大会圆满落幕',
        contentType: 'news',
        status: 'pending',
        overallScore: 0,
        qualityScore: 0,
        originalityScore: 0,
        complianceScore: 0,
        dimensions: [],
        suggestions: [],
        passed: false,
        createdAt: '2024-01-01 10:00:00',
        updatedAt: '2024-01-01 10:00:00'
      },
      {
        id: 6,
        title: '健康饮食新潮流',
        contentType: 'blog',
        status: 'evaluating',
        overallScore: 0,
        qualityScore: 0,
        originalityScore: 0,
        complianceScore: 0,
        dimensions: [],
        suggestions: [],
        passed: false,
        createdAt: '2024-01-01 10:15:00',
        updatedAt: '2024-01-01 10:15:00'
      },
      {
        id: 7,
        title: '教育改革新政策解读',
        contentType: 'news',
        status: 'completed',
        overallScore: 88,
        qualityScore: 90,
        originalityScore: 85,
        complianceScore: 92,
        dimensions: [
          {
            name: '内容质量',
            score: 90,
            maxScore: 100,
            weight: 0.3,
            description: '政策解读准确'
          },
          {
            name: '原创性',
            score: 85,
            maxScore: 100,
            weight: 0.3,
            description: '有一定原创分析'
          },
          {
            name: '合规性',
            score: 92,
            maxScore: 100,
            weight: 0.2,
            description: '完全合规'
          },
          {
            name: '可读性',
            score: 88,
            maxScore: 100,
            weight: 0.2,
            description: '语言清晰易懂'
          }
        ],
        suggestions: [
          {
            level: '高',
            type: 'success',
            text: '政策解读准确，建议推荐'
          }
        ],
        passed: true,
        evaluator: 'AI系统',
        evaluateTime: '2024-01-01 11:30:00',
        createdAt: '2024-01-01 10:30:00',
        updatedAt: '2024-01-01 11:30:00'
      },
      {
        id: 8,
        title: '旅游景点推荐攻略',
        contentType: 'blog',
        status: 'manual_review',
        overallScore: 70,
        qualityScore: 68,
        originalityScore: 72,
        complianceScore: 75,
        dimensions: [
          {
            name: '内容质量',
            score: 68,
            maxScore: 100,
            weight: 0.3,
            description: '内容质量中等'
          },
          {
            name: '原创性',
            score: 72,
            maxScore: 100,
            weight: 0.3,
            description: '有一定的原创内容'
          },
          {
            name: '合规性',
            score: 75,
            maxScore: 100,
            weight: 0.2,
            description: '合规但需人工确认'
          },
          {
            name: '可读性',
            score: 70,
            maxScore: 100,
            weight: 0.2,
            description: '可读性一般'
          }
        ],
        suggestions: [
          {
            level: '中',
            type: 'warning',
            text: '建议人工复核合规性'
          }
        ],
        passed: false,
        evaluator: 'AI系统',
        evaluateTime: '2024-01-01 11:45:00',
        createdAt: '2024-01-01 10:45:00',
        updatedAt: '2024-01-01 11:45:00'
      },
      {
        id: 9,
        title: '房产市场调控政策分析',
        contentType: 'news',
        status: 'completed',
        overallScore: 82,
        qualityScore: 85,
        originalityScore: 78,
        complianceScore: 85,
        dimensions: [
          {
            name: '内容质量',
            score: 85,
            maxScore: 100,
            weight: 0.3,
            description: '分析较为深入'
          },
          {
            name: '原创性',
            score: 78,
            maxScore: 100,
            weight: 0.3,
            description: '有一定原创观点'
          },
          {
            name: '合规性',
            score: 85,
            maxScore: 100,
            weight: 0.2,
            description: '完全合规'
          },
          {
            name: '可读性',
            score: 82,
            maxScore: 100,
            weight: 0.2,
            description: '语言流畅'
          }
        ],
        suggestions: [
          {
            level: '中',
            type: 'success',
            text: '内容质量良好，建议通过'
          }
        ],
        passed: true,
        evaluator: 'AI系统',
        evaluateTime: '2024-01-01 12:00:00',
        createdAt: '2024-01-01 11:00:00',
        updatedAt: '2024-01-01 12:00:00'
      },
      {
        id: 10,
        title: '人工智能伦理问题探讨',
        contentType: 'blog',
        status: 'completed',
        overallScore: 95,
        qualityScore: 96,
        originalityScore: 94,
        complianceScore: 92,
        dimensions: [
          {
            name: '内容质量',
            score: 96,
            maxScore: 100,
            weight: 0.3,
            description: '内容深度很高'
          },
          {
            name: '原创性',
            score: 94,
            maxScore: 100,
            weight: 0.3,
            description: '原创度极高'
          },
          {
            name: '合规性',
            score: 92,
            maxScore: 100,
            weight: 0.2,
            description: '完全合规'
          },
          {
            name: '可读性',
            score: 95,
            maxScore: 100,
            weight: 0.2,
            description: '语言优美，引人深思'
          }
        ],
        suggestions: [
          {
            level: '高',
            type: 'success',
            text: '内容质量极佳，建议置顶推荐'
          }
        ],
        passed: true,
        evaluator: 'AI系统',
        evaluateTime: '2024-01-01 12:15:00',
        createdAt: '2024-01-01 11:15:00',
        updatedAt: '2024-01-01 12:15:00'
      }
    ];
    
    // 应用搜索过滤
    let filteredData = mockData.filter(item => {
      let match = true;
      if (searchForm.title && !item.title.includes(searchForm.title)) {
        match = false;
      }
      if (searchForm.status && item.status !== searchForm.status) {
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
    
    // 计算统计数据
    stats.total = mockData.length;
    stats.passed = mockData.filter(item => item.passed).length;
    stats.failed = mockData.filter(item => !item.passed && item.status === 'completed').length;
    stats.pending = mockData.filter(item => item.status === 'pending' || item.status === 'evaluating').length;
    
    loading.value = false;
  }, 500);
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

// 状态标签样式
const getStatusTag = (status: string) => {
  switch (status) {
    case 'pending': return 'info';
    case 'evaluating': return 'warning';
    case 'completed': return 'success';
    case 'manual_review': return 'danger';
    default: return 'info';
  }
};

// 状态标签显示文本
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending': return '待评估';
    case 'evaluating': return '评估中';
    case 'completed': return '已完成';
    case 'manual_review': return '需人工复核';
    default: return status;
  }
};

// 分数颜色
const getScoreColor = (score: number) => {
  if (score >= 80) return '#67C23A'; // 绿色
  if (score >= 60) return '#E6A23C'; // 黄色
  return '#F56C6C'; // 红色
};

// 搜索
const handleSearch = () => {
  pagination.currentPage = 1;
  loadData();
};

// 重置
const handleReset = () => {
  searchForm.title = '';
  searchForm.status = '';
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

// 刷新
const handleRefresh = () => {
  loadData();
  ElMessage.success('已刷新数据');
};

// 导出报告
const handleExportReport = () => {
  ElMessage.success('报告导出功能开发中...');
};

// 查看详情
const handleView = (row: QualityItem) => {
  currentItem.value = { ...row };
  detailDialog.visible = true;
};

// 重新评估
const handleReEvaluate = async (row: QualityItem) => {
  try {
    await ElMessageBox.confirm(
      '确定要重新评估此内容吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    // 模拟重新评估过程
    row.status = 'evaluating';
    row.updatedAt = new Date().toLocaleString();
    
    // 模拟评估完成
    setTimeout(() => {
      // 生成新的评估分数
      row.overallScore = Math.floor(Math.random() * 40) + 60; // 60-100
      row.qualityScore = Math.floor(Math.random() * 40) + 60;
      row.originalityScore = Math.floor(Math.random() * 40) + 60;
      row.complianceScore = Math.floor(Math.random() * 40) + 60;
      row.status = 'completed';
      row.evaluateTime = new Date().toLocaleString();
      row.evaluator = 'AI系统';
      row.passed = row.overallScore >= 70;
      row.updatedAt = new Date().toLocaleString();
      
      // 生成新的建议
      row.suggestions = [];
      if (row.overallScore >= 90) {
        row.suggestions.push({
          level: '高',
          type: 'success',
          text: '内容质量优秀，建议直接通过'
        });
      } else if (row.overallScore >= 70) {
        row.suggestions.push({
          level: '中',
          type: 'warning',
          text: '内容质量合格，可考虑通过'
        });
      } else {
        row.suggestions.push({
          level: '低',
          type: 'danger',
          text: '内容质量不足，建议驳回'
        });
      }
      
      ElMessage.success('重新评估完成');
    }, 2000);
  } catch (error) {
    console.error('Re-evaluate cancelled:', error);
  }
};

// 人工复核
const handleManualReview = (row: QualityItem) => {
  ElMessage.info('已提交人工复核');
  row.status = 'manual_review';
  row.updatedAt = new Date().toLocaleString();
};

// 初始化
onMounted(() => {
  loadData();
});
</script>

<style scoped>
.quality-container {
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
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: bold;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

.score-item {
  text-align: center;
  padding: 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.score-value {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 5px;
}

.score-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 10px;
}

.result-summary {
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.result-item {
  display: flex;
  margin-bottom: 8px;
}

.result-label {
  font-weight: bold;
  width: 80px;
  margin-right: 10px;
}

.result-item .passed {
  color: #67C23A;
}

.result-item .failed {
  color: #F56C6C;
}

.suggestions {
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.suggestion-item {
  margin-bottom: 8px;
}

.no-suggestions {
  color: #909399;
  font-style: italic;
}

.dialog-footer {
  text-align: right;
}
</style>