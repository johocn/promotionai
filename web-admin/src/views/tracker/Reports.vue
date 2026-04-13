<template>
  <!-- 统计报告页面 -->
  <div class="reports-container">
    <el-card class="card-container">
      <template #header>
        <div class="card-header">
          <span>统计报告</span>
          <div class="header-actions">
            <el-button type="primary" @click="handleGenerateReport">生成报告</el-button>
            <el-button type="success" @click="handleExport">导出报告</el-button>
            <el-button type="info" @click="handleRefresh">刷新</el-button>
          </div>
        </div>
      </template>

      <!-- 筛选区域 -->
      <div class="filter-box">
        <el-form :model="filterForm" inline>
          <el-form-item label="报告类型">
            <el-select v-model="filterForm.reportType" placeholder="请选择报告类型" clearable>
              <el-option label="日报告" value="daily" />
              <el-option label="周报告" value="weekly" />
              <el-option label="月报告" value="monthly" />
              <el-option label="季报告" value="quarterly" />
              <el-option label="年报告" value="yearly" />
              <el-option label="自定义" value="custom" />
            </el-select>
          </el-form-item>
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="filterForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
          <el-form-item label="维度">
            <el-select v-model="filterForm.dimension" placeholder="请选择分析维度" clearable>
              <el-option label="渠道" value="channel" />
              <el-option label="内容类型" value="content_type" />
              <el-option label="地区" value="region" />
              <el-option label="设备" value="device" />
              <el-option label="时间" value="time" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleFilter">筛选</el-button>
            <el-button @click="handleResetFilter">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 统计卡片区域 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-item">
              <div class="stat-number">{{ stats.impressions }}</div>
              <div class="stat-label">曝光量</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-item">
              <div class="stat-number">{{ stats.visitors }}</div>
              <div class="stat-label">独立访客</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-item">
              <div class="stat-number">{{ stats.pageViews }}</div>
              <div class="stat-label">页面浏览</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-item">
              <div class="stat-number" :style="{ color: '#67C23A' }">{{ stats.conversionRate }}%</div>
              <div class="stat-label">转化率</div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 图表区域 -->
      <el-row :gutter="20" class="chart-row">
        <el-col :span="16">
          <el-card class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>流量趋势图</span>
              </div>
            </template>
            <div ref="trafficChartRef" class="chart-container" style="height: 400px;"></div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>来源分布</span>
              </div>
            </template>
            <div ref="sourceChartRef" class="chart-container" style="height: 400px;"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="chart-row">
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>转化漏斗</span>
              </div>
            </template>
            <div ref="funnelChartRef" class="chart-container" style="height: 300px;"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>设备分布</span>
              </div>
            </template>
            <div ref="deviceChartRef" class="chart-container" style="height: 300px;"></div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 报告列表 -->
      <el-card class="report-list-card">
        <template #header>
          <div class="table-header">
            <span>报告列表</span>
          </div>
        </template>
        
        <el-table 
          :data="reportList" 
          v-loading="loading"
          stripe
          style="width: 100%"
        >
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="title" label="报告标题" min-width="200" show-overflow-tooltip />
          <el-table-column prop="type" label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="getReportTypeTag(row.type)">{{ getReportTypeLabel(row.type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="period" label="期间" width="150" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getReportStatusTag(row.status)">{{ getReportStatusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="size" label="大小" width="100" />
          <el-table-column prop="createTime" label="创建时间" width="180" />
          <el-table-column prop="updateTime" label="更新时间" width="180" />
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="handleViewReport(row)">查看</el-button>
              <el-button size="small" type="primary" @click="handleDownloadReport(row)">下载</el-button>
              <el-button size="small" type="danger" @click="handleDeleteReport(row)">删除</el-button>
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
    </el-card>

    <!-- 报告详情对话框 -->
    <el-dialog 
      v-model="detailDialog.visible" 
      title="报告详情" 
      width="900px"
      top="5vh"
    >
      <div v-if="currentReport" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ currentReport.id }}</el-descriptions-item>
          <el-descriptions-item label="报告标题">{{ currentReport.title }}</el-descriptions-item>
          <el-descriptions-item label="报告类型">
            <el-tag :type="getReportTypeTag(currentReport.type)">{{ getReportTypeLabel(currentReport.type) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="分析期间">{{ currentReport.period }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getReportStatusTag(currentReport.status)">{{ getReportStatusLabel(currentReport.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="文件大小">{{ currentReport.size }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentReport.createTime }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ currentReport.updateTime }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ currentReport.description || '无' }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="detail-section">
          <h4>关键指标</h4>
          <el-row :gutter="20">
            <el-col :span="6">
              <div class="metric-card">
                <div class="metric-value">{{ currentReport.metrics?.impressions || 0 }}</div>
                <div class="metric-label">曝光量</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="metric-card">
                <div class="metric-value">{{ currentReport.metrics?.visitors || 0 }}</div>
                <div class="metric-label">独立访客</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="metric-card">
                <div class="metric-value">{{ currentReport.metrics?.pageViews || 0 }}</div>
                <div class="metric-label">页面浏览</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="metric-card">
                <div class="metric-value" :style="{ color: '#67C23A' }">{{ currentReport.metrics?.conversionRate || 0 }}%</div>
                <div class="metric-label">转化率</div>
              </div>
            </el-col>
          </el-row>
        </div>
        
        <div class="detail-section">
          <h4>图表预览</h4>
          <el-row :gutter="20">
            <el-col :span="12">
              <div ref="detailTrafficChartRef" class="chart-container" style="height: 300px;"></div>
            </el-col>
            <el-col :span="12">
              <div ref="detailSourceChartRef" class="chart-container" style="height: 300px;"></el-col>
            </el-col>
          </el-row>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailDialog.visible = false">关闭</el-button>
          <el-button type="primary" @click="handleDownloadReport(currentReport)">下载报告</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import * as echarts from 'echarts/core';
import {
  BarChart,
  LineChart,
  PieChart,
  FunnelChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// 注册ECharts组件
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  FunnelChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  CanvasRenderer
]);

// 报告类型定义
interface Report {
  id: number;
  title: string;
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  period: string;
  status: 'generating' | 'completed' | 'failed' | 'archived';
  size: string;
  createTime: string;
  updateTime: string;
  description?: string;
  metrics?: {
    impressions: number;
    visitors: number;
    pageViews: number;
    conversionRate: number;
  };
}

// 筛选表单
const filterForm = reactive({
  reportType: '',
  dateRange: [] as [string, string] | [],
  dimension: ''
});

// 统计信息
const stats = reactive({
  impressions: 0,
  visitors: 0,
  pageViews: 0,
  conversionRate: 0
});

// 报告列表
const reportList = ref<Report[]>([]);
const loading = ref(false);

// 分页信息
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
});

// 图表引用
const trafficChartRef = ref<HTMLDivElement>();
const sourceChartRef = ref<HTMLDivElement>();
const funnelChartRef = ref<HTMLDivElement>();
const deviceChartRef = ref<HTMLDivElement>();
const detailTrafficChartRef = ref<HTMLDivElement>();
const detailSourceChartRef = ref<HTMLDivElement>();

// 图表实例
let trafficChart: echarts.ECharts | null = null;
let sourceChart: echarts.ECharts | null = null;
let funnelChart: echarts.ECharts | null = null;
let deviceChart: echarts.ECharts | null = null;
let detailTrafficChart: echarts.ECharts | null = null;
let detailSourceChart: echarts.ECharts | null = null;

// 详情对话框
const detailDialog = reactive({
  visible: false
});

// 当前报告
const currentReport = ref<Report | null>(null);

// 加载报告数据
const loadData = () => {
  loading.value = true;
  
  // 模拟异步加载数据
  setTimeout(() => {
    // 模拟统计数据
    stats.impressions = 125800;
    stats.visitors = 45200;
    stats.pageViews = 89500;
    stats.conversionRate = 3.65;
    
    // 模拟报告列表数据
    const mockReports: Report[] = [
      {
        id: 1,
        title: '2024年1月运营数据报告',
        type: 'monthly',
        period: '2024-01-01 至 2024-01-31',
        status: 'completed',
        size: '2.4 MB',
        createTime: '2024-02-01 10:30:00',
        updateTime: '2024-02-01 10:35:00',
        description: '2024年1月份整体运营数据分析报告',
        metrics: {
          impressions: 3800000,
          visitors: 125000,
          pageViews: 280000,
          conversionRate: 4.2
        }
      },
      {
        id: 2,
        title: '2024年第1周流量分析报告',
        type: 'weekly',
        period: '2024-01-01 至 2024-01-07',
        status: 'completed',
        size: '1.2 MB',
        createTime: '2024-01-08 09:15:00',
        updateTime: '2024-01-08 09:20:00',
        description: '2024年第1周流量来源及转化分析',
        metrics: {
          impressions: 950000,
          visitors: 32000,
          pageViews: 70000,
          conversionRate: 3.8
        }
      },
      {
        id: 3,
        title: 'AI内容推广效果分析',
        type: 'custom',
        period: '2024-01-15 至 2024-01-31',
        status: 'completed',
        size: '1.8 MB',
        createTime: '2024-02-01 14:20:00',
        updateTime: '2024-02-01 14:25:00',
        description: 'AI生成内容推广活动专项分析报告',
        metrics: {
          impressions: 1500000,
          visitors: 58000,
          pageViews: 120000,
          conversionRate: 5.1
        }
      },
      {
        id: 4,
        title: '2024年1月25日日报',
        type: 'daily',
        period: '2024-01-25',
        status: 'completed',
        size: '512 KB',
        createTime: '2024-01-26 08:30:00',
        updateTime: '2024-01-26 08:32:00',
        description: '2024年1月25日运营数据日报',
        metrics: {
          impressions: 125000,
          visitors: 4200,
          pageViews: 9800,
          conversionRate: 3.2
        }
      },
      {
        id: 5,
        title: '社交媒体渠道效果分析',
        type: 'custom',
        period: '2024-01-01 至 2024-01-31',
        status: 'generating',
        size: '0 KB',
        createTime: '2024-02-01 16:45:00',
        updateTime: '2024-02-01 16:45:00',
        description: '各社交媒体渠道推广效果对比分析',
        metrics: {
          impressions: 0,
          visitors: 0,
          pageViews: 0,
          conversionRate: 0
        }
      },
      {
        id: 6,
        title: '2024年第1季度总结报告',
        type: 'quarterly',
        period: '2024-01-01 至 2024-03-31',
        status: 'completed',
        size: '3.1 MB',
        createTime: '2024-04-01 11:00:00',
        updateTime: '2024-04-01 11:10:00',
        description: '2024年第一季度业务运营总结',
        metrics: {
          impressions: 12500000,
          visitors: 420000,
          pageViews: 980000,
          conversionRate: 4.1
        }
      },
      {
        id: 7,
        title: '内容类型转化率分析',
        type: 'custom',
        period: '2024-01-01 至 2024-01-31',
        status: 'completed',
        size: '1.5 MB',
        createTime: '2024-02-01 13:45:00',
        updateTime: '2024-02-01 13:50:00',
        description: '不同类型内容转化效果对比分析',
        metrics: {
          impressions: 2100000,
          visitors: 75000,
          pageViews: 165000,
          conversionRate: 4.8
        }
      },
      {
        id: 8,
        title: '2024年度预算规划报告',
        type: 'yearly',
        period: '2024-01-01 至 2024-12-31',
        status: 'archived',
        size: '4.2 MB',
        createTime: '2023-12-15 15:30:00',
        updateTime: '2023-12-15 15:45:00',
        description: '2024年度预算规划及预期目标',
        metrics: {
          impressions: 0,
          visitors: 0,
          pageViews: 0,
          conversionRate: 0
        }
      }
    ];
    
    // 应用筛选条件
    let filteredReports = [...mockReports];
    
    // 报告类型筛选
    if (filterForm.reportType) {
      filteredReports = filteredReports.filter(report => report.type === filterForm.reportType);
    }
    
    // 更新总数和当前页数据
    pagination.total = filteredReports.length;
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    reportList.value = filteredReports.slice(start, end);
    
    // 更新图表
    updateCharts();
    
    loading.value = false;
  }, 500);
};

// 更新图表
const updateCharts = () => {
  nextTick(() => {
    // 流量趋势图
    if (trafficChartRef.value) {
      if (!trafficChart) {
        trafficChart = echarts.init(trafficChartRef.value);
      }
      
      const dates = ['1日', '2日', '3日', '4日', '5日', '6日', '7日', '8日', '9日', '10日'];
      const impressions = [120000, 135000, 110000, 145000, 160000, 130000, 150000, 140000, 155000, 170000];
      const visitors = [40000, 45000, 38000, 50000, 55000, 42000, 48000, 46000, 52000, 58000];
      const pageViews = [80000, 90000, 75000, 100000, 110000, 85000, 95000, 92000, 102000, 115000];
      
      const trafficOption = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            label: {
              backgroundColor: '#6a7985'
            }
          }
        },
        legend: {
          data: ['曝光量', '独立访客', '页面浏览']
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: [
          {
            type: 'category',
            boundaryGap: false,
            data: dates
          }
        ],
        yAxis: [
          {
            type: 'value'
          }
        ],
        series: [
          {
            name: '曝光量',
            type: 'line',
            stack: '总量',
            areaStyle: {},
            emphasis: {
              focus: 'series'
            },
            data: impressions
          },
          {
            name: '独立访客',
            type: 'line',
            stack: '总量',
            areaStyle: {},
            emphasis: {
              focus: 'series'
            },
            data: visitors
          },
          {
            name: '页面浏览',
            type: 'line',
            stack: '总量',
            areaStyle: {},
            emphasis: {
              focus: 'series'
            },
            data: pageViews
          }
        ]
      };
      
      trafficChart.setOption(trafficOption);
    }
    
    // 来源分布图
    if (sourceChartRef.value) {
      if (!sourceChart) {
        sourceChart = echarts.init(sourceChartRef.value);
      }
      
      const sourceOption = {
        tooltip: {
          trigger: 'item'
        },
        legend: {
          orient: 'vertical',
          left: 'left'
        },
        series: [
          {
            name: '流量来源',
            type: 'pie',
            radius: '80%',
            data: [
              { value: 45, name: '搜索引擎' },
              { value: 25, name: '社交媒体' },
              { value: 15, name: '直接访问' },
              { value: 10, name: '推荐链接' },
              { value: 5, name: '其他' }
            ],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }
        ]
      };
      
      sourceChart.setOption(sourceOption);
    }
    
    // 转化漏斗图
    if (funnelChartRef.value) {
      if (!funnelChart) {
        funnelChart = echarts.init(funnelChartRef.value);
      }
      
      const funnelOption = {
        title: {
          text: '转化漏斗',
          subtext: '各阶段转化率'
        },
        tooltip: {
          trigger: 'item',
          formatter: "{a} <br/>{b}: {c}%"
        },
        series: [
          {
            name: '转化率',
            type: 'funnel',
            left: '10%',
            top: 60,
            bottom: 60,
            width: '80%',
            min: 0,
            max: 100,
            minSize: '0%',
            maxSize: '100%',
            sort: 'descending',
            gap: 2,
            label: {
              show: true,
              position: 'inside'
            },
            labelLine: {
              length: 10,
              lineStyle: {
                width: 1,
                type: 'solid'
              }
            },
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 1
            },
            emphasis: {
              label: {
                fontSize: 20
              }
            },
            data: [
              { value: 100, name: '曝光' },
              { value: 60, name: '访问' },
              { value: 40, name: '浏览详情' },
              { value: 20, name: '加入购物车' },
              { value: 8, name: '支付成功' }
            ]
          }
        ]
      };
      
      funnelChart.setOption(funnelOption);
    }
    
    // 设备分布图
    if (deviceChartRef.value) {
      if (!deviceChart) {
        deviceChart = echarts.init(deviceChartRef.value);
      }
      
      const deviceOption = {
        tooltip: {
          trigger: 'item'
        },
        legend: {
          orient: 'vertical',
          left: 'left'
        },
        series: [
          {
            name: '设备类型',
            type: 'pie',
            radius: '80%',
            data: [
              { value: 55, name: '移动端' },
              { value: 35, name: '桌面端' },
              { value: 10, name: '平板端' }
            ],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }
        ]
      };
      
      deviceChart.setOption(deviceOption);
    }
  });
};

// 报告类型标签样式
const getReportTypeTag = (type: string) => {
  switch (type) {
    case 'daily': return 'info';
    case 'weekly': return 'primary';
    case 'monthly': return 'success';
    case 'quarterly': return 'warning';
    case 'yearly': return 'danger';
    case 'custom': return 'purple';
    default: return 'info';
  }
};

// 报告类型标签显示文本
const getReportTypeLabel = (type: string) => {
  switch (type) {
    case 'daily': return '日报告';
    case 'weekly': return '周报告';
    case 'monthly': return '月报告';
    case 'quarterly': return '季报告';
    case 'yearly': return '年报告';
    case 'custom': return '自定义';
    default: return type;
  }
};

// 报告状态标签样式
const getReportStatusTag = (status: string) => {
  switch (status) {
    case 'generating': return 'warning';
    case 'completed': return 'success';
    case 'failed': return 'danger';
    case 'archived': return 'info';
    default: return 'info';
  }
};

// 报告状态标签显示文本
const getReportStatusLabel = (status: string) => {
  switch (status) {
    case 'generating': return '生成中';
    case 'completed': return '已完成';
    case 'failed': return '失败';
    case 'archived': return '已归档';
    default: return status;
  }
};

// 生成报告
const handleGenerateReport = () => {
  ElMessage.success('报告生成任务已提交');
};

// 导出报告
const handleExport = () => {
  ElMessage.success('报告导出功能开发中...');
};

// 刷新
const handleRefresh = () => {
  loadData();
  ElMessage.success('数据已刷新');
};

// 筛选
const handleFilter = () => {
  pagination.currentPage = 1;
  loadData();
};

// 重置筛选
const handleResetFilter = () => {
  filterForm.reportType = '';
  filterForm.dateRange = [];
  filterForm.dimension = '';
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

// 查看报告
const handleViewReport = (row: Report) => {
  currentReport.value = { ...row };
  
  // 更新详情图表
  nextTick(() => {
    if (detailTrafficChartRef.value) {
      if (!detailTrafficChart) {
        detailTrafficChart = echarts.init(detailTrafficChartRef.value);
      }
      
      const dates = ['1日', '2日', '3日', '4日', '5日'];
      const impressions = [120000, 135000, 110000, 145000, 160000];
      const visitors = [40000, 45000, 38000, 50000, 55000];
      
      const detailTrafficOption = {
        tooltip: {
          trigger: 'axis'
        },
        legend: {
          data: ['曝光量', '独立访客']
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: dates
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: '曝光量',
            type: 'line',
            stack: '总量',
            data: impressions
          },
          {
            name: '独立访客',
            type: 'line',
            stack: '总量',
            data: visitors
          }
        ]
      };
      
      detailTrafficChart.setOption(detailTrafficOption);
    }
    
    if (detailSourceChartRef.value) {
      if (!detailSourceChart) {
        detailSourceChart = echarts.init(detailSourceChartRef.value);
      }
      
      const detailSourceOption = {
        tooltip: {
          trigger: 'item'
        },
        legend: {
          orient: 'vertical',
          left: 'left'
        },
        series: [
          {
            name: '流量来源',
            type: 'pie',
            radius: '80%',
            data: [
              { value: 45, name: '搜索引擎' },
              { value: 25, name: '社交媒体' },
              { value: 15, name: '直接访问' },
              { value: 10, name: '推荐链接' },
              { value: 5, name: '其他' }
            ],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }
        ]
      };
      
      detailSourceChart.setOption(detailSourceOption);
    }
  });
  
  detailDialog.visible = true;
};

// 下载报告
const handleDownloadReport = (row: Report) => {
  ElMessage.success(`正在下载报告: ${row.title}`);
  console.log('Downloading report:', row);
};

// 删除报告
const handleDeleteReport = async (row: Report) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除报告 "${row.title}" 吗？此操作不可恢复。`,
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'error'
      }
    );
    
    // 模拟删除操作
    const index = reportList.value.findIndex(item => item.id === row.id);
    if (index > -1) {
      reportList.value.splice(index, 1);
      pagination.total--;
      ElMessage.success('报告已删除');
    }
  } catch (error) {
    console.error('Delete cancelled:', error);
  }
};

// 窗口大小改变时重新调整图表
const resizeCharts = () => {
  if (trafficChart) trafficChart.resize();
  if (sourceChart) sourceChart.resize();
  if (funnelChart) funnelChart.resize();
  if (deviceChart) deviceChart.resize();
  if (detailTrafficChart) detailTrafficChart.resize();
  if (detailSourceChart) detailSourceChart.resize();
};

// 监听窗口大小变化
window.addEventListener('resize', resizeCharts);

// 初始化
onMounted(() => {
  loadData();
});

// 组件销毁时清理图表
onUnmounted(() => {
  if (trafficChart) trafficChart.dispose();
  if (sourceChart) sourceChart.dispose();
  if (funnelChart) funnelChart.dispose();
  if (deviceChart) deviceChart.dispose();
  if (detailTrafficChart) detailTrafficChart.dispose();
  if (detailSourceChart) detailSourceChart.dispose();
  window.removeEventListener('resize', resizeCharts);
});
</script>

<style scoped>
.reports-container {
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

.filter-box {
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

.chart-row {
  margin-bottom: 20px;
}

.chart-card {
  height: 100%;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  width: 100%;
  height: 100%;
}

.report-list-card {
  margin-top: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-container {
  margin-top: 20px;
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

.metric-card {
  text-align: center;
  padding: 15px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  margin-bottom: 10px;
}

.metric-value {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 5px;
}

.metric-label {
  font-size: 14px;
  color: #909399;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-descriptions__content) {
  word-break: break-all;
}
</style>