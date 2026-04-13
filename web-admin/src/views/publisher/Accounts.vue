<template>
  <!-- 账号管理页面 -->
  <div class="accounts-container">
    <el-card class="card-container">
      <template #header>
        <div class="card-header">
          <span>账号管理</span>
          <el-button type="primary" @click="handleCreate">添加账号</el-button>
        </div>
      </template>

      <!-- 搜索区域 -->
      <div class="search-box">
        <el-form :model="searchForm" inline>
          <el-form-item label="账号名称">
            <el-input 
              v-model="searchForm.name" 
              placeholder="请输入账号名称" 
              clearable
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item label="平台类型">
            <el-select v-model="searchForm.platform" placeholder="请选择平台类型" clearable>
              <el-option label="微博" value="weibo" />
              <el-option label="微信公众号" value="wechat" />
              <el-option label="抖音" value="douyin" />
              <el-option label="快手" value="kuaishou" />
              <el-option label="小红书" value="xiaohongshu" />
              <el-option label="知乎" value="zhihu" />
              <el-option label="B站" value="bilibili" />
              <el-option label="头条号" value="toutiao" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
              <el-option label="启用" value="active" />
              <el-option label="停用" value="inactive" />
              <el-option label="封禁" value="banned" />
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
        <el-table-column prop="name" label="账号名称" width="150" show-overflow-tooltip />
        <el-table-column prop="platform" label="平台类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getPlatformTag(row.platform)">{{ getPlatformLabel(row.platform) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="account" label="账号" width="150" show-overflow-tooltip />
        <el-table-column prop="fansCount" label="粉丝数" width="100">
          <template #default="{ row }">
            {{ formatNumber(row.fansCount) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="authStatus" label="认证状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getAuthTag(row.authStatus)">{{ getAuthLabel(row.authStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastPublishTime" label="最后发布时间" width="180" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleView(row)">查看</el-button>
            <el-button size="small" type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button 
              size="small" 
              :type="row.status === 'active' ? 'warning' : 'success'"
              @click="handleToggleStatus(row)"
            >
              {{ row.status === 'active' ? '停用' : '启用' }}
            </el-button>
            <el-dropdown size="small" split-button type="danger" @click="handleDelete(row)">
              删除
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleDisable(row)" v-if="row.status === 'active'">停用</el-dropdown-item>
                  <el-dropdown-item @click="handleEnable(row)" v-if="row.status === 'inactive'">启用</el-dropdown-item>
                  <el-dropdown-item @click="handleBan(row)" v-if="row.status !== 'banned'">封禁</el-dropdown-item>
                  <el-dropdown-item @click="handleUnban(row)" v-if="row.status === 'banned'">解封</el-dropdown-item>
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

    <!-- 账号编辑对话框 -->
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
            <el-form-item label="账号名称" prop="name">
              <el-input 
                v-model="formData.name" 
                placeholder="请输入账号名称" 
                maxlength="50"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="平台类型" prop="platform">
              <el-select v-model="formData.platform" placeholder="请选择平台类型" style="width: 100%">
                <el-option label="微博" value="weibo" />
                <el-option label="微信公众号" value="wechat" />
                <el-option label="抖音" value="douyin" />
                <el-option label="快手" value="kuaishou" />
                <el-option label="小红书" value="xiaohongshu" />
                <el-option label="知乎" value="zhihu" />
                <el-option label="B站" value="bilibili" />
                <el-option label="头条号" value="toutiao" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="账号" prop="account">
              <el-input 
                v-model="formData.account" 
                placeholder="请输入账号" 
                maxlength="100"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="formData.status" placeholder="请选择状态" style="width: 100%">
                <el-option label="启用" value="active" />
                <el-option label="停用" value="inactive" />
                <el-option label="封禁" value="banned" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="粉丝数">
              <el-input-number 
                v-model="formData.fansCount" 
                :min="0"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="认证状态">
              <el-select v-model="formData.authStatus" placeholder="请选择认证状态" style="width: 100%">
                <el-option label="未认证" value="unverified" />
                <el-option label="个人认证" value="personal_verified" />
                <el-option label="机构认证" value="organization_verified" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="账号描述">
          <el-input 
            v-model="formData.description" 
            type="textarea"
            :rows="3"
            placeholder="请输入账号描述"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item label="API配置">
          <el-input 
            v-model="formData.apiConfig" 
            type="textarea"
            :rows="4"
            placeholder="请输入API配置信息(JSON格式)"
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
    
    <!-- 账号详情对话框 -->
    <el-dialog 
      v-model="detailDialog.visible" 
      title="账号详情" 
      width="800px"
    >
      <div v-if="currentItem" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ currentItem.id }}</el-descriptions-item>
          <el-descriptions-item label="账号名称">{{ currentItem.name }}</el-descriptions-item>
          <el-descriptions-item label="平台类型">
            <el-tag :type="getPlatformTag(currentItem.platform)">{{ getPlatformLabel(currentItem.platform) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="账号">{{ currentItem.account }}</el-descriptions-item>
          <el-descriptions-item label="粉丝数">{{ formatNumber(currentItem.fansCount) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTag(currentItem.status)">{{ getStatusLabel(currentItem.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="认证状态">
            <el-tag :type="getAuthTag(currentItem.authStatus)">{{ getAuthLabel(currentItem.authStatus) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentItem.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="最后发布时间">{{ currentItem.lastPublishTime || '从未发布' }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ currentItem.updatedAt }}</el-descriptions-item>
          <el-descriptions-item label="账号描述" :span="2">{{ currentItem.description || '无' }}</el-descriptions-item>
          <el-descriptions-item label="API配置" :span="2">
            <pre>{{ currentItem.apiConfig || '无' }}</pre>
          </el-descriptions-item>
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
import { getAccounts, addAccount, updateAccount, deleteAccount, updateAccountStatus } from '@/api/publisher';

// 账号类型定义
interface Account {
  id: number;
  name: string;
  platform: 'weibo' | 'wechat' | 'douyin' | 'kuaishou' | 'xiaohongshu' | 'zhihu' | 'bilibili' | 'toutiao';
  account: string;
  fansCount: number;
  status: 'active' | 'inactive' | 'banned';
  authStatus: 'unverified' | 'personal_verified' | 'organization_verified';
  description?: string;
  apiConfig?: string;
  lastPublishTime?: string;
  createdAt: string;
  updatedAt: string;
}

// 搜索表单
const searchForm = reactive({
  name: '',
  platform: '',
  status: '',
  page: 1,
  page_size: 10
});

// 表格数据
const tableData = ref<Account[]>([]);
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
const currentItem = ref<Account | null>(null);

// 表单数据
const formData = reactive<Partial<Account>>({
  id: undefined,
  name: '',
  platform: 'weibo',
  account: '',
  fansCount: 0,
  status: 'active',
  authStatus: 'unverified',
  description: '',
  apiConfig: '{\n  "appId": "",\n  "appSecret": "",\n  "accessToken": ""\n}'
});

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入账号名称', trigger: 'blur' },
    { min: 1, max: 50, message: '长度在 1 到 50 个字符', trigger: 'blur' }
  ],
  platform: [
    { required: true, message: '请选择平台类型', trigger: 'change' }
  ],
  account: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
};

// 表单引用
const formRef = ref();

// 获取账号列表
const loadData = async () => {
  loading.value = true;
  
  try {
    // 准备查询参数
    const params = {
      page: pagination.currentPage,
      page_size: pagination.pageSize,
      ...(searchForm.name && { name: searchForm.name }),
      ...(searchForm.platform && { platform: searchForm.platform }),
      ...(searchForm.status && { status: searchForm.status })
    };
    
    // 调用API获取数据
    const response = await getAccounts(params);
    
    // 假设API返回格式为 { code: 200, data: { items: [...], total: 100 } }
    // 如果实际API格式不同，这里需要相应调整
    tableData.value = response.data?.items || response.data || [];
    pagination.total = response.data?.total || response.total || tableData.value.length;
  } catch (error) {
    console.error('Failed to load accounts:', error);
    ElMessage.error('获取账号列表失败');
  } finally {
    loading.value = false;
  }
};

// 平台标签样式
const getPlatformTag = (platform: string) => {
  switch (platform) {
    case 'weibo': return 'warning';
    case 'wechat': return 'success';
    case 'douyin': return 'primary';
    case 'kuaishou': return 'danger';
    case 'xiaohongshu': return 'pink';
    case 'zhihu': return 'blue';
    case 'bilibili': return 'purple';
    case 'toutiao': return 'orange';
    default: return 'info';
  }
};

// 平台标签显示文本
const getPlatformLabel = (platform: string) => {
  switch (platform) {
    case 'weibo': return '微博';
    case 'wechat': return '微信公众号';
    case 'douyin': return '抖音';
    case 'kuaishou': return '快手';
    case 'xiaohongshu': return '小红书';
    case 'zhihu': return '知乎';
    case 'bilibili': return 'B站';
    case 'toutiao': return '头条号';
    default: return platform;
  }
};

// 状态标签样式
const getStatusTag = (status: string) => {
  switch (status) {
    case 'active': return 'success';
    case 'inactive': return 'info';
    case 'banned': return 'danger';
    default: return 'info';
  }
};

// 状态标签显示文本
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return '启用';
    case 'inactive': return '停用';
    case 'banned': return '封禁';
    default: return status;
  }
};

// 认证状态标签样式
const getAuthTag = (status: string) => {
  switch (status) {
    case 'unverified': return 'info';
    case 'personal_verified': return 'warning';
    case 'organization_verified': return 'success';
    default: return 'info';
  }
};

// 认证状态标签显示文本
const getAuthLabel = (status: string) => {
  switch (status) {
    case 'unverified': return '未认证';
    case 'personal_verified': return '个人认证';
    case 'organization_verified': return '机构认证';
    default: return status;
  }
};

// 格式化数字
const formatNumber = (num: number) => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toString();
};

// 搜索
const handleSearch = () => {
  pagination.currentPage = 1;
  loadData();
};

// 重置
const handleReset = () => {
  searchForm.name = '';
  searchForm.platform = '';
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

// 打开创建对话框
const handleCreate = () => {
  dialog.type = 'create';
  dialog.title = '添加账号';
  dialog.visible = true;
  
  // 重置表单
  Object.assign(formData, {
    id: undefined,
    name: '',
    platform: 'weibo',
    account: '',
    fansCount: 0,
    status: 'active',
    authStatus: 'unverified',
    description: '',
    apiConfig: '{\n  "appId": "",\n  "appSecret": "",\n  "accessToken": ""\n}'
  });
};

// 打开编辑对话框
const handleEdit = (row: Account) => {
  dialog.type = 'edit';
  dialog.title = '编辑账号';
  dialog.visible = true;
  
  // 填充表单数据
  Object.assign(formData, { ...row });
};

// 查看账号详情
const handleView = (row: Account) => {
  currentItem.value = { ...row };
  detailDialog.visible = true;
};

// 切换账号状态
const handleToggleStatus = async (row: Account) => {
  try {
    await ElMessageBox.confirm(
      `确定要${row.status === 'active' ? '停用' : '启用'}此账号吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 调用API更改状态
    const newStatus = row.status === 'active' ? 'inactive' : 'active';
    await updateAccountStatus(row.id, newStatus);
    
    // 更新本地数据
    row.status = newStatus;
    row.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    ElMessage.success(`${row.status === 'active' ? '启用' : '停用'}成功`);
  } catch (error) {
    console.error('Toggle status cancelled:', error);
    if (error !== 'cancel') {
      ElMessage.error('更改状态失败');
    }
  }
};

// 停用账号
const handleDisable = async (row: Account) => {
  try {
    await ElMessageBox.confirm(
      '确定要停用此账号吗？停用后将无法发布内容。',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 调用API更改状态
    await updateAccountStatus(row.id, 'inactive');
    
    // 更新本地数据
    row.status = 'inactive';
    row.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    ElMessage.success('停用成功');
  } catch (error) {
    console.error('Disable cancelled:', error);
    if (error !== 'cancel') {
      ElMessage.error('停用失败');
    }
  }
};

// 启用账号
const handleEnable = async (row: Account) => {
  try {
    await ElMessageBox.confirm(
      '确定要启用此账号吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 调用API更改状态
    await updateAccountStatus(row.id, 'active');
    
    // 更新本地数据
    row.status = 'active';
    row.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    ElMessage.success('启用成功');
  } catch (error) {
    console.error('Enable cancelled:', error);
    if (error !== 'cancel') {
      ElMessage.error('启用失败');
    }
  }
};

// 封禁账号
const handleBan = async (row: Account) => {
  try {
    await ElMessageBox.confirm(
      '确定要封禁此账号吗？封禁后将无法进行任何操作。',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'error'
      }
    );
    
    // 调用API更改状态
    await updateAccountStatus(row.id, 'banned');
    
    // 更新本地数据
    row.status = 'banned';
    row.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    ElMessage.success('封禁成功');
  } catch (error) {
    console.error('Ban cancelled:', error);
    if (error !== 'cancel') {
      ElMessage.error('封禁失败');
    }
  }
};

// 解封账号
const handleUnban = async (row: Account) => {
  try {
    await ElMessageBox.confirm(
      '确定要解封此账号吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 调用API更改状态
    await updateAccountStatus(row.id, 'active');
    
    // 更新本地数据
    row.status = 'active';
    row.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    ElMessage.success('解封成功');
  } catch (error) {
    console.error('Unban cancelled:', error);
    if (error !== 'cancel') {
      ElMessage.error('解封失败');
    }
  }
};

// 删除账号
const handleDelete = async (row: Account) => {
  try {
    await ElMessageBox.confirm(
      '此操作将永久删除该账号, 是否继续?',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'error'
      }
    );
    
    // 调用API删除账号
    await deleteAccount(row.id);
    
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
      // 添加新账号
      await addAccount({
        name: formData.name!,
        platform: formData.platform!,
        account: formData.account!,
        fansCount: formData.fansCount,
        status: formData.status,
        authStatus: formData.authStatus,
        description: formData.description,
        apiConfig: formData.apiConfig
      });
      
      ElMessage.success('添加成功');
    } else {
      // 更新现有账号
      if (formData.id) {
        await updateAccount(formData.id, {
          name: formData.name,
          platform: formData.platform,
          account: formData.account,
          fansCount: formData.fansCount,
          status: formData.status,
          authStatus: formData.authStatus,
          description: formData.description,
          apiConfig: formData.apiConfig
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
  await loadData();
});
</script>

<style scoped>
.accounts-container {
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

.detail-content {
  max-height: 70vh;
  overflow-y: auto;
}

:deep(.el-descriptions__content) {
  word-break: break-all;
}
</style>