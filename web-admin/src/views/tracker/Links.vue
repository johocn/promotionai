<template>
  <!-- 追踪链接页面 -->
  <div class="links-container">
    <el-card class="card-container">
      <template #header>
        <div class="card-header">
          <span>追踪链接</span>
          <el-button type="primary" @click="handleCreate">创建链接</el-button>
        </div>
      </template>

      <!-- 搜索区域 -->
      <div class="search-box">
        <el-form :model="searchForm" inline>
          <el-form-item label="链接名称">
            <el-input 
              v-model="searchForm.name" 
              placeholder="请输入链接名称" 
              clearable
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item label="短链">
            <el-input 
              v-model="searchForm.shortLink" 
              placeholder="请输入短链" 
              clearable
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
              <el-option label="启用" value="active" />
              <el-option label="禁用" value="inactive" />
              <el-option label="过期" value="expired" />
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
        <el-table-column prop="name" label="链接名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="shortLink" label="短链" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="short-link-cell">
              <span>{{ row.shortLink }}</span>
              <el-button 
                size="small" 
                type="primary" 
                link
                @click="copyLink(row.shortLink)"
              >
                复制
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="originalLink" label="原链" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="clickCount" label="点击数" width="100" />
        <el-table-column prop="conversionCount" label="转化数" width="100" />
        <el-table-column prop="conversionRate" label="转化率" width="100">
          <template #default="{ row }">
            {{ calculateConversionRate(row.clickCount, row.conversionCount) }}%
          </template>
        </el-table-column>
        <el-table-column prop="expiryTime" label="过期时间" width="180" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleView(row)">详情</el-button>
            <el-button size="small" type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button 
              size="small" 
              :type="row.status === 'active' ? 'warning' : 'success'"
              @click="handleToggleStatus(row)"
            >
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-dropdown size="small" split-button type="danger" @click="handleDelete(row)">
              更多
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleResetStats(row)">重置统计</el-dropdown-item>
                  <el-dropdown-item @click="handleExtend(row)">延长有效期</el-dropdown-item>
                  <el-dropdown-item @click="handleDelete(row)">删除</el-dropdown-item>
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

    <!-- 链接编辑对话框 -->
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
        <el-form-item label="链接名称" prop="name">
          <el-input 
            v-model="formData.name" 
            placeholder="请输入链接名称" 
            maxlength="100"
          />
        </el-form-item>
        
        <el-form-item label="原链地址" prop="originalLink">
          <el-input 
            v-model="formData.originalLink" 
            placeholder="请输入完整的原链地址" 
            type="textarea"
            :rows="3"
          />
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="短链后缀">
              <el-input 
                v-model="formData.shortCode" 
                placeholder="留空自动生成" 
                maxlength="20"
              />
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
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="过期时间">
              <el-date-picker
                v-model="formData.expiryTime"
                type="datetime"
                placeholder="选择过期时间"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="跟踪参数">
              <el-input 
                v-model="formData.trackParams" 
                placeholder="请输入跟踪参数" 
                maxlength="200"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="链接描述">
          <el-input 
            v-model="formData.description" 
            type="textarea"
            :rows="3"
            placeholder="请输入链接描述"
            maxlength="200"
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
    
    <!-- 链接详情对话框 -->
    <el-dialog 
      v-model="detailDialog.visible" 
      title="链接详情" 
      width="800px"
    >
      <div v-if="currentItem" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ currentItem.id }}</el-descriptions-item>
          <el-descriptions-item label="链接名称">{{ currentItem.name }}</el-descriptions-item>
          <el-descriptions-item label="短链">
            <div class="short-link-detail">
              <span>{{ currentItem.shortLink }}</span>
              <el-button 
                size="small" 
                type="primary" 
                link
                @click="copyLink(currentItem.shortLink)"
              >
                复制
              </el-button>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="原链" :span="2">
            <a :href="currentItem.originalLink" target="_blank">{{ currentItem.originalLink }}</a>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTag(currentItem.status)">{{ getStatusLabel(currentItem.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="点击数">{{ currentItem.clickCount }}</el-descriptions-item>
          <el-descriptions-item label="转化数">{{ currentItem.conversionCount }}</el-descriptions-item>
          <el-descriptions-item label="转化率">{{ calculateConversionRate(currentItem.clickCount, currentItem.conversionCount) }}%</el-descriptions-item>
          <el-descriptions-item label="过期时间">{{ currentItem.expiryTime || '永不过期' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentItem.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ currentItem.updatedAt }}</el-descriptions-item>
          <el-descriptions-item label="跟踪参数">{{ currentItem.trackParams || '无' }}</el-descriptions-item>
          <el-descriptions-item label="链接描述" :span="2">{{ currentItem.description || '无' }}</el-descriptions-item>
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

// 追踪链接类型定义
interface TrackingLink {
  id: number;
  name: string;
  shortLink: string;
  originalLink: string;
  status: 'active' | 'inactive' | 'expired';
  clickCount: number;
  conversionCount: number;
  trackParams?: string;
  description?: string;
  shortCode?: string;
  expiryTime?: string;
  createdAt: string;
  updatedAt: string;
}

// 搜索表单
const searchForm = reactive({
  name: '',
  shortLink: '',
  status: ''
});

// 表格数据
const tableData = ref<TrackingLink[]>([]);
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

// 当前操作项目
const currentItem = ref<TrackingLink | null>(null);

// 表单数据
const formData = reactive<Partial<TrackingLink>>({
  id: undefined,
  name: '',
  originalLink: '',
  status: 'active',
  clickCount: 0,
  conversionCount: 0,
  shortCode: '',
  expiryTime: undefined,
  trackParams: 'utm_source=promotion&utm_medium=link',
  description: ''
});

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入链接名称', trigger: 'blur' },
    { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' }
  ],
  originalLink: [
    { required: true, message: '请输入原链地址', trigger: 'blur' },
    { pattern: /^https?:\/\/.+/, message: '请输入有效的URL地址', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
};

// 表单引用
const formRef = ref();

// 获取追踪链接列表
const loadData = () => {
  loading.value = true;
  
  // 模拟异步加载数据
  setTimeout(() => {
    // 模拟数据
    const mockData: TrackingLink[] = [
      {
        id: 1,
        name: 'AI科技产品推广链接',
        shortLink: 'http://short.ly/a1b2c3',
        originalLink: 'https://www.example.com/products/ai-tech?utm_source=promotion&utm_medium=link&utm_campaign=ai_product',
        status: 'active',
        clickCount: 1250,
        conversionCount: 45,
        trackParams: 'utm_source=promotion&utm_medium=link&utm_campaign=ai_product',
        description: 'AI科技产品推广专用链接',
        shortCode: 'a1b2c3',
        expiryTime: '2024-12-31 23:59:59',
        createdAt: '2024-01-01 10:00:00',
        updatedAt: '2024-01-01 15:30:00'
      },
      {
        id: 2,
        name: '健康生活课程链接',
        shortLink: 'http://short.ly/x7y8z9',
        originalLink: 'https://www.example.com/courses/health-life?utm_source=promotion&utm_medium=link&utm_campaign=health_course',
        status: 'active',
        clickCount: 890,
        conversionCount: 32,
        trackParams: 'utm_source=promotion&utm_medium=link&utm_campaign=health_course',
        description: '健康生活课程推广链接',
        shortCode: 'x7y8z9',
        expiryTime: '2024-11-30 23:59:59',
        createdAt: '2024-01-01 11:00:00',
        updatedAt: '2024-01-01 14:20:00'
      },
      {
        id: 3,
        name: '电商促销活动链接',
        shortLink: 'http://short.ly/m4n5p6',
        originalLink: 'https://www.example.com/sale/promotion?utm_source=promotion&utm_medium=link&utm_campaign=sale_event',
        status: 'inactive',
        clickCount: 2100,
        conversionCount: 156,
        trackParams: 'utm_source=promotion&utm_medium=link&utm_campaign=sale_event',
        description: '电商促销活动专用链接',
        shortCode: 'm4n5p6',
        expiryTime: '2024-10-31 23:59:59',
        createdAt: '2024-01-01 12:00:00',
        updatedAt: '2024-01-01 12:00:00'
      },
      {
        id: 4,
        name: '教育培训报名链接',
        shortLink: 'http://short.ly/q2r3s4',
        originalLink: 'https://www.example.com/enroll/training?utm_source=promotion&utm_medium=link&utm_campaign=training_program',
        status: 'expired',
        clickCount: 650,
        conversionCount: 18,
        trackParams: 'utm_source=promotion&utm_medium=link&utm_campaign=training_program',
        description: '教育培训项目报名链接',
        shortCode: 'q2r3s4',
        expiryTime: '2023-12-31 23:59:59',
        createdAt: '2023-12-01 09:00:00',
        updatedAt: '2023-12-31 23:59:59'
      },
      {
        id: 5,
        name: '旅游产品预订链接',
        shortLink: 'http://short.ly/t5u6v7',
        originalLink: 'https://www.example.com/book/tourism?utm_source=promotion&utm_medium=link&utm_campaign=tourism_package',
        status: 'active',
        clickCount: 1560,
        conversionCount: 78,
        trackParams: 'utm_source=promotion&utm_medium=link&utm_campaign=tourism_package',
        description: '旅游产品套餐预订链接',
        shortCode: 't5u6v7',
        expiryTime: '2024-09-30 23:59:59',
        createdAt: '2024-01-01 13:00:00',
        updatedAt: '2024-01-01 16:45:00'
      },
      {
        id: 6,
        name: '金融服务产品链接',
        shortLink: 'http://short.ly/w8x9y0',
        originalLink: 'https://www.example.com/apply/finance?utm_source=promotion&utm_medium=link&utm_campaign=finance_service',
        status: 'active',
        clickCount: 980,
        conversionCount: 42,
        trackParams: 'utm_source=promotion&utm_medium=link&utm_campaign=finance_service',
        description: '金融服务产品申请链接',
        shortCode: 'w8x9y0',
        expiryTime: '2024-08-31 23:59:59',
        createdAt: '2024-01-01 14:00:00',
        updatedAt: '2024-01-01 17:20:00'
      },
      {
        id: 7,
        name: '美食外卖优惠链接',
        shortLink: 'http://short.ly/z1a2b3',
        originalLink: 'https://www.example.com/order/food?utm_source=promotion&utm_medium=link&utm_campaign=food_delivery',
        status: 'active',
        clickCount: 3200,
        conversionCount: 210,
        trackParams: 'utm_source=promotion&utm_medium=link&utm_campaign=food_delivery',
        description: '美食外卖优惠活动链接',
        shortCode: 'z1a2b3',
        expiryTime: '2024-07-31 23:59:59',
        createdAt: '2024-01-01 15:00:00',
        updatedAt: '2024-01-01 18:10:00'
      },
      {
        id: 8,
        name: '房产中介服务链接',
        shortLink: 'http://short.ly/c4d5e6',
        originalLink: 'https://www.example.com/search/realty?utm_source=promotion&utm_medium=link&utm_campaign=realty_service',
        status: 'inactive',
        clickCount: 750,
        conversionCount: 12,
        trackParams: 'utm_source=promotion&utm_medium=link&utm_campaign=realty_service',
        description: '房产中介服务推广链接',
        shortCode: 'c4d5e6',
        expiryTime: '2024-06-30 23:59:59',
        createdAt: '2024-01-01 16:00:00',
        updatedAt: '2024-01-01 16:00:00'
      },
      {
        id: 9,
        name: '汽车销售促销链接',
        shortLink: 'http://short.ly/f7g8h9',
        originalLink: 'https://www.example.com/buy/auto?utm_source=promotion&utm_medium=link&utm_campaign=auto_sale',
        status: 'active',
        clickCount: 1800,
        conversionCount: 65,
        trackParams: 'utm_source=promotion&utm_medium=link&utm_campaign=auto_sale',
        description: '汽车销售促销活动链接',
        shortCode: 'f7g8h9',
        expiryTime: '2024-05-31 23:59:59',
        createdAt: '2024-01-01 17:00:00',
        updatedAt: '2024-01-01 19:30:00'
      },
      {
        id: 10,
        name: '服装品牌新品链接',
        shortLink: 'http://short.ly/i0j1k2',
        originalLink: 'https://www.example.com/shop/clothing?utm_source=promotion&utm_medium=link&utm_campaign=clothing_new',
        status: 'active',
        clickCount: 2400,
        conversionCount: 142,
        trackParams: 'utm_source=promotion&utm_medium=link&utm_campaign=clothing_new',
        description: '服装品牌新品推广链接',
        shortCode: 'i0j1k2',
        expiryTime: '2024-04-30 23:59:59',
        createdAt: '2024-01-01 18:00:00',
        updatedAt: '2024-01-01 20:15:00'
      }
    ];
    
    // 应用搜索过滤
    let filteredData = mockData.filter(item => {
      let match = true;
      if (searchForm.name && !item.name.includes(searchForm.name)) {
        match = false;
      }
      if (searchForm.shortLink && !item.shortLink.includes(searchForm.shortLink)) {
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
    
    loading.value = false;
  }, 500);
};

// 状态标签样式
const getStatusTag = (status: string) => {
  switch (status) {
    case 'active': return 'success';
    case 'inactive': return 'info';
    case 'expired': return 'danger';
    default: return 'info';
  }
};

// 状态标签显示文本
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return '启用';
    case 'inactive': return '禁用';
    case 'expired': return '过期';
    default: return status;
  }
};

// 计算转化率
const calculateConversionRate = (clicks: number, conversions: number) => {
  if (clicks === 0) return 0;
  return parseFloat(((conversions / clicks) * 100).toFixed(2));
};

// 搜索
const handleSearch = () => {
  pagination.currentPage = 1;
  loadData();
};

// 重置
const handleReset = () => {
  searchForm.name = '';
  searchForm.shortLink = '';
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

// 复制链接
const copyLink = (link: string) => {
  navigator.clipboard.writeText(link)
    .then(() => {
      ElMessage.success('链接已复制到剪贴板');
    })
    .catch(err => {
      ElMessage.error('复制链接失败');
      console.error('Failed to copy link: ', err);
    });
};

// 打开创建对话框
const handleCreate = () => {
  dialog.type = 'create';
  dialog.title = '创建追踪链接';
  dialog.visible = true;
  
  // 重置表单
  Object.assign(formData, {
    id: undefined,
    name: '',
    originalLink: '',
    status: 'active',
    clickCount: 0,
    conversionCount: 0,
    shortCode: '',
    expiryTime: undefined,
    trackParams: 'utm_source=promotion&utm_medium=link',
    description: ''
  });
};

// 打开编辑对话框
const handleEdit = (row: TrackingLink) => {
  dialog.type = 'edit';
  dialog.title = '编辑追踪链接';
  dialog.visible = true;
  
  // 填充表单数据
  Object.assign(formData, { ...row });
};

// 查看链接详情
const handleView = (row: TrackingLink) => {
  currentItem.value = { ...row };
  detailDialog.visible = true;
};

// 切换链接状态
const handleToggleStatus = async (row: TrackingLink) => {
  try {
    await ElMessageBox.confirm(
      `确定要${row.status === 'active' ? '禁用' : '启用'}此链接吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 模拟切换状态
    row.status = row.status === 'active' ? 'inactive' : 'active';
    row.updatedAt = new Date().toLocaleString();
    
    ElMessage.success(`${row.status === 'active' ? '启用' : '禁用'}成功`);
  } catch (error) {
    console.error('Toggle status cancelled:', error);
  }
};

// 重置统计
const handleResetStats = async (row: TrackingLink) => {
  try {
    await ElMessageBox.confirm(
      '确定要重置此链接的统计信息吗？此操作不可逆。',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'error'
      }
    );
    
    // 模拟重置统计
    row.clickCount = 0;
    row.conversionCount = 0;
    row.updatedAt = new Date().toLocaleString();
    
    ElMessage.success('统计信息已重置');
  } catch (error) {
    console.error('Reset stats cancelled:', error);
  }
};

// 延长有效期
const handleExtend = async (row: TrackingLink) => {
  try {
    await ElMessageBox.prompt(
      '请输入新的过期时间',
      '延长有效期',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: row.expiryTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
        inputPattern: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
        inputErrorMessage: '日期格式不正确'
      }
    ).then(({ value }) => {
      row.expiryTime = value;
      row.updatedAt = new Date().toLocaleString();
      ElMessage.success('有效期已延长');
    });
  } catch (error) {
    console.error('Extend cancelled:', error);
  }
};

// 删除链接
const handleDelete = async (row: TrackingLink) => {
  try {
    await ElMessageBox.confirm(
      '此操作将永久删除该追踪链接, 是否继续?',
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
      // 添加新链接
      const newLink: TrackingLink = {
        id: Math.max(...tableData.value.map(item => item.id), 0) + 1,
        name: formData.name!,
        shortLink: `http://short.ly/${formData.shortCode || generateShortCode()}`,
        originalLink: formData.originalLink!,
        status: formData.status as any,
        clickCount: 0,
        conversionCount: 0,
        trackParams: formData.trackParams,
        description: formData.description,
        shortCode: formData.shortCode || generateShortCode(),
        expiryTime: formData.expiryTime,
        createdAt: new Date().toLocaleString(),
        updatedAt: new Date().toLocaleString()
      };
      
      tableData.value.unshift(newLink);
      pagination.total++;
      ElMessage.success('创建成功');
    } else {
      // 更新现有链接
      const index = tableData.value.findIndex(item => item.id === formData.id);
      if (index > -1) {
        Object.assign(tableData.value[index], {
          ...formData,
          shortLink: `http://short.ly/${formData.shortCode || generateShortCode()}`,
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

// 生成短码
const generateShortCode = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// 初始化
onMounted(() => {
  loadData();
});
</script>

<style scoped>
.links-container {
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

.short-link-cell {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.short-link-detail {
  display: flex;
  align-items: center;
}

.detail-content {
  max-height: 70vh;
  overflow-y: auto;
}

:deep(.el-descriptions__content) {
  word-break: break-all;
}
</style>