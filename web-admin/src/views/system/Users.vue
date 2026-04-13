<template>
  <!-- 用户管理页面 -->
  <div class="users-container">
    <el-card class="card-container">
      <template #header>
        <div class="card-header">
          <span>用户管理</span>
          <el-button type="primary" @click="handleCreate">添加用户</el-button>
        </div>
      </template>

      <!-- 搜索区域 -->
      <div class="search-box">
        <el-form :model="searchForm" inline>
          <el-form-item label="用户名">
            <el-input 
              v-model="searchForm.username" 
              placeholder="请输入用户名" 
              clearable
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input 
              v-model="searchForm.email" 
              placeholder="请输入邮箱" 
              clearable
            />
          </el-form-item>
          <el-form-item label="角色">
            <el-select v-model="searchForm.roleId" placeholder="请选择角色" clearable>
              <el-option 
                v-for="role in roleList" 
                :key="role.id" 
                :label="role.name" 
                :value="role.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
              <el-option label="启用" value="active" />
              <el-option label="禁用" value="inactive" />
              <el-option label="锁定" value="locked" />
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
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="nickname" label="昵称" width="120" />
        <el-table-column prop="email" label="邮箱" width="180" />
        <el-table-column prop="roleName" label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="getRoleTag(row.roleId)">{{ row.roleName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastLoginTime" label="最后登录" width="180" />
        <el-table-column prop="loginCount" label="登录次数" width="100" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column prop="updatedAt" label="更新时间" width="180" />
        <el-table-column label="操作" width="280" fixed="right">
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
            <el-dropdown size="small" split-button type="danger" @click="handleDelete(row)">
              更多
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleResetPassword(row)">重置密码</el-dropdown-item>
                  <el-dropdown-item @click="handleUnlock(row)" v-if="row.status === 'locked'">解锁</el-dropdown-item>
                  <el-dropdown-item @click="handleAssignRole(row)">分配角色</el-dropdown-item>
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

    <!-- 用户编辑对话框 -->
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
            <el-form-item label="用户名" prop="username">
              <el-input 
                v-model="formData.username" 
                placeholder="请输入用户名" 
                :disabled="dialog.type === 'edit'"
                maxlength="20"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="昵称" prop="nickname">
              <el-input 
                v-model="formData.nickname" 
                placeholder="请输入昵称" 
                maxlength="30"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input 
                v-model="formData.email" 
                placeholder="请输入邮箱" 
                maxlength="50"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号">
              <el-input 
                v-model="formData.phone" 
                placeholder="请输入手机号" 
                maxlength="11"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="角色" prop="roleId">
              <el-select v-model="formData.roleId" placeholder="请选择角色" style="width: 100%">
                <el-option 
                  v-for="role in roleList" 
                  :key="role.id" 
                  :label="role.name" 
                  :value="role.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="formData.status" placeholder="请选择状态" style="width: 100%">
                <el-option label="启用" value="active" />
                <el-option label="禁用" value="inactive" />
                <el-option label="锁定" value="locked" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="部门">
          <el-input 
            v-model="formData.department" 
            placeholder="请输入部门" 
            maxlength="50"
          />
        </el-form-item>
        
        <el-form-item label="职位">
          <el-input 
            v-model="formData.position" 
            placeholder="请输入职位" 
            maxlength="50"
          />
        </el-form-item>
        
        <el-form-item label="备注">
          <el-input 
            v-model="formData.remarks" 
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item v-if="dialog.type === 'create'" label="初始密码" prop="password">
          <el-input 
            v-model="formData.password" 
            type="password"
            placeholder="请输入初始密码"
            show-password
            maxlength="20"
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
    
    <!-- 用户详情对话框 -->
    <el-dialog 
      v-model="detailDialog.visible" 
      title="用户详情" 
      width="800px"
    >
      <div v-if="currentItem" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ currentItem.id }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ currentItem.username }}</el-descriptions-item>
          <el-descriptions-item label="昵称">{{ currentItem.nickname }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ currentItem.email }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ currentItem.phone || '未设置' }}</el-descriptions-item>
          <el-descriptions-item label="角色">
            <el-tag :type="getRoleTag(currentItem.roleId)">{{ currentItem.roleName }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTag(currentItem.status)">{{ getStatusLabel(currentItem.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="部门">{{ currentItem.department || '未设置' }}</el-descriptions-item>
          <el-descriptions-item label="职位">{{ currentItem.position || '未设置' }}</el-descriptions-item>
          <el-descriptions-item label="登录次数">{{ currentItem.loginCount }}</el-descriptions-item>
          <el-descriptions-item label="最后登录">{{ currentItem.lastLoginTime || '从未登录' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentItem.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ currentItem.updatedAt }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentItem.remarks || '无' }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailDialog.visible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 分配角色对话框 -->
    <el-dialog 
      v-model="assignRoleDialog.visible" 
      title="分配角色" 
      width="500px"
    >
      <el-form :model="assignRoleForm" label-width="80px">
        <el-form-item label="用户">
          <span>{{ assignRoleForm.username }}</span>
        </el-form-item>
        <el-form-item label="角色" prop="roleId">
          <el-select v-model="assignRoleForm.roleId" placeholder="请选择角色" style="width: 100%">
            <el-option 
              v-for="role in roleList" 
              :key="role.id" 
              :label="role.name" 
              :value="role.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="assignRoleDialog.visible = false">取消</el-button>
          <el-button type="primary" @click="confirmAssignRole">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

// 用户类型定义
interface User {
  id: number;
  username: string;
  nickname: string;
  email: string;
  phone?: string;
  roleId: number;
  roleName: string;
  status: 'active' | 'inactive' | 'locked';
  department?: string;
  position?: string;
  loginCount: number;
  lastLoginTime?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

// 角色类型定义
interface Role {
  id: number;
  name: string;
  description: string;
}

// 搜索表单
const searchForm = reactive({
  username: '',
  email: '',
  roleId: undefined as number | undefined,
  status: ''
});

// 表格数据
const tableData = ref<User[]>([]);
const loading = ref(false);

// 分页信息
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
});

// 角色列表
const roleList = ref<Role[]>([
  { id: 1, name: '超级管理员', description: '拥有系统最高权限' },
  { id: 2, name: '管理员', description: '拥有大部分管理权限' },
  { id: 3, name: '编辑', description: '拥有内容编辑权限' },
  { id: 4, name: '审核员', description: '拥有内容审核权限' },
  { id: 5, name: '普通用户', description: '基本使用权限' }
]);

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

// 分配角色对话框
const assignRoleDialog = reactive({
  visible: false
});

// 分配角色表单
const assignRoleForm = reactive({
  userId: 0,
  username: '',
  roleId: undefined as number | undefined
});

// 当前操作项目
const currentItem = ref<User | null>(null);

// 表单数据
const formData = reactive<Partial<User>>({
  id: undefined,
  username: '',
  nickname: '',
  email: '',
  phone: '',
  roleId: 5, // 默认普通用户
  status: 'active',
  department: '',
  position: '',
  remarks: '',
  password: ''
});

// 表单验证规则
const formRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { min: 2, max: 30, message: '长度在 2 到 30 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  roleId: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ]
};

// 表单引用
const formRef = ref();

// 获取用户列表
const loadData = () => {
  loading.value = true;
  
  // 模拟异步加载数据
  setTimeout(() => {
    // 模拟数据
    const mockData: User[] = [
      {
        id: 1,
        username: 'admin',
        nickname: '超级管理员',
        email: 'admin@example.com',
        phone: '13800138000',
        roleId: 1,
        roleName: '超级管理员',
        status: 'active',
        department: '技术部',
        position: '系统管理员',
        loginCount: 156,
        lastLoginTime: '2024-01-01 10:30:00',
        createdAt: '2023-01-01 08:00:00',
        updatedAt: '2024-01-01 10:30:00'
      },
      {
        id: 2,
        username: 'editor1',
        nickname: '内容编辑',
        email: 'editor1@example.com',
        phone: '13800138001',
        roleId: 3,
        roleName: '编辑',
        status: 'active',
        department: '内容部',
        position: '内容编辑',
        loginCount: 89,
        lastLoginTime: '2024-01-01 09:15:00',
        createdAt: '2023-03-15 09:00:00',
        updatedAt: '2024-01-01 09:15:00'
      },
      {
        id: 3,
        username: 'reviewer1',
        nickname: '审核专员',
        email: 'reviewer1@example.com',
        phone: '13800138002',
        roleId: 4,
        roleName: '审核员',
        status: 'active',
        department: '合规部',
        position: '内容审核员',
        loginCount: 234,
        lastLoginTime: '2024-01-01 11:45:00',
        createdAt: '2023-05-20 10:00:00',
        updatedAt: '2024-01-01 11:45:00'
      },
      {
        id: 4,
        username: 'user1',
        nickname: '普通用户1',
        email: 'user1@example.com',
        phone: '13800138003',
        roleId: 5,
        roleName: '普通用户',
        status: 'active',
        department: '市场部',
        position: '市场专员',
        loginCount: 45,
        lastLoginTime: '2024-01-01 14:20:00',
        createdAt: '2023-07-10 11:00:00',
        updatedAt: '2024-01-01 14:20:00'
      },
      {
        id: 5,
        username: 'manager1',
        nickname: '部门经理',
        email: 'manager1@example.com',
        phone: '13800138004',
        roleId: 2,
        roleName: '管理员',
        status: 'active',
        department: '管理部',
        position: '部门经理',
        loginCount: 167,
        lastLoginTime: '2024-01-01 12:30:00',
        createdAt: '2023-02-01 12:00:00',
        updatedAt: '2024-01-01 12:30:00'
      },
      {
        id: 6,
        username: 'user2',
        nickname: '普通用户2',
        email: 'user2@example.com',
        phone: '13800138005',
        roleId: 5,
        roleName: '普通用户',
        status: 'inactive',
        department: '技术部',
        position: '开发工程师',
        loginCount: 78,
        lastLoginTime: '2023-12-15 16:45:00',
        createdAt: '2023-08-15 13:00:00',
        updatedAt: '2023-12-15 16:45:00'
      },
      {
        id: 7,
        username: 'editor2',
        nickname: '内容编辑2',
        email: 'editor2@example.com',
        phone: '13800138006',
        roleId: 3,
        roleName: '编辑',
        status: 'active',
        department: '内容部',
        position: '资深编辑',
        loginCount: 312,
        lastLoginTime: '2024-01-01 08:45:00',
        createdAt: '2023-04-05 14:00:00',
        updatedAt: '2024-01-01 08:45:00'
      },
      {
        id: 8,
        username: 'user3',
        nickname: '普通用户3',
        email: 'user3@example.com',
        phone: '13800138007',
        roleId: 5,
        roleName: '普通用户',
        status: 'locked',
        loginCount: 12,
        lastLoginTime: '2023-11-20 10:15:00',
        createdAt: '2023-09-12 15:00:00',
        updatedAt: '2023-11-20 10:15:00'
      },
      {
        id: 9,
        username: 'reviewer2',
        nickname: '审核专员2',
        email: 'reviewer2@example.com',
        phone: '13800138008',
        roleId: 4,
        roleName: '审核员',
        status: 'active',
        department: '合规部',
        position: '高级审核员',
        loginCount: 445,
        lastLoginTime: '2024-01-01 15:30:00',
        createdAt: '2023-06-18 16:00:00',
        updatedAt: '2024-01-01 15:30:00'
      },
      {
        id: 10,
        username: 'user4',
        nickname: '普通用户4',
        email: 'user4@example.com',
        phone: '13800138009',
        roleId: 5,
        roleName: '普通用户',
        status: 'active',
        department: '运营部',
        position: '运营专员',
        loginCount: 67,
        lastLoginTime: '2024-01-01 13:15:00',
        createdAt: '2023-10-25 17:00:00',
        updatedAt: '2024-01-01 13:15:00'
      }
    ];
    
    // 应用搜索过滤
    let filteredData = mockData.filter(item => {
      let match = true;
      if (searchForm.username && !item.username.includes(searchForm.username)) {
        match = false;
      }
      if (searchForm.email && !item.email.includes(searchForm.email)) {
        match = false;
      }
      if (searchForm.roleId !== undefined && searchForm.roleId !== null && item.roleId !== searchForm.roleId) {
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
    case 'locked': return 'danger';
    default: return 'info';
  }
};

// 状态标签显示文本
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return '启用';
    case 'inactive': return '禁用';
    case 'locked': return '锁定';
    default: return status;
  }
};

// 角色标签样式
const getRoleTag = (roleId: number) => {
  switch (roleId) {
    case 1: return 'danger'; // 超级管理员
    case 2: return 'warning'; // 管理员
    case 3: return 'primary'; // 编辑
    case 4: return 'success'; // 审核员
    case 5: return 'info'; // 普通用户
    default: return 'info';
  }
};

// 搜索
const handleSearch = () => {
  pagination.currentPage = 1;
  loadData();
};

// 重置
const handleReset = () => {
  searchForm.username = '';
  searchForm.email = '';
  searchForm.roleId = undefined;
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
  dialog.title = '添加用户';
  dialog.visible = true;
  
  // 重置表单
  Object.assign(formData, {
    id: undefined,
    username: '',
    nickname: '',
    email: '',
    phone: '',
    roleId: 5,
    status: 'active',
    department: '',
    position: '',
    remarks: '',
    password: ''
  });
};

// 打开编辑对话框
const handleEdit = (row: User) => {
  dialog.type = 'edit';
  dialog.title = '编辑用户';
  dialog.visible = true;
  
  // 填充表单数据
  Object.assign(formData, { ...row });
};

// 查看用户详情
const handleView = (row: User) => {
  currentItem.value = { ...row };
  detailDialog.visible = true;
};

// 切换用户状态
const handleToggleStatus = async (row: User) => {
  try {
    await ElMessageBox.confirm(
      `确定要${row.status === 'active' ? '禁用' : '启用'}此用户吗？`,
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

// 重置密码
const handleResetPassword = async (row: User) => {
  try {
    await ElMessageBox.prompt(
      '请输入新密码',
      '重置密码',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputType: 'password',
        inputPlaceholder: '请输入新密码',
        inputValidator: (value) => {
          if (!value) {
            return '密码不能为空';
          }
          if (value.length < 6 || value.length > 20) {
            return '密码长度应在6-20位之间';
          }
          return true;
        }
      }
    ).then(({ value }) => {
      // 模拟重置密码
      console.log('Reset password for user:', row.username, 'to:', value);
      ElMessage.success('密码重置成功');
    });
  } catch (error) {
    console.error('Reset password cancelled:', error);
  }
};

// 解锁用户
const handleUnlock = async (row: User) => {
  try {
    await ElMessageBox.confirm(
      '确定要解锁此用户吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 模拟解锁操作
    row.status = 'active';
    row.updatedAt = new Date().toLocaleString();
    
    ElMessage.success('用户解锁成功');
  } catch (error) {
    console.error('Unlock cancelled:', error);
  }
};

// 分配角色
const handleAssignRole = (row: User) => {
  assignRoleForm.userId = row.id;
  assignRoleForm.username = row.username;
  assignRoleForm.roleId = row.roleId;
  assignRoleDialog.visible = true;
};

// 确认分配角色
const confirmAssignRole = async () => {
  if (!assignRoleForm.roleId) {
    ElMessage.error('请选择角色');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要为用户 "${assignRoleForm.username}" 分配角色吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    // 模拟分配角色
    const user = tableData.value.find(u => u.id === assignRoleForm.userId);
    if (user) {
      user.roleId = assignRoleForm.roleId;
      user.roleName = roleList.value.find(r => r.id === assignRoleForm.roleId)?.name || '';
      user.updatedAt = new Date().toLocaleString();
    }

    assignRoleDialog.visible = false;
    ElMessage.success('角色分配成功');
  } catch (error) {
    console.error('Assign role cancelled:', error);
  }
};

// 删除用户
const handleDelete = async (row: User) => {
  try {
    await ElMessageBox.confirm(
      `此操作将永久删除用户 "${row.username}", 是否继续?`,
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
      // 添加新用户
      const newUser: User = {
        id: Math.max(...tableData.value.map(item => item.id), 0) + 1,
        username: formData.username!,
        nickname: formData.nickname!,
        email: formData.email!,
        phone: formData.phone,
        roleId: formData.roleId!,
        roleName: roleList.value.find(r => r.id === formData.roleId)?.name || '',
        status: formData.status as any,
        department: formData.department,
        position: formData.position,
        loginCount: 0,
        remarks: formData.remarks,
        createdAt: new Date().toLocaleString(),
        updatedAt: new Date().toLocaleString()
      };
      
      tableData.value.unshift(newUser);
      pagination.total++;
      ElMessage.success('添加成功');
    } else {
      // 更新现有用户
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
.users-container {
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