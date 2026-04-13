<template>
  <!-- 数据源管理页面 -->
  <div class="sources-container">
    <el-card class="card-container">
      <template #header>
        <div class="card-header">
          <span>数据源管理</span>
          <el-button type="primary" @click="handleCreate">添加数据源</el-button>
        </div>
      </template>

      <!-- 搜索区域 -->
      <div class="search-box">
        <el-form :model="searchForm" inline>
          <el-form-item label="数据源名称">
            <el-input 
              v-model="searchForm.name" 
              placeholder="请输入数据源名称" 
              clearable
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="searchForm.type" placeholder="请选择类型" clearable>
              <el-option label="RSS" value="rss" />
              <el-option label="API" value="api" />
              <el-option label="网站爬虫" value="crawler" />
              <el-option label="社交媒体" value="social" />
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
        <el-table-column prop="name" label="数据源名称" width="200" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.type)">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="url" label="地址" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column prop="updatedAt" label="更新时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="primary" @click="handleTest(row)">测试</el-button>
            <el-button 
              size="small" 
              :type="row.status === 'active' ? 'warning' : 'success'"
              @click="handleChangeStatus(row)"
            >
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
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

    <!-- 数据源编辑对话框 -->
    <el-dialog 
      v-model="dialog.visible" 
      :title="dialog.title" 
      width="600px"
      @close="handleDialogClose"
    >
      <el-form 
        ref="formRef" 
        :model="formData" 
        :rules="formRules" 
        label-width="100px"
      >
        <el-form-item label="数据源名称" prop="name">
          <el-input 
            v-model="formData.name" 
            placeholder="请输入数据源名称" 
            maxlength="100"
          />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="formData.type" placeholder="请选择类型" style="width: 100%">
            <el-option label="RSS" value="rss" />
            <el-option label="API" value="api" />
            <el-option label="网站爬虫" value="crawler" />
            <el-option label="社交媒体" value="social" />
          </el-select>
        </el-form-item>
        <el-form-item label="地址" prop="url">
          <el-input 
            v-model="formData.url" 
            placeholder="请输入数据源地址" 
            type="textarea"
            :rows="3"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input 
            v-model="formData.description" 
            placeholder="请输入数据源描述" 
            type="textarea"
            :rows="3"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-switch
            v-model="formData.status"
            :active-value="'active'"
            :inactive-value="'inactive'"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>
        <el-form-item label="采集频率">
          <el-input-number 
            v-model="formData.frequency" 
            :min="1" 
            :max="1440"
            controls-position="right"
          />
          <span class="frequency-unit">分钟</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleDialogCancel">取消</el-button>
          <el-button type="primary" @click="handleDialogConfirm">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getSources, addSource, updateSource, deleteSource, updateSourceStatus } from '@/api/collector';

// 数据源类型定义
interface DataSource {
  id: number;
  name: string;
  type: 'rss' | 'api' | 'crawler' | 'social';
  url: string;
  description?: string;
  status: 'active' | 'inactive';
  frequency: number;
  createdAt: string;
  updatedAt: string;
}

// 搜索表单
const searchForm = reactive({
  name: '',
  type: '',
  page: 1,
  page_size: 10
});

// 表格数据
const tableData = ref<DataSource[]>([]);
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

// 表单数据
const formData = reactive<Partial<DataSource>>({
  id: undefined,
  name: '',
  type: 'rss',
  url: '',
  description: '',
  status: 'active',
  frequency: 30
});

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入数据源名称', trigger: 'blur' },
    { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择类型', trigger: 'change' }
  ],
  url: [
    { required: true, message: '请输入数据源地址', trigger: 'blur' }
  ]
};

// 表单引用
const formRef = ref();

// 获取数据源列表
const loadData = async () => {
  loading.value = true;
  
  try {
    // 准备查询参数
    const params = {
      page: pagination.currentPage,
      page_size: pagination.pageSize,
      ...(searchForm.name && { name: searchForm.name }),
      ...(searchForm.type && { type: searchForm.type })
    };
    
    // 调用API获取数据
    const response = await getSources(params);
    
    // 假设API返回格式为 { code: 200, data: { items: [...], total: 100 } }
    // 如果实际API格式不同，这里需要相应调整
    tableData.value = response.data?.items || response.data || [];
    pagination.total = response.data?.total || response.total || tableData.value.length;
  } catch (error) {
    console.error('Failed to load data sources:', error);
    ElMessage.error('获取数据源列表失败');
  } finally {
    loading.value = false;
  }
};

// 类型标签样式
const getTypeTag = (type: string) => {
  switch (type) {
    case 'rss': return 'info';
    case 'api': return 'success';
    case 'crawler': return 'warning';
    case 'social': return 'primary';
    default: return 'info';
  }
};

// 类型标签显示文本
const getTypeLabel = (type: string) => {
  switch (type) {
    case 'rss': return 'RSS';
    case 'api': return 'API';
    case 'crawler': return '爬虫';
    case 'social': return '社交';
    default: return type;
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
  searchForm.type = '';
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
  dialog.title = '添加数据源';
  dialog.visible = true;
  
  // 重置表单
  Object.assign(formData, {
    id: undefined,
    name: '',
    type: 'rss',
    url: '',
    description: '',
    status: 'active',
    frequency: 30
  });
};

// 打开编辑对话框
const handleEdit = (row: DataSource) => {
  dialog.type = 'edit';
  dialog.title = '编辑数据源';
  dialog.visible = true;
  
  // 填充表单数据
  Object.assign(formData, { ...row });
};

// 测试数据源
const handleTest = (row: DataSource) => {
  ElMessage.success(`正在测试数据源: ${row.name}`);
  // 模拟测试逻辑
  console.log('Testing source:', row);
};

// 改变状态
const handleChangeStatus = async (row: DataSource) => {
  try {
    await ElMessageBox.confirm(
      `确定要${row.status === 'active' ? '禁用' : '启用'}此数据源吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 调用API更改状态
    const newStatus = row.status === 'active' ? 'inactive' : 'active';
    await updateSourceStatus(row.id, newStatus);
    
    // 更新本地数据
    row.status = newStatus;
    row.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    ElMessage.success(`${row.status === 'active' ? '启用' : '禁用'}成功`);
  } catch (error) {
    console.error('Status change cancelled:', error);
    if (error !== 'cancel') {
      ElMessage.error('更改状态失败');
    }
  }
};

// 删除数据源
const handleDelete = async (row: DataSource) => {
  try {
    await ElMessageBox.confirm(
      '此操作将永久删除该数据源, 是否继续?',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 调用API删除数据源
    await deleteSource(row.id);
    
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
      // 添加新数据源
      const response = await addSource({
        name: formData.name!,
        url: formData.url!,
        type: formData.type!,
        description: formData.description,
        status: formData.status,
        frequency: formData.frequency
      });
      
      ElMessage.success('添加成功');
    } else {
      // 更新现有数据源
      if (formData.id) {
        await updateSource(formData.id, {
          name: formData.name,
          url: formData.url,
          type: formData.type,
          description: formData.description,
          status: formData.status,
          frequency: formData.frequency
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
onMounted(() => {
  loadData();
});
</script>

<style scoped>
.sources-container {
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

.frequency-unit {
  margin-left: 10px;
  color: #909399;
}
</style>