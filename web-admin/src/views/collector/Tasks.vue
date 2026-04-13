<template>
  <!-- 采集任务列表页面 -->
  <div class="tasks-container">
    <el-card class="card-container">
      <template #header>
        <div class="card-header">
          <span>采集任务列表</span>
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
            <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
              <el-option label="运行中" value="running" />
              <el-option label="暂停" value="paused" />
              <el-option label="已完成" value="completed" />
              <el-option label="失败" value="failed" />
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
        <el-table-column prop="name" label="任务名称" width="200" show-overflow-tooltip />
        <el-table-column prop="sourceName" label="数据源" width="150" />
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
        <el-table-column prop="progress" label="进度" width="120">
          <template #default="{ row }">
            <el-progress 
              :percentage="row.progress" 
              :color="getProgressColor(row.status)"
              :status="row.status === 'completed' ? 'success' : ''"
            />
          </template>
        </el-table-column>
        <el-table-column prop="totalItems" label="总数" width="80" />
        <el-table-column prop="collectedItems" label="已采集" width="100" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column prop="updatedAt" label="更新时间" width="180" />
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleView(row)">查看</el-button>
            <el-button 
              size="small" 
              :type="row.status === 'running' ? 'warning' : 'primary'"
              @click="handleStartPause(row)"
            >
              {{ row.status === 'running' ? '暂停' : '启动' }}
            </el-button>
            <el-button size="small" type="info" @click="handleRefresh(row)">刷新</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
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
      width="700px"
      @close="handleDialogClose"
    >
      <el-form 
        ref="formRef" 
        :model="formData" 
        :rules="formRules" 
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="任务名称" prop="name">
              <el-input 
                v-model="formData.name" 
                placeholder="请输入任务名称" 
                maxlength="100"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="数据源" prop="sourceId">
              <el-select 
                v-model="formData.sourceId" 
                placeholder="请选择数据源" 
                style="width: 100%"
              >
                <el-option 
                  v-for="source in dataSourceList" 
                  :key="source.id" 
                  :label="source.name" 
                  :value="source.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
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
                <el-option label="运行中" value="running" />
                <el-option label="暂停" value="paused" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="采集规则">
          <el-input 
            v-model="formData.rule" 
            placeholder="请输入采集规则(JSON格式)" 
            type="textarea"
            :rows="4"
          />
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开始时间">
              <el-date-picker
                v-model="formData.startTime"
                type="datetime"
                placeholder="选择开始时间"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束时间">
              <el-date-picker
                v-model="formData.endTime"
                type="datetime"
                placeholder="选择结束时间"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="备注">
          <el-input 
            v-model="formData.remarks" 
            placeholder="请输入备注信息" 
            type="textarea"
            :rows="3"
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
      width="800px"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="任务ID">{{ detailData.id }}</el-descriptions-item>
        <el-descriptions-item label="任务名称">{{ detailData.name }}</el-descriptions-item>
        <el-descriptions-item label="数据源">{{ detailData.sourceName }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusTag(detailData.status)">
            {{ getStatusLabel(detailData.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="优先级">
          <el-tag :type="getPriorityTag(detailData.priority)">
            {{ getPriorityLabel(detailData.priority) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="进度">
          <el-progress 
            :percentage="detailData.progress" 
            :color="getProgressColor(detailData.status)"
            :status="detailData.status === 'completed' ? 'success' : ''"
          />
        </el-descriptions-item>
        <el-descriptions-item label="总数">{{ detailData.totalItems }}</el-descriptions-item>
        <el-descriptions-item label="已采集">{{ detailData.collectedItems }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ detailData.createdAt }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ detailData.updatedAt }}</el-descriptions-item>
        <el-descriptions-item label="采集规则" :span="2">
          <pre>{{ detailData.rule }}</pre>
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">
          {{ detailData.remarks || '无' }}
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailDialog.visible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getTasks, addTask, updateTask, deleteTask, toggleTaskStatus, getTaskDetail, getSources } from '@/api/collector';

// 采集任务类型定义
interface CollectionTask {
  id: number;
  name: string;
  sourceId: number;
  sourceName: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  priority: 'high' | 'medium' | 'low';
  progress: number;
  totalItems: number;
  collectedItems: number;
  rule: string;
  startTime?: string;
  endTime?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

// 搜索表单
const searchForm = reactive({
  name: '',
  status: '',
  priority: '',
  page: 1,
  page_size: 10
});

// 表格数据
const tableData = ref<CollectionTask[]>([]);
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

// 详情数据
const detailData = ref<CollectionTask>({
  id: 0,
  name: '',
  sourceId: 0,
  sourceName: '',
  status: 'running',
  priority: 'medium',
  progress: 0,
  totalItems: 0,
  collectedItems: 0,
  rule: '',
  createdAt: '',
  updatedAt: ''
});

// 表单数据
const formData = reactive<Partial<CollectionTask>>({
  id: undefined,
  name: '',
  sourceId: undefined,
  status: 'paused',
  priority: 'medium',
  progress: 0,
  totalItems: 0,
  collectedItems: 0,
  rule: '{\n  "selector": ".article",\n  "fields": {\n    "title": ".title",\n    "content": ".content"\n  }\n}',
  startTime: undefined,
  endTime: undefined,
  remarks: ''
});

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入任务名称', trigger: 'blur' },
    { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' }
  ],
  sourceId: [
    { required: true, message: '请选择数据源', trigger: 'change' }
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

// 数据源列表
const dataSourceList = ref<{ id: number; name: string }[]>([]);

// 获取数据源列表
const loadDataSourceList = async () => {
  try {
    const response = await getSources();
    dataSourceList.value = response.data?.items || response.data || [];
  } catch (error) {
    console.error('Failed to load data sources:', error);
    ElMessage.error('获取数据源列表失败');
  }
};

// 获取采集任务列表
const loadData = async () => {
  loading.value = true;
  
  try {
    // 准备查询参数
    const params = {
      page: pagination.currentPage,
      page_size: pagination.pageSize,
      ...(searchForm.name && { name: searchForm.name }),
      ...(searchForm.status && { status: searchForm.status }),
      ...(searchForm.priority && { priority: searchForm.priority })
    };
    
    // 调用API获取数据
    const response = await getTasks(params);
    
    // 假设API返回格式为 { code: 200, data: { items: [...], total: 100 } }
    // 如果实际API格式不同，这里需要相应调整
    tableData.value = response.data?.items || response.data || [];
    pagination.total = response.data?.total || response.total || tableData.value.length;
  } catch (error) {
    console.error('Failed to load collection tasks:', error);
    ElMessage.error('获取采集任务列表失败');
  } finally {
    loading.value = false;
  }
};

// 状态标签样式
const getStatusTag = (status: string) => {
  switch (status) {
    case 'running': return 'success';
    case 'paused': return 'info';
    case 'completed': return 'warning';
    case 'failed': return 'danger';
    default: return 'info';
  }
};

// 状态标签显示文本
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'running': return '运行中';
    case 'paused': return '暂停';
    case 'completed': return '已完成';
    case 'failed': return '失败';
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

// 进度条颜色
const getProgressColor = (status: string) => {
  switch (status) {
    case 'completed': return '#67c23a';
    case 'failed': return '#f56c6c';
    case 'running': return '#409eff';
    default: return '#e6a23c';
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
  dialog.title = '新建采集任务';
  dialog.visible = true;
  
  // 重置表单
  Object.assign(formData, {
    id: undefined,
    name: '',
    sourceId: undefined,
    status: 'paused',
    priority: 'medium',
    progress: 0,
    totalItems: 0,
    collectedItems: 0,
    rule: '{\n  "selector": ".article",\n  "fields": {\n    "title": ".title",\n    "content": ".content"\n  }\n}',
    startTime: undefined,
    endTime: undefined,
    remarks: ''
  });
};

// 打开编辑对话框
const handleEdit = (row: CollectionTask) => {
  dialog.type = 'edit';
  dialog.title = '编辑采集任务';
  dialog.visible = true;
  
  // 填充表单数据
  Object.assign(formData, { ...row });
};

// 查看任务详情
const handleView = (row: CollectionTask) => {
  detailData.value = { ...row };
  detailDialog.visible = true;
};

// 启动/暂停任务
const handleStartPause = async (row: CollectionTask) => {
  try {
    await ElMessageBox.confirm(
      `确定要${row.status === 'running' ? '暂停' : '启动'}此采集任务吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 调用API更改任务状态
    const newStatus = row.status === 'running' ? 'paused' : 'running';
    await toggleTaskStatus(row.id, newStatus);
    
    // 更新本地数据
    row.status = newStatus;
    row.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    ElMessage.success(`${row.status === 'running' ? '启动' : '暂停'}成功`);
  } catch (error) {
    console.error('Operation cancelled:', error);
    if (error !== 'cancel') {
      ElMessage.error('操作失败');
    }
  }
};

// 刷新任务
const handleRefresh = async (row: CollectionTask) => {
  try {
    // 获取任务详情以刷新数据
    const response = await getTaskDetail(row.id);
    const updatedTask = response.data;
    
    // 更新本地数据
    const index = tableData.value.findIndex(item => item.id === row.id);
    if (index > -1) {
      Object.assign(tableData.value[index], updatedTask);
    }
    
    ElMessage.success(`已刷新任务: ${row.name}`);
  } catch (error) {
    console.error('Failed to refresh task:', error);
    ElMessage.error('刷新任务失败');
  }
};

// 删除任务
const handleDelete = async (row: CollectionTask) => {
  try {
    await ElMessageBox.confirm(
      '此操作将永久删除该采集任务, 是否继续?',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 调用API删除任务
    await deleteTask(row.id);
    
    // 从本地数据中移除
    const index = tableData.value.findIndex(item => item.id === row.id);
    if (index > -1) {
      tableData.value.splice(index, 1);
      pagination.total--;
      ElMessage.success('删除成功');
    }
  } catch (error) {
    console.error('Delete cancelled:', error);
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
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
    
    if (dialog.type === 'create') {
      // 添加新任务
      const response = await addTask({
        name: formData.name!,
        sourceId: formData.sourceId!,
        priority: formData.priority!,
        status: formData.status!,
        rule: formData.rule,
        startTime: formData.startTime,
        endTime: formData.endTime,
        remarks: formData.remarks
      });
      
      ElMessage.success('添加成功');
    } else {
      // 更新现有任务
      if (formData.id) {
        await updateTask(formData.id, {
          name: formData.name,
          sourceId: formData.sourceId,
          priority: formData.priority,
          status: formData.status,
          rule: formData.rule,
          startTime: formData.startTime,
          endTime: formData.endTime,
          remarks: formData.remarks
        });
        
        ElMessage.success('更新成功');
      }
    }
    
    dialog.visible = false;
    loadData(); // 刷新数据
  } catch (error) {
    console.error('Operation failed:', error);
    if (error !== 'cancel') {
      ElMessage.error(dialog.type === 'create' ? '添加失败' : '更新失败');
    }
  }
};

// 初始化
onMounted(async () => {
  await loadDataSourceList();
  await loadData();
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

:deep(.el-descriptions__content) {
  word-break: break-all;
}
</style>