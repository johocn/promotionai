<template>
  <!-- 内容生成页面 -->
  <div class="generate-container">
    <el-card class="card-container">
      <template #header>
        <div class="card-header">
          <span>内容生成</span>
          <el-button type="primary" @click="handleGenerate">生成内容</el-button>
        </div>
      </template>

      <el-row :gutter="20">
        <el-col :span="16">
          <el-card class="input-card">
            <template #header>
              <div class="input-header">
                <span>输入参数</span>
              </div>
            </template>
            
            <el-form :model="form" label-width="120px">
              <el-form-item label="主题">
                <el-input 
                  v-model="form.topic" 
                  placeholder="请输入内容主题" 
                  maxlength="100"
                  show-word-limit
                />
              </el-form-item>
              
              <el-form-item label="关键词">
                <el-input 
                  v-model="form.keywords" 
                  placeholder="请输入关键词，用逗号分隔" 
                  type="textarea"
                  :rows="3"
                />
              </el-form-item>
              
              <el-form-item label="内容类型">
                <el-radio-group v-model="form.contentType">
                  <el-radio label="news">新闻资讯</el-radio>
                  <el-radio label="blog">博客文章</el-radio>
                  <el-radio label="product">产品介绍</el-radio>
                  <el-radio label="ad">广告文案</el-radio>
                </el-radio-group>
              </el-form-item>
              
              <el-form-item label="语言风格">
                <el-radio-group v-model="form.languageStyle">
                  <el-radio label="formal">正式</el-radio>
                  <el-radio label="casual">休闲</el-radio>
                  <el-radio label="humorous">幽默</el-radio>
                  <el-radio label="professional">专业</el-radio>
                </el-radio-group>
              </el-form-item>
              
              <el-form-item label="目标受众">
                <el-select v-model="form.audience" placeholder="请选择目标受众" style="width: 100%">
                  <el-option label="普通大众" value="general" />
                  <el-option label="专业人士" value="professional" />
                  <el-option label="学生群体" value="student" />
                  <el-option label="商业人士" value="business" />
                  <el-option label="技术开发者" value="developer" />
                </el-select>
              </el-form-item>
              
              <el-form-item label="内容长度">
                <el-slider 
                  v-model="form.length" 
                  :min="100" 
                  :max="2000" 
                  :step="100"
                  show-input
                  input-size="small"
                />
                <div class="length-info">约 {{ form.length }} 字符</div>
              </el-form-item>
              
              <el-form-item label="附加要求">
                <el-input 
                  v-model="form.requirements" 
                  placeholder="请输入附加要求" 
                  type="textarea"
                  :rows="4"
                  maxlength="500"
                  show-word-limit
                />
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>
        
        <el-col :span="8">
          <el-card class="history-card">
            <template #header>
              <div class="history-header">
                <span>生成历史</span>
                <el-button size="small" @click="loadHistory">刷新</el-button>
              </div>
            </template>
            
            <div class="history-list">
              <div 
                v-for="item in historyList" 
                :key="item.id" 
                class="history-item"
                :class="{ active: item.id === currentResult?.id }"
                @click="selectHistoryItem(item)"
              >
                <div class="history-title">{{ item.topic }}</div>
                <div class="history-time">{{ item.createdAt }}</div>
                <div class="history-status">
                  <el-tag 
                    :type="item.status === 'completed' ? 'success' : item.status === 'failed' ? 'danger' : 'warning'"
                    size="small"
                  >
                    {{ item.status === 'completed' ? '完成' : item.status === 'failed' ? '失败' : '进行中' }}
                  </el-tag>
                </div>
              </div>
            </div>
            
            <div class="history-actions">
              <el-button type="danger" size="small" @click="clearHistory">清空历史</el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
    
    <!-- 生成结果对话框 -->
    <el-dialog 
      v-model="resultDialog.visible" 
      title="生成结果" 
      width="80%"
      top="5vh"
    >
      <div v-if="currentResult" class="result-content">
        <div class="result-header">
          <h3>{{ currentResult.topic }}</h3>
          <div class="result-meta">
            <el-tag type="info" style="margin-right: 10px;">{{ currentResult.contentType }}</el-tag>
            <el-tag type="warning" style="margin-right: 10px;">{{ currentResult.languageStyle }}</el-tag>
            <el-tag :type="currentResult.status === 'completed' ? 'success' : currentResult.status === 'failed' ? 'danger' : 'warning'">
              {{ currentResult.status === 'completed' ? '完成' : currentResult.status === 'failed' ? '失败' : '进行中' }}
            </el-tag>
          </div>
        </div>
        
        <div class="result-body">
          <div class="result-section">
            <h4>生成内容</h4>
            <div class="content-display">
              <div v-if="currentResult.status === 'processing'" class="loading-content">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>AI 正在生成内容中，请稍候...</span>
              </div>
              <div v-else-if="currentResult.status === 'failed'" class="error-content">
                <el-icon><Warning /></el-icon>
                <span>内容生成失败: {{ currentResult.errorMessage || '未知错误' }}</span>
              </div>
              <div v-else class="generated-content" v-html="formatContent(currentResult.content)"></div>
            </div>
          </div>
          
          <div class="result-section">
            <h4>参数信息</h4>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="主题">{{ currentResult.topic }}</el-descriptions-item>
              <el-descriptions-item label="关键词">{{ currentResult.keywords || '无' }}</el-descriptions-item>
              <el-descriptions-item label="内容类型">{{ getContentTypeName(currentResult.contentType) }}</el-descriptions-item>
              <el-descriptions-item label="语言风格">{{ getLanguageStyleName(currentResult.languageStyle) }}</el-descriptions-item>
              <el-descriptions-item label="目标受众">{{ getAudienceName(currentResult.audience) }}</el-descriptions-item>
              <el-descriptions-item label="内容长度">{{ currentResult.length }} 字符</el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ currentResult.createdAt }}</el-descriptions-item>
              <el-descriptions-item label="完成时间">{{ currentResult.completedAt || '进行中' }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="resultDialog.visible = false">关闭</el-button>
          <el-button type="primary" @click="handleApprove">批准</el-button>
          <el-button type="success" @click="handlePublish">发布</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Loading, Warning } from '@element-plus/icons-vue';
import { generateContent, getContentList } from '@/api/aiProcessor';

// 内容生成参数类型定义
interface GenerationParams {
  topic: string;
  keywords: string;
  contentType: 'news' | 'blog' | 'product' | 'ad';
  languageStyle: 'formal' | 'casual' | 'humorous' | 'professional';
  audience: 'general' | 'professional' | 'student' | 'business' | 'developer';
  length: number;
  requirements: string;
}

// 生成结果类型定义
interface GenerationResult {
  id: number;
  topic: string;
  keywords: string;
  contentType: 'news' | 'blog' | 'product' | 'ad';
  languageStyle: 'formal' | 'casual' | 'humorous' | 'professional';
  audience: 'general' | 'professional' | 'student' | 'business' | 'developer';
  length: number;
  requirements: string;
  content: string;
  status: 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

// 表单数据
const form = reactive<GenerationParams>({
  topic: '',
  keywords: '',
  contentType: 'news',
  languageStyle: 'formal',
  audience: 'general',
  length: 500,
  requirements: ''
});

// 历史记录列表
const historyList = ref<GenerationResult[]>([]);
const currentResult = ref<GenerationResult | null>(null);

// 结果对话框
const resultDialog = reactive({
  visible: false
});

// 加载历史记录
const loadHistory = async () => {
  try {
    const response = await getContentList({ page_size: 20 });
    historyList.value = response.data?.items || response.data || [];
  } catch (error) {
    console.error('Failed to load generation history:', error);
    ElMessage.error('获取生成历史失败');
  }
};

// 选择历史记录项
const selectHistoryItem = (item: GenerationResult) => {
  currentResult.value = item;
  resultDialog.visible = true;
};

// 生成内容
const handleGenerate = async () => {
  if (!form.topic.trim()) {
    ElMessage.error('请输入内容主题');
    return;
  }

  try {
    // 显示加载状态
    const newTask: GenerationResult = {
      id: Date.now(), // 临时ID，实际API可能会返回真实ID
      ...form,
      content: '',
      status: 'processing',
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    // 添加到历史记录顶部
    historyList.value.unshift(newTask);
    currentResult.value = newTask;
    
    // 显示结果对话框
    resultDialog.visible = true;

    // 调用API生成内容
    const response = await generateContent({
      topic: form.topic,
      keywords: form.keywords,
      contentType: form.contentType,
      languageStyle: form.languageStyle,
      audience: form.audience,
      length: form.length,
      requirements: form.requirements
    });

    // 更新任务状态和内容
    if (currentResult.value) {
      currentResult.value.status = 'completed';
      currentResult.value.content = response.data?.content || '生成的内容';
      currentResult.value.completedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
    
    ElMessage.success('内容生成成功');
  } catch (error) {
    console.error('Failed to generate content:', error);
    if (currentResult.value) {
      currentResult.value.status = 'failed';
      currentResult.value.errorMessage = error.message || '生成失败';
      currentResult.value.completedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
    ElMessage.error('内容生成失败');
  }
};

// 格式化内容显示
const formatContent = (content: string) => {
  // 简单的格式化，实际项目中可以使用更复杂的富文本编辑器
  return content.replace(/\n/g, '<br>');
};

// 内容类型名称
const getContentTypeName = (type: string) => {
  switch (type) {
    case 'news': return '新闻资讯';
    case 'blog': return '博客文章';
    case 'product': return '产品介绍';
    case 'ad': return '广告文案';
    default: return type;
  }
};

// 语言风格名称
const getLanguageStyleName = (style: string) => {
  switch (style) {
    case 'formal': return '正式';
    case 'casual': return '休闲';
    case 'humorous': return '幽默';
    case 'professional': return '专业';
    default: return style;
  }
};

// 目标受众名称
const getAudienceName = (audience: string) => {
  switch (audience) {
    case 'general': return '普通大众';
    case 'professional': return '专业人士';
    case 'student': return '学生群体';
    case 'business': return '商业人士';
    case 'developer': return '技术开发者';
    default: return audience;
  }
};

// 批准内容
const handleApprove = async () => {
  if (!currentResult.value) {
    ElMessage.error('没有选择内容');
    return;
  }
  
  try {
    // 调用API批准内容
    // await approveContent(currentResult.value.id);
    ElMessage.success('内容已批准');
    resultDialog.visible = false;
  } catch (error) {
    console.error('Failed to approve content:', error);
    ElMessage.error('批准内容失败');
  }
};

// 发布内容
const handlePublish = async () => {
  if (!currentResult.value) {
    ElMessage.error('没有选择内容');
    return;
  }
  
  try {
    // 这里可以调用发布相关的API
    ElMessage.success('内容已发布');
    resultDialog.visible = false;
  } catch (error) {
    console.error('Failed to publish content:', error);
    ElMessage.error('发布内容失败');
  }
};

// 清空历史
const clearHistory = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有历史记录吗？此操作不可恢复。',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 实际项目中，可能需要调用API来清空历史记录
    historyList.value = [];
    ElMessage.success('历史记录已清空');
  } catch (error) {
    console.error('Clear history cancelled:', error);
  }
};

// 初始化
onMounted(async () => {
  await loadHistory();
});
</script>

<style scoped>
.generate-container {
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

.input-card, .history-card {
  height: 100%;
  min-height: 500px;
}

.input-header, .history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-list {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 15px;
}

.history-item {
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.history-item:hover {
  background-color: #f5f7fa;
  border-color: #dcdfe6;
}

.history-item.active {
  background-color: #ecf5ff;
  border-color: #b3d8ff;
}

.history-title {
  font-weight: bold;
  margin-bottom: 5px;
}

.history-time {
  font-size: 12px;
  color: #909399;
  margin-bottom: 5px;
}

.history-status {
  text-align: right;
}

.history-actions {
  text-align: center;
}

.length-info {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.result-content {
  max-height: 70vh;
  overflow-y: auto;
}

.result-header h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
  font-weight: bold;
}

.result-meta {
  margin-bottom: 20px;
}

.result-section {
  margin-bottom: 25px;
}

.result-section h4 {
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: bold;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

.content-display {
  min-height: 200px;
  padding: 15px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background-color: #fafafa;
}

.loading-content, .error-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #606266;
}

.generated-content {
  line-height: 1.6;
  color: #606266;
}

.dialog-footer {
  text-align: right;
}
</style>