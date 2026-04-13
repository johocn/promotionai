<template>
  <!-- 转化分析页面 -->
  <div class="analysis-container">
    <el-card class="card-container">
      <template #header>
        <div class="card-header">
          <span>转化分析</span>
          <div class="header-actions">
            <el-button type="primary" @click="handleRefresh">刷新数据</el-button>
            <el-button type="success" @click="handleExport">导出报表</el-button>
          </div>
        </div>
      </template>

      <!-- 筛选区域 -->
      <div class="filter-box">
        <el-form :model="filterForm" inline>
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
          <el-form-item label="渠道来源">
            <el-select v-model="filterForm.channel" placeholder="请选择渠道" clearable>
              <el-option label="搜索引擎" value="search_engine" />
              <el-option label="社交媒体" value="social_media" />
              <el-option label="电子邮件" value="email" />
              <el-option label="直接访问" value="direct" />
              <el-option label="推荐链接" value="referral" />
            </el-select>
          </el-form-item>
          <el-form-item label="内容类型">
            <el-select v-model="filterForm.contentType" placeholder="请选择内容类型" clearable>
              <el-option label="新闻" value="news" />
              <el-option label="博客" value="blog" />
              <el-option label="产品" value="product" />
              <el-option label="广告" value="ad" />
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
              <div class="stat-number">{{ stats.totalVisitors }}</div>
              <div class="stat-label">总访客数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-item">
              <div class="stat-number">{{ stats.totalConversions }}</div>
              <div class="stat-label">总转化数</div>
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
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-item">
              <div class="stat-number" :style="{ color: '#409EFF' }">{{ stats.averageTime }}s</div>
              <div class="stat-label">平均停留时间</div>
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
                <span>转化趋势图</span>
              </div>
            </template>
            <div ref="trendChartRef" class="chart-container" style="height: 400px;"></div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>渠道分布</span>
              </div>
            </template>
            <div ref="channelChartRef" class="chart-container" style="height: 400px;"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="chart-row">
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>内容类型转化率</span>
              </div>
            </template>
            <div ref="contentTypeChartRef" class="chart-container" style="height: 300px;"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>设备类型分布</span>
              </div>
            </template>
            <div ref="deviceChartRef" class="chart-container" style="height: 300px;"></div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 详细数据表格 -->
      <el-card class="data-table-card">
        <template #header>
          <div class="table-header">
            <span>详细数据</span>
          </div>
        </template>
        
        <el-table 
          :data="tableData" 
          v-loading="loading"
          stripe
          style="width: 100%"
        >
          <el-table-column prop="date" label="日期" width="120" />
          <el-table-column prop="visitors" label="访客数" width="100" />
          <el-table-column prop="conversions" label="转化数" width="100" />
          <el-table-column prop="conversionRate" label="转化率" width="100">
            <template #default="{ row }">
              {{ row.conversionRate }}%
            </template>
          </el-table-column>
          <el-table-column prop="avgTime" label="平均停留时间(s)" width="150" />
          <el-table-column prop="bounceRate" label="跳出率(%)" width="120">
            <template #default="{ row }">
              {{ row.bounceRate }}%
            </template>
          </el-table-column>
          <el-table-column prop="channel" label="渠道" width="120">
            <template #default="{ row }">
              <el-tag :type="getChannelTag(row.channel)">{{ getChannelLabel(row.channel) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="contentType" label="内容类型" width="120">
            <template #default="{ row }">
              <el-tag :type="getContentTypeTag(row.contentType)">{{ getContentTypeLabel(row.contentType) }}</el-tag>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import * as echarts from 'echarts/core';
import {
  BarChart,
  LineChart,
  PieChart,
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
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  CanvasRenderer
]);

// 分析数据类型定义
interface AnalysisData {
  date: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
  avgTime: number;
  bounceRate: number;
  channel: 'search_engine' | 'social_media' | 'email' | 'direct' | 'referral';
  contentType: 'news' | 'blog' | 'product' | 'ad';
}

// 筛选表单
const filterForm = reactive({
  dateRange: [] as [string, string] | [],
  channel: '',
  contentType: ''
});

// 统计信息
const stats = reactive({
  totalVisitors: 0,
  totalConversions: 0,
  conversionRate: 0,
  averageTime: 0
});

// 表格数据
const tableData = ref<AnalysisData[]>([]);
const loading = ref(false);

// 分页信息
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
});

// 图表引用
const trendChartRef = ref<HTMLDivElement>();
const channelChartRef = ref<HTMLDivElement>();
const contentTypeChartRef = ref<HTMLDivElement>();
const deviceChartRef = ref<HTMLDivElement>();

// 图表实例
let trendChart: echarts.ECharts | null = null;
let channelChart: echarts.ECharts | null = null;
let contentTypeChart: echarts.ECharts | null = null;
let deviceChart: echarts.ECharts | null = null;

// 加载分析数据
const loadData = () => {
  loading.value = true;
  
  // 模拟异步加载数据
  setTimeout(() => {
    // 模拟数据
    const mockData: AnalysisData[] = [
      {
        date: '2024-01-01',
        visitors: 1250,
        conversions: 45,
        conversionRate: 3.6,
        avgTime: 125,
        bounceRate: 42,
        channel: 'search_engine',
        contentType: 'news'
      },
      {
        date: '2024-01-02',
        visitors: 1320,
        conversions: 52,
        conversionRate: 3.94,
        avgTime: 138,
        bounceRate: 38,
        channel: 'social_media',
        contentType: 'blog'
      },
      {
        date: '2024-01-03',
        visitors: 1180,
        conversions: 38,
        conversionRate: 3.22,
        avgTime: 110,
        bounceRate: 45,
        channel: 'email',
        contentType: 'product'
      },
      {
        date: '2024-01-04',
        visitors: 1450,
        conversions: 62,
        conversionRate: 4.28,
        avgTime: 156,
        bounceRate: 35,
        channel: 'referral',
        contentType: 'ad'
      },
      {
        date: '2024-01-05',
        visitors: 1680,
        conversions: 75,
        conversionRate: 4.46,
        avgTime: 168,
        bounceRate: 32,
        channel: 'search_engine',
        contentType: 'news'
      },
      {
        date: '2024-01-06',
        visitors: 1520,
        conversions: 58,
        conversionRate: 3.82,
        avgTime: 142,
        bounceRate: 37,
        channel: 'social_media',
        contentType: 'blog'
      },
      {
        date: '2024-01-07',
        visitors: 1750,
        conversions: 82,
        conversionRate: 4.69,
        avgTime: 175,
        bounceRate: 30,
        channel: 'direct',
        contentType: 'product'
      },
      {
        date: '2024-01-08',
        visitors: 1420,
        conversions: 55,
        conversionRate: 3.87,
        avgTime: 135,
        bounceRate: 39,
        channel: 'email',
        contentType: 'ad'
      },
      {
        date: '2024-01-09',
        visitors: 1580,
        conversions: 68,
        conversionRate: 4.30,
        avgTime: 152,
        bounceRate: 34,
        channel: 'search_engine',
        contentType: 'news'
      },
      {
        date: '2024-01-10',
        visitors: 1650,
        conversions: 72,
        conversionRate: 4.36,
        avgTime: 160,
        bounceRate: 33,
        channel: 'social_media',
        contentType: 'blog'
      }
    ];
    
    // 应用筛选条件
    let filteredData = [...mockData];
    
    // 时间范围筛选
    if (filterForm.dateRange && filterForm.dateRange.length === 2) {
      filteredData = filteredData.filter(item => {
        return item.date >= filterForm.dateRange[0] && item.date <= filterForm.dateRange[1];
      });
    }
    
    // 渠道筛选
    if (filterForm.channel) {
      filteredData = filteredData.filter(item => item.channel === filterForm.channel);
    }
    
    // 内容类型筛选
    if (filterForm.contentType) {
      filteredData = filteredData.filter(item => item.contentType === filterForm.contentType);
    }
    
    // 计算统计数据
    stats.totalVisitors = filteredData.reduce((sum, item) => sum + item.visitors, 0);
    stats.totalConversions = filteredData.reduce((sum, item) => sum + item.conversions, 0);
    stats.conversionRate = stats.totalVisitors > 0 
      ? parseFloat(((stats.totalConversions / stats.totalVisitors) * 100).toFixed(2)) 
      : 0;
    stats.averageTime = filteredData.length > 0 
      ? Math.round(filteredData.reduce((sum, item) => sum + item.avgTime, 0) / filteredData.length) 
      : 0;
    
    // 计算总数和当前页数据
    pagination.total = filteredData.length;
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    tableData.value = filteredData.slice(start, end);
    
    // 更新图表
    updateCharts(mockData);
    
    loading.value = false;
  }, 500);
};

// 更新图表
const updateCharts = (data: AnalysisData[]) => {
  nextTick(() => {
    // 趋势图
    if (trendChartRef.value) {
      if (!trendChart) {
        trendChart = echarts.init(trendChartRef.value);
      }
      
      const dates = data.map(item => item.date);
      const visitors = data.map(item => item.visitors);
      const conversions = data.map(item => item.conversions);
      const conversionRates = data.map(item => item.conversionRate);
      
      const trendOption = {
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
          data: ['访客数', '转化数', '转化率']
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
            type: 'value',
            name: '人数',
            position: 'left'
          },
          {
            type: 'value',
            name: '转化率(%)',
            position: 'right',
            min: 0,
            max: 10
          }
        ],
        series: [
          {
            name: '访客数',
            type: 'line',
            stack: '总量',
            areaStyle: {},
            emphasis: {
              focus: 'series'
            },
            data: visitors
          },
          {
            name: '转化数',
            type: 'line',
            stack: '总量',
            areaStyle: {},
            emphasis: {
              focus: 'series'
            },
            data: conversions
          },
          {
            name: '转化率',
            type: 'line',
            yAxisIndex: 1,
            emphasis: {
              focus: 'series'
            },
            data: conversionRates
          }
        ]
      };
      
      trendChart.setOption(trendOption);
    }
    
    // 渠道分布图
    if (channelChartRef.value) {
      if (!channelChart) {
        channelChart = echarts.init(channelChartRef.value);
      }
      
      // 统计各渠道数据
      const channelData = [
        { name: '搜索引擎', value: data.filter(d => d.channel === 'search_engine').length },
        { name: '社交媒体', value: data.filter(d => d.channel === 'social_media').length },
        { name: '电子邮件', value: data.filter(d => d.channel === 'email').length },
        { name: '直接访问', value: data.filter(d => d.channel === 'direct').length },
        { name: '推荐链接', value: data.filter(d => d.channel === 'referral').length }
      ].filter(item => item.value > 0);
      
      const channelOption = {
        tooltip: {
          trigger: 'item'
        },
        legend: {
          orient: 'vertical',
          left: 'left'
        },
        series: [
          {
            name: '渠道分布',
            type: 'pie',
            radius: '80%',
            data: channelData,
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
      
      channelChart.setOption(channelOption);
    }
    
    // 内容类型转化率图
    if (contentTypeChartRef.value) {
      if (!contentTypeChart) {
        contentTypeChart = echarts.init(contentTypeChartRef.value);
      }
      
      // 按内容类型统计转化率
      const contentTypes = ['news', 'blog', 'product', 'ad'];
      const conversionRatesByType = contentTypes.map(type => {
        const filtered = data.filter(d => d.contentType === type);
        if (filtered.length === 0) return 0;
        return parseFloat((filtered.reduce((sum, item) => sum + item.conversionRate, 0) / filtered.length).toFixed(2));
      });
      
      const contentTypeOption = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: ['新闻', '博客', '产品', '广告']
        },
        yAxis: {
          type: 'value',
          name: '转化率(%)'
        },
        series: [
          {
            name: '转化率',
            type: 'bar',
            data: conversionRatesByType,
            itemStyle: {
              color: '#67C23A'
            }
          }
        ]
      };
      
      contentTypeChart.setOption(contentTypeOption);
    }
    
    // 设备类型分布图
    if (deviceChartRef.value) {
      if (!deviceChart) {
        deviceChart = echarts.init(deviceChartRef.value);
      }
      
      // 模拟设备类型数据
      const deviceData = [
        { name: '桌面端', value: 45 },
        { name: '移动端', value: 50 },
        { name: '平板端', value: 5 }
      ];
      
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
            data: deviceData,
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

// 渠道标签样式
const getChannelTag = (channel: string) => {
  switch (channel) {
    case 'search_engine': return 'primary';
    case 'social_media': return 'success';
    case 'email': return 'warning';
    case 'direct': return 'info';
    case 'referral': return 'danger';
    default: return 'info';
  }
};

// 渠道标签显示文本
const getChannelLabel = (channel: string) => {
  switch (channel) {
    case 'search_engine': return '搜索引擎';
    case 'social_media': return '社交媒体';
    case 'email': return '电子邮件';
    case 'direct': return '直接访问';
    case 'referral': return '推荐链接';
    default: return channel;
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

// 刷新数据
const handleRefresh = () => {
  loadData();
  ElMessage.success('数据已刷新');
};

// 导出报表
const handleExport = () => {
  ElMessage.success('报表导出功能开发中...');
};

// 筛选
const handleFilter = () => {
  pagination.currentPage = 1;
  loadData();
};

// 重置筛选
const handleResetFilter = () => {
  filterForm.dateRange = [];
  filterForm.channel = '';
  filterForm.contentType = '';
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

// 窗口大小改变时重新调整图表
const resizeCharts = () => {
  if (trendChart) trendChart.resize();
  if (channelChart) channelChart.resize();
  if (contentTypeChart) contentTypeChart.resize();
  if (deviceChart) deviceChart.resize();
};

// 监听窗口大小变化
window.addEventListener('resize', resizeCharts);

// 初始化
onMounted(() => {
  loadData();
});

// 组件销毁时清理图表
onUnmounted(() => {
  if (trendChart) trendChart.dispose();
  if (channelChart) channelChart.dispose();
  if (contentTypeChart) contentTypeChart.dispose();
  if (deviceChart) deviceChart.dispose();
  window.removeEventListener('resize', resizeCharts);
});
</script>

<style scoped>
.analysis-container {
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

.data-table-card {
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
</style>