<template>
  <!-- 敏感词库页面 -->
  <div class="keywords-container">
    <el-card class="card-container">
      <template #header>
        <div class="card-header">
          <span>敏感词库</span>
          <el-button type="primary" @click="handleCreate">添加敏感词</el-button>
        </div>
      </template>

      <!-- 搜索区域 -->
      <div class="search-box">
        <el-form :model="searchForm" inline>
          <el-form-item label="敏感词">
            <el-input 
              v-model="searchForm.keyword" 
              placeholder="请输入敏感词" 
              clearable
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="searchForm.type" placeholder="请选择类型" clearable>
              <el-option label="政治敏感" value="political" />
              <el-option label="色情低俗" value="pornographic" />
              <el-option label="暴力恐怖" value="violent" />
              <el-option label="虚假信息" value="false_info" />
              <el-option label="侵犯隐私" value="privacy" />
              <el-option label="版权问题" value="copyright" />
              <el-option label="广告营销" value="advertising" />
              <el-option label="其他" value="other" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
              <el-option label="启用" value="active" />
              <el-option label="禁用" value="inactive" />
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
              <div class="stat-label">总词数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-item">
              <div class="stat-number" :style="{ color: '#67C23A' }">{{ stats.active }}</div>
              <div class="stat-label">启用数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-item">
              <div class="stat-number" :style="{ color: '#F56C6C' }">{{ stats.inactive }}</div>
              <div class="stat-label">禁用数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-item">
              <div class="stat-number" :style="{ color: '#409EFF' }">{{ stats.types }}</div>
              <div class="stat-label">类型数</div>
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
        <el-table-column prop="keyword" label="敏感词" width="150" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.type)">{{ getTypeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="level" label="级别" width="100">
          <template #default="{ row }">
            <el-tag :type="getLevelTag(row.level)">{{ getLevelLabel(row.level) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.status"
              :active-value="'active'"
              :inactive-value="'inactive'"
              @change="handleStatusChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="matchType" label="匹配方式" width="120">
          <template #default="{ row }">
            <el-tag :type="getMatchTypeTag(row.matchType)">{{ getMatchTypeLabel(row.matchType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column prop="updatedAt" label="更新时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleView(row)">查看</el-button>
            <el-button size="small" type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button 
              size="small" 
              :type="row.status === 'active' ? 'warning' : 'success'"
              @click="handleToggleStatus(row)"
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

    <!-- 敏感词编辑对话框 -->
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
        <el-form-item label="敏感词" prop="keyword">
          <el-input 
            v-model="formData.keyword" 
            placeholder="请输入敏感词" 
            maxlength="50"
          />
        </el-form-item>
        
        <el-form-item label="类型" prop="type">
          <el-select v-model="formData.type" placeholder="请选择类型" style="width: 100%">
            <el-option label="政治敏感" value="political" />
            <el-option label="色情低俗" value="pornographic" />
            <el-option label="暴力恐怖" value="violent" />
            <el-option label="虚假信息" value="false_info" />
            <el-option label="侵犯隐私" value="privacy" />
            <el-option label="版权问题" value="copyright" />
            <el-option label="广告营销" value="advertising" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="级别" prop="level">
              <el-select v-model="formData.level" placeholder="请选择级别" style="width: 100%">
                <el-option label="低" value="low" />
                <el-option label="中" value="medium" />
                <el-option label="高" value="high" />
                <el-option label="极高" value="critical" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="formData.status" placeholder="请选择状态" style="width: 100%">
                <el-option label="启用" value="active" />
                <el-option label="禁用" value="inactive" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="匹配方式" prop="matchType">
          <el-select v-model="formData.matchType" placeholder="请选择匹配方式" style="width: 100%">
            <el-option label="精确匹配" value="exact" />
            <el-option label="模糊匹配" value="fuzzy" />
            <el-option label="正则匹配" value="regex" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="描述">
          <el-input 
            v-model="formData.description" 
            type="textarea"
            :rows="3"
            placeholder="请输入敏感词描述"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item label="备注">
          <el-input 
            v-model="formData.remarks" 
            type="textarea"
            :rows="2"
            placeholder="请输入备注信息"
            maxlength="100"
            show-word-limit
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
    
    <!-- 敏感词详情对话框 -->
    <el-dialog 
      v-model="detailDialog.visible" 
      title="敏感词详情" 
      width="700px"
    >
      <div v-if="currentItem" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ currentItem.id }}</el-descriptions-item>
          <el-descriptions-item label="敏感词">{{ currentItem.keyword }}</el-descriptions-item>
          <el-descriptions-item label="类型">
            <el-tag :type="getTypeTag(currentItem.type)">{{ getTypeLabel(currentItem.type) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="级别">
            <el-tag :type="getLevelTag(currentItem.level)">{{ getLevelLabel(currentItem.level) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentItem.status === 'active' ? 'success' : 'info'">
              {{ currentItem.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="匹配方式">
            <el-tag :type="getMatchTypeTag(currentItem.matchType)">{{ getMatchTypeLabel(currentItem.matchType) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentItem.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ currentItem.updatedAt }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ currentItem.description || '无' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentItem.remarks || '无' }}</el-descriptions-item>
        </el-descriptions>
      </div>
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

// 敏感词类型定义
interface SensitiveKeyword {
  id: number;
  keyword: string;
  type: 'political' | 'pornographic' | 'violent' | 'false_info' | 'privacy' | 'copyright' | 'advertising' | 'other';
  level: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'inactive';
  matchType: 'exact' | 'fuzzy' | 'regex';
  description?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

// 搜索表单
const searchForm = reactive({
  keyword: '',
  type: '',
  status: ''
});

// 表格数据
const tableData = ref<SensitiveKeyword[]>([]);
const loading = ref(false);

// 统计信息
const stats = reactive({
  total: 0,
  active: 0,
  inactive: 0,
  types: 0
});

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

// 当前操作项目
const currentItem = ref<SensitiveKeyword | null>(null);

// 表单数据
const formData = reactive<Partial<SensitiveKeyword>>({
  id: undefined,
  keyword: '',
  type: 'political',
  level: 'medium',
  status: 'active',
  matchType: 'exact',
  description: '',
  remarks: ''
});

// 表单验证规则
const formRules = {
  keyword: [
    { required: true, message: '请输入敏感词', trigger: 'blur' },
    { min: 1, max: 50, message: '长度在 1 到 50 个字符', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择类型', trigger: 'change' }
  ],
  level: [
    { required: true, message: '请选择级别', trigger: 'change' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ],
  matchType: [
    { required: true, message: '请选择匹配方式', trigger: 'change' }
  ]
};

// 表单引用
const formRef = ref();

// 获取敏感词列表
const loadData = () => {
  loading.value = true;
  
  // 模拟异步加载数据
  setTimeout(() => {
    // 模拟数据
    const mockData: SensitiveKeyword[] = [
      {
        id: 1,
        keyword: '国家领导人',
        type: 'political',
        level: 'critical',
        status: 'active',
        matchType: 'fuzzy',
        description: '涉及国家领导人的敏感词汇',
        remarks: '需要特别注意',
        createdAt: '2024-01-01 10:00:00',
        updatedAt: '2024-01-01 10:00:00'
      },
      {
        id: 2,
        keyword: '色情',
        type: 'pornographic',
        level: 'high',
        status: 'active',
        matchType: 'fuzzy',
        description: '色情相关内容',
        remarks: '严格过滤',
        createdAt: '2024-01-01 10:05:00',
        updatedAt: '2024-01-01 10:05:00'
      },
      {
        id: 3,
        keyword: '暴力',
        type: 'violent',
        level: 'high',
        status: 'active',
        matchType: 'fuzzy',
        description: '暴力相关内容',
        remarks: '需要人工审核',
        createdAt: '2024-01-01 10:10:00',
        updatedAt: '2024-01-01 10:10:00'
      },
      {
        id: 4,
        keyword: '假新闻',
        type: 'false_info',
        level: 'medium',
        status: 'active',
        matchType: 'fuzzy',
        description: '虚假信息相关词汇',
        remarks: '需要核实',
        createdAt: '2024-01-01 10:15:00',
        updatedAt: '2024-01-01 10:15:00'
      },
      {
        id: 5,
        keyword: '隐私',
        type: 'privacy',
        level: 'medium',
        status: 'active',
        matchType: 'fuzzy',
        description: '涉及个人隐私信息',
        remarks: '保护用户隐私',
        createdAt: '2024-01-01 10:20:00',
        updatedAt: '2024-01-01 10:20:00'
      },
      {
        id: 6,
        keyword: '侵权',
        type: 'copyright',
        level: 'medium',
        status: 'active',
        matchType: 'fuzzy',
        description: '版权侵权相关词汇',
        remarks: '注意版权',
        createdAt: '2024-01-01 10:25:00',
        updatedAt: '2024-01-01 10:25:00'
      },
      {
        id: 7,
        keyword: '广告',
        type: 'advertising',
        level: 'low',
        status: 'active',
        matchType: 'fuzzy',
        description: '广告营销相关词汇',
        remarks: '适度过滤',
        createdAt: '2024-01-01 10:30:00',
        updatedAt: '2024-01-01 10:30:00'
      },
      {
        id: 8,
        keyword: '病毒',
        type: 'other',
        level: 'high',
        status: 'inactive',
        matchType: 'fuzzy',
        description: '恶意软件相关词汇',
        remarks: '已禁用',
        createdAt: '2024-01-01 10:35:00',
        updatedAt: '2024-01-01 11:00:00'
      },
      {
        id: 9,
        keyword: '赌博',
        type: 'other',
        level: 'critical',
        status: 'active',
        matchType: 'fuzzy',
        description: '赌博相关词汇',
        remarks: '严格禁止',
        createdAt: '2024-01-01 10:40:00',
        updatedAt: '2024-01-01 10:40:00'
      },
      {
        id: 10,
        keyword: '毒品',
        type: 'other',
        level: 'critical',
        status: 'active',
        matchType: 'fuzzy',
        description: '毒品相关词汇',
        remarks: '严格禁止',
        createdAt: '2024-01-01 10:45:00',
        updatedAt: '2024-01-01 10:45:00'
      },
      {
        id: 11,
        keyword: '枪支',
        type: 'violent',
        level: 'critical',
        status: 'active',
        matchType: 'fuzzy',
        description: '枪支武器相关词汇',
        remarks: '严格管制',
        createdAt: '2024-01-01 10:50:00',
        updatedAt: '2024-01-01 10:50:00'
      },
      {
        id: 12,
        keyword: '谣言',
        type: 'false_info',
        level: 'medium',
        status: 'active',
        matchType: 'fuzzy',
        description: '谣言传播相关词汇',
        remarks: '注意核实',
        createdAt: '2024-01-01 10:55:00',
        updatedAt: '2024-01-01 10:55:00'
      }
    ];
    
    // 应用搜索过滤
    let filteredData = mockData.filter(item => {
      let match = true;
      if (searchForm.keyword && !item.keyword.includes(searchForm.keyword)) {
        match = false;
      }
      if (searchForm.type && item.type !== searchForm.type) {
        match = false;
      }
      if (searchForm.status && item.status !== searchForm.status) {
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
    stats.active = mockData.filter(item => item.status === 'active').length;
    stats.inactive = mockData.filter(item => item.status === 'inactive').length;
    stats.types = new Set(mockData.map(item => item.type)).size;
    
    loading.value = false;
  }, 500);
};

// 类型标签样式
const getTypeTag = (type: string) => {
  switch (type) {
    case 'political': return 'danger';
    case 'pornographic': return 'warning';
    case 'violent': return 'danger';
    case 'false_info': return 'info';
    case 'privacy': return 'warning';
    case 'copyright': return 'info';
    case 'advertising': return 'primary';
    case 'other': return 'info';
    default: return 'info';
  }
};

// 类型标签显示文本
const getTypeLabel = (type: string) => {
  switch (type) {
    case 'political': return '政治敏感';
    case 'pornographic': return '色情低俗';
    case 'violent': return '暴力恐怖';
    case 'false_info': return '虚假信息';
    case 'privacy': return '侵犯隐私';
    case 'copyright': return '版权问题';
    case 'advertising': return '广告营销';
    case 'other': return '其他';
    default: return type;
  }
};

// 级别标签样式
const getLevelTag = (level: string) => {
  switch (level) {
    case 'low': return 'info';
    case 'medium': return 'warning';
    case 'high': return 'danger';
    case 'critical': return 'danger';
    default: return 'info';
  }
};

// 级别标签显示文本
const getLevelLabel = (level: string) => {
  switch (level) {
    case 'low': return '低';
    case 'medium': return '中';
    case 'high': return '高';
    case 'critical': return '极高';
    default: return level;
  }
};

// 匹配方式标签样式
const getMatchTypeTag = (type: string) => {
  switch (type) {
    case 'exact': return 'info';
    case 'fuzzy': return 'warning';
    case 'regex': return 'danger';
    default: return 'info';
  }
};

// 匹配方式标签显示文本
const getMatchTypeLabel = (type: string) => {
  switch (type) {
    case 'exact': return '精确匹配';
    case 'fuzzy': return '模糊匹配';
    case 'regex': return '正则匹配';
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
  searchForm.keyword = '';
  searchForm.type = '';
  searchForm.status = '';
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

// 状态改变
const handleStatusChange = (row: SensitiveKeyword) => {
  row.updatedAt = new Date().toLocaleString();
  ElMessage.success(`${row.status === 'active' ? '启用' : '禁用'}成功`);
};

// 切换状态
const handleToggleStatus = async (row: SensitiveKeyword) => {
  try {
    await ElMessageBox.confirm(
      `确定要${row.status === 'active' ? '禁用' : '启用'}此敏感词吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 切换状态
    row.status = row.status === 'active' ? 'inactive' : 'active';
    row.updatedAt = new Date().toLocaleString();
    
    ElMessage.success(`${row.status === 'active' ? '启用' : '禁用'}成功`);
  } catch (error) {
    console.error('Toggle status cancelled:', error);
    // 恢复之前的值
    row.status = row.status === 'active' ? 'inactive' : 'active';
  }
};

// 打开创建对话框
const handleCreate = () => {
  dialog.type = 'create';
  dialog.title = '添加敏感词';
  dialog.visible = true;
  
  // 重置表单
  Object.assign(formData, {
    id: undefined,
    keyword: '',
    type: 'political',
    level: 'medium',
    status: 'active',
    matchType: 'exact',
    description: '',
    remarks: ''
  });
};

// 打开编辑对话框
const handleEdit = (row: SensitiveKeyword) => {
  dialog.type = 'edit';
  dialog.title = '编辑敏感词';
  dialog.visible = true;
  
  // 填充表单数据
  Object.assign(formData, { ...row });
};

// 查看敏感词详情
const handleView = (row: SensitiveKeyword) => {
  currentItem.value = { ...row };
  detailDialog.visible = true;
};

// 删除敏感词
const handleDelete = async (row: SensitiveKeyword) => {
  try {
    await ElMessageBox.confirm(
      '此操作将永久删除该敏感词, 是否继续?',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'error'
      }
    );
    
    // 模拟删除API调用
    const index = tableData.value.findIndex(item => item.id === row.id);
    if (index > -1) {
      tableData.value.splice(index, 1);
      pagination.total--;
      ElMessage.success('删除成功');
    }
  } catch (error) {
    console.error('Delete cancelled:', error);
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
    
    // 模拟API调用
    if (dialog.type === 'create') {
      // 添加新敏感词
      const newKeyword: SensitiveKeyword = {
        id: Math.max(...tableData.value.map(item => item.id), 0) + 1,
        keyword: formData.keyword!,
        type: formData.type as any,
        level: formData.level as any,
        status: formData.status as any,
        matchType: formData.matchType as any,
        description: formData.description,
        remarks: formData.remarks,
        createdAt: new Date().toLocaleString(),
        updatedAt: new Date().toLocaleString()
      };
      
      tableData.value.unshift(newKeyword);
      pagination.total++;
      ElMessage.success('添加成功');
    } else {
      // 更新现有敏感词
      const index = tableData.value.findIndex(item => item.id === formData.id);
      if (index > -1) {
        Object.assign(tableData.value[index], {
          ...formData,
          updatedAt: new Date().toLocaleString()
        });
        ElMessage.success('更新成功');
      }
    }
    
    dialog.visible = false;
    loadData(); // 刷新数据
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
.keywords-container {
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

.dialog-footer {
  text-align: right;
}

.detail-content {
  max-height: 70vh;
  overflow-y: auto;
}

:deep(.el-descriptions__content) {
  word-break: break-all;
}
</style>