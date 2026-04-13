<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <!-- 数据概览 -->
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-header">
            <span class="stat-title">已采集资讯</span>
            <el-icon class="stat-icon" color="#409EFF"><Document /></el-icon>
          </div>
          <div class="stat-value">12,580</div>
          <div class="stat-footer">
            <span class="stat-trend up">↑ 12.5%</span>
            <span class="stat-label">较昨日</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-header">
            <span class="stat-title">AI 生成内容</span>
            <el-icon class="stat-icon" color="#67C23A"><Cpu /></el-icon>
          </div>
          <div class="stat-value">3,248</div>
          <div class="stat-footer">
            <span class="stat-trend up">↑ 8.2%</span>
            <span class="stat-label">较昨日</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-header">
            <span class="stat-title">已发布内容</span>
            <el-icon class="stat-icon" color="#E6A23C"><Grid /></el-icon>
          </div>
          <div class="stat-value">1,856</div>
          <div class="stat-footer">
            <span class="stat-trend up">↑ 15.3%</span>
            <span class="stat-label">较昨日</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-header">
            <span class="stat-title">总点击量</span>
            <el-icon class="stat-icon" color="#F56C6C"><DataLine /></el-icon>
          </div>
          <div class="stat-value">258,432</div>
          <div class="stat-footer">
            <span class="stat-trend up">↑ 22.1%</span>
            <span class="stat-label">较昨日</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>采集趋势</span>
            </div>
          </template>
          <div ref="collectChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>发布渠道分布</span>
            </div>
          </template>
          <div ref="publishChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近任务 -->
    <el-card style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>最近任务</span>
          <el-button type="primary" size="small">查看全部</el-button>
        </div>
      </template>
      <el-table :data="recentTasks" style="width: 100%">
        <el-table-column prop="id" label="任务 ID" width="80" />
        <el-table-column prop="type" label="类型" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="progress" label="进度" width="150">
          <template #default="{ row }">
            <el-progress :percentage="row.progress" :status="row.progress === 100 ? 'success' : undefined" />
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Document, Cpu, Grid, DataLine } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { getStats as getAiStats } from '@/api/aiProcessor'
import { getPublishStats } from '@/api/publisher'
import { getOverallStats as getTrackerStats } from '@/api/tracker'

// 统计数据
const stats = ref({
  collectedNews: 0,
  generatedContent: 0,
  publishedContent: 0,
  totalClicks: 0
})

// 图表实例
let collectChart: echarts.ECharts | null = null
let publishChart: echarts.ECharts | null = null
const collectChartRef = ref<HTMLElement>()
const publishChartRef = ref<HTMLElement>()

// 最近任务
const recentTasks = ref([
  { id: 1001, type: '资讯采集', status: '完成', progress: 100, createTime: '2026-04-10 10:30:00' },
  { id: 1002, type: 'AI 生成', status: '进行中', progress: 75, createTime: '2026-04-10 11:00:00' },
  { id: 1003, type: '内容分发', status: '等待中', progress: 0, createTime: '2026-04-10 11:30:00' },
  { id: 1004, type: '数据追踪', status: '完成', progress: 100, createTime: '2026-04-10 12:00:00' }
])

// 状态类型映射
const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    '完成': 'success',
    '进行中': 'primary',
    '等待中': 'warning',
    '失败': 'danger'
  }
  return map[status] || 'info'
}

// 初始化采集趋势图表
const initCollectChart = () => {
  if (!collectChartRef.value) return
  
  collectChart = echarts.init(collectChartRef.value)
  collectChart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    },
    yAxis: { type: 'value' },
    series: [{
      data: [820, 932, 901, 934, 1290, 1330, 1320],
      type: 'line',
      smooth: true,
      itemStyle: { color: '#409EFF' }
    }]
  })
}

// 初始化发布渠道图表
const initPublishChart = () => {
  if (!publishChartRef.value) return
  
  publishChart = echarts.init(publishChartRef.value)
  publishChart.setOption({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: '50%',
      data: [
        { value: 1048, name: '抖音' },
        { value: 735, name: '小红书' },
        { value: 580, name: '微信' },
        { value: 484, name: '微博' }
      ],
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  })
}

// 获取统计信息
const loadStats = async () => {
  try {
    // 这里应该调用实际的API获取统计数据
    // 由于还没有具体的API，暂时使用模拟数据
    const mockStats = {
      collectedNews: 12580,
      generatedContent: 3248,
      publishedContent: 1856,
      totalClicks: 258432
    }
    
    stats.value = mockStats
    
    // TODO: 实际API调用示例（待后端API完成后启用）
    /*
    const aiStats = await getAiStats()
    const publishStats = await getPublishStats()
    const trackerStats = await getTrackerStats()
    
    stats.value = {
      collectedNews: aiStats.data?.collectedNews || 0,
      generatedContent: aiStats.data?.generatedContent || 0,
      publishedContent: publishStats.data?.publishedContent || 0,
      totalClicks: trackerStats.data?.totalClicks || 0
    }
    */
  } catch (error) {
    console.error('Failed to load dashboard stats:', error)
  }
}

// 页面挂载时初始化
onMounted(async () => {
  await loadStats()
  initCollectChart()
  initPublishChart()
  
  // 监听窗口大小变化，调整图表大小
  window.addEventListener('resize', () => {
    collectChart?.resize()
    publishChart?.resize()
  })
})

// 页面卸载时清理资源
onUnmounted(() => {
  collectChart?.dispose()
  publishChart?.dispose()
  
  // 移除事件监听
  window.removeEventListener('resize', () => {})
})
</script>

<style lang="scss" scoped>
.dashboard {
  .stat-card {
    .stat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;

      .stat-title {
        color: $text-color-secondary;
        font-size: 14px;
      }

      .stat-icon {
        font-size: 24px;
      }
    }

    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: $text-color-primary;
      margin-bottom: 10px;
    }

    .stat-footer {
      display: flex;
      align-items: center;
      gap: 10px;

      .stat-trend {
        font-size: 12px;

        &.up {
          color: $success-color;
        }

        &.down {
          color: $danger-color;
        }
      }

      .stat-label {
        color: $text-color-secondary;
        font-size: 12px;
      }
    }
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}
</style>
