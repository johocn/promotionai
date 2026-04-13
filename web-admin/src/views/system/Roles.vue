<template>
  <!-- 角色管理页面 -->
  <div class="roles-container">
    <el-card class="card-container">
      <template #header>
        <div class="card-header">
          <span>角色管理</span>
          <el-button type="primary" @click="handleCreate">添加角色</el-button>
        </div>
      </template>

      <!-- 搜索区域 -->
      <div class="search-box">
        <el-form :model="searchForm" inline>
          <el-form-item label="角色名称">
            <el-input 
              v-model="searchForm.name" 
              placeholder="请输入角色名称" 
              clearable
              @keyup.enter="handleSearch"
            />
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

      <!-- 表格区域 -->
      <el-table 
        :data="tableData" 
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="角色名称" width="150" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="userCount" label="用户数" width="100" />
        <el-table-column prop="permissionsCount" label="权限数" width="100" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column prop="updatedAt" label="更新时间" width="180" />
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleView(row)">查看</el-button>
            <el-button size="small" type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button 
              size="small" 
              type="warning"
              @click="handlePermissions(row)"
            >
              权限
            </el-button>
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

    <!-- 角色编辑对话框 -->
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
        <el-form-item label="角色名称" prop="name">
          <el-input 
            v-model="formData.name" 
            placeholder="请输入角色名称" 
            maxlength="50"
          />
        </el-form-item>
        
        <el-form-item label="状态" prop="status">
          <el-select v-model="formData.status" placeholder="请选择状态" style="width: 100%">
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="描述">
          <el-input 
            v-model="formData.description" 
            type="textarea"
            :rows="4"
            placeholder="请输入角色描述"
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
    
    <!-- 角色详情对话框 -->
    <el-dialog 
      v-model="detailDialog.visible" 
      title="角色详情" 
      width="800px"
    >
      <div v-if="currentItem" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ currentItem.id }}</el-descriptions-item>
          <el-descriptions-item label="角色名称">{{ currentItem.name }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTag(currentItem.status)">{{ getStatusLabel(currentItem.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="用户数">{{ currentItem.userCount }}</el-descriptions-item>
          <el-descriptions-item label="权限数">{{ currentItem.permissionsCount }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentItem.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ currentItem.updatedAt }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ currentItem.description || '无' }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailDialog.visible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 权限配置对话框 -->
    <el-dialog 
      v-model="permissionDialog.visible" 
      title="权限配置" 
      width="900px"
      top="5vh"
    >
      <div v-if="currentPermissionRole" class="permission-content">
        <div class="role-info">
          <h4>角色: {{ currentPermissionRole.name }}</h4>
          <p>{{ currentPermissionRole.description || '无描述' }}</p>
        </div>
        
        <el-tabs v-model="permissionTab" type="border-card">
          <el-tab-pane label="菜单权限" name="menu">
            <div class="permission-tree">
              <el-tree
                ref="menuTreeRef"
                :data="menuPermissions"
                show-checkbox
                node-key="id"
                :props="treeProps"
                :default-checked-keys="currentPermissionRole.menuPermissions || []"
                @check="handleMenuCheck"
              />
            </div>
          </el-tab-pane>
          <el-tab-pane label="按钮权限" name="button">
            <div class="permission-tree">
              <el-tree
                ref="buttonTreeRef"
                :data="buttonPermissions"
                show-checkbox
                node-key="id"
                :props="treeProps"
                :default-checked-keys="currentPermissionRole.buttonPermissions || []"
              />
            </div>
          </el-tab-pane>
          <el-tab-pane label="数据权限" name="data">
            <div class="data-permissions">
              <el-checkbox-group v-model="currentPermissionRole.dataPermissions">
                <el-checkbox label="own_data">本人数据</el-checkbox>
                <el-checkbox label="department_data">部门数据</el-checkbox>
                <el-checkbox label="company_data">公司数据</el-checkbox>
                <el-checkbox label="all_data">全部数据</el-checkbox>
              </el-checkbox-group>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="permissionDialog.visible = false">取消</el-button>
          <el-button type="primary" @click="savePermissions">保存权限</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

// 角色类型定义
interface Role {
  id: number;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  userCount: number;
  permissionsCount: number;
  menuPermissions?: string[];
  buttonPermissions?: string[];
  dataPermissions?: string[];
  createdAt: string;
  updatedAt: string;
}

// 权限节点类型定义
interface PermissionNode {
  id: string;
  label: string;
  children?: PermissionNode[];
}

// 搜索表单
const searchForm = reactive({
  name: '',
  status: ''
});

// 表格数据
const tableData = ref<Role[]>([]);
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

// 权限对话框
const permissionDialog = reactive({
  visible: false
});

// 权限标签
const permissionTab = ref('menu');

// 当前操作项目
const currentItem = ref<Role | null>(null);
const currentPermissionRole = ref<Role | null>(null);

// 表单数据
const formData = reactive<Partial<Role>>({
  id: undefined,
  name: '',
  description: '',
  status: 'active'
});

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
};

// 表单引用
const formRef = ref();

// 菜单权限树
const menuPermissions = ref<PermissionNode[]>([
  {
    id: 'dashboard',
    label: '仪表板',
    children: [
      { id: 'dashboard:view', label: '查看仪表板' }
    ]
  },
  {
    id: 'collector',
    label: '内容采集',
    children: [
      {
        id: 'collector:source',
        label: '数据源管理',
        children: [
          { id: 'collector:source:list', label: '查看列表' },
          { id: 'collector:source:create', label: '创建' },
          { id: 'collector:source:update', label: '编辑' },
          { id: 'collector:source:delete', label: '删除' }
        ]
      },
      {
        id: 'collector:task',
        label: '采集任务',
        children: [
          { id: 'collector:task:list', label: '查看列表' },
          { id: 'collector:task:create', label: '创建' },
          { id: 'collector:task:update', label: '编辑' },
          { id: 'collector:task:delete', label: '删除' }
        ]
      },
      {
        id: 'collector:content',
        label: '资讯列表',
        children: [
          { id: 'collector:content:list', label: '查看列表' },
          { id: 'collector:content:create', label: '创建' },
          { id: 'collector:content:update', label: '编辑' },
          { id: 'collector:content:delete', label: '删除' }
        ]
      }
    ]
  },
  {
    id: 'ai_processor',
    label: 'AI处理',
    children: [
      {
        id: 'ai_processor:generate',
        label: '内容生成',
        children: [
          { id: 'ai_processor:generate:create', label: '生成内容' },
          { id: 'ai_processor:generate:view', label: '查看' }
        ]
      },
      {
        id: 'ai_processor:review',
        label: '人工复核',
        children: [
          { id: 'ai_processor:review:list', label: '查看列表' },
          { id: 'ai_processor:review:approve', label: '审核通过' },
          { id: 'ai_processor:review:reject', label: '审核拒绝' }
        ]
      },
      {
        id: 'ai_processor:quality',
        label: '质量评估',
        children: [
          { id: 'ai_processor:quality:view', label: '查看' },
          { id: 'ai_processor:quality:evaluate', label: '评估' }
        ]
      }
    ]
  },
  {
    id: 'publisher',
    label: '内容发布',
    children: [
      {
        id: 'publisher:account',
        label: '账号管理',
        children: [
          { id: 'publisher:account:list', label: '查看列表' },
          { id: 'publisher:account:create', label: '创建' },
          { id: 'publisher:account:update', label: '编辑' },
          { id: 'publisher:account:delete', label: '删除' }
        ]
      },
      {
        id: 'publisher:task',
        label: '分发任务',
        children: [
          { id: 'publisher:task:list', label: '查看列表' },
          { id: 'publisher:task:create', label: '创建' },
          { id: 'publisher:task:update', label: '编辑' },
          { id: 'publisher:task:execute', label: '执行' }
        ]
      },
      {
        id: 'publisher:record',
        label: '发布记录',
        children: [
          { id: 'publisher:record:list', label: '查看列表' },
          { id: 'publisher:record:retry', label: '重试' },
          { id: 'publisher:record:delete', label: '删除' }
        ]
      }
    ]
  },
  {
    id: 'tracker',
    label: '数据追踪',
    children: [
      {
        id: 'tracker:link',
        label: '追踪链接',
        children: [
          { id: 'tracker:link:list', label: '查看列表' },
          { id: 'tracker:link:create', label: '创建' },
          { id: 'tracker:link:update', label: '编辑' },
          { id: 'tracker:link:delete', label: '删除' }
        ]
      },
      {
        id: 'tracker:analysis',
        label: '转化分析',
        children: [
          { id: 'tracker:analysis:view', label: '查看' },
          { id: 'tracker:analysis:export', label: '导出' }
        ]
      },
      {
        id: 'tracker:report',
        label: '统计报告',
        children: [
          { id: 'tracker:report:list', label: '查看列表' },
          { id: 'tracker:report:generate', label: '生成报告' },
          { id: 'tracker:report:export', label: '导出' }
        ]
      }
    ]
  },
  {
    id: 'compliance',
    label: '合规管理',
    children: [
      {
        id: 'compliance:review',
        label: '内容审核',
        children: [
          { id: 'compliance:review:list', label: '查看列表' },
          { id: 'compliance:review:approve', label: '审核通过' },
          { id: 'compliance:review:reject', label: '审核拒绝' }
        ]
      },
      {
        id: 'compliance:keyword',
        label: '敏感词库',
        children: [
          { id: 'compliance:keyword:list', label: '查看列表' },
          { id: 'compliance:keyword:create', label: '创建' },
          { id: 'compliance:keyword:update', label: '编辑' },
          { id: 'compliance:keyword:delete', label: '删除' }
        ]
      }
    ]
  },
  {
    id: 'system',
    label: '系统管理',
    children: [
      {
        id: 'system:user',
        label: '用户管理',
        children: [
          { id: 'system:user:list', label: '查看列表' },
          { id: 'system:user:create', label: '创建' },
          { id: 'system:user:update', label: '编辑' },
          { id: 'system:user:delete', label: '删除' }
        ]
      },
      {
        id: 'system:role',
        label: '角色管理',
        children: [
          { id: 'system:role:list', label: '查看列表' },
          { id: 'system:role:create', label: '创建' },
          { id: 'system:role:update', label: '编辑' },
          { id: 'system:role:delete', label: '删除' }
        ]
      },
      {
        id: 'system:setting',
        label: '系统配置',
        children: [
          { id: 'system:setting:view', label: '查看' },
          { id: 'system:setting:update', label: '编辑' }
        ]
      }
    ]
  }
]);

// 按钮权限树
const buttonPermissions = ref<PermissionNode[]>([
  {
    id: 'common',
    label: '通用按钮',
    children: [
      { id: 'common:add', label: '新增按钮' },
      { id: 'common:edit', label: '编辑按钮' },
      { id: 'common:delete', label: '删除按钮' },
      { id: 'common:view', label: '查看按钮' },
      { id: 'common:export', label: '导出按钮' }
    ]
  },
  {
    id: 'collector_buttons',
    label: '采集模块按钮',
    children: [
      { id: 'collector:refresh', label: '刷新按钮' },
      { id: 'collector:batch_delete', label: '批量删除按钮' },
      { id: 'collector:import', label: '导入按钮' }
    ]
  },
  {
    id: 'publisher_buttons',
    label: '发布模块按钮',
    children: [
      { id: 'publisher:execute', label: '执行按钮' },
      { id: 'publisher:pause', label: '暂停按钮' },
      { id: 'publisher:resume', label: '恢复按钮' }
    ]
  },
  {
    id: 'compliance_buttons',
    label: '合规模块按钮',
    children: [
      { id: 'compliance:approve', label: '通过按钮' },
      { id: 'compliance:reject', label: '拒绝按钮' },
      { id: 'compliance:batch_approve', label: '批量通过按钮' },
      { id: 'compliance:batch_reject', label: '批量拒绝按钮' }
    ]
  }
]);

// 树形控件属性
const treeProps = {
  children: 'children',
  label: 'label'
};

// 菜单树引用
const menuTreeRef = ref();
const buttonTreeRef = ref();

// 获取角色列表
const loadData = () => {
  loading.value = true;
  
  // 模拟异步加载数据
  setTimeout(() => {
    // 模拟数据
    const mockData: Role[] = [
      {
        id: 1,
        name: '超级管理员',
        description: '拥有系统最高权限，可以管理所有功能模块',
        status: 'active',
        userCount: 1,
        permissionsCount: 120,
        menuPermissions: ['dashboard', 'collector', 'ai_processor', 'publisher', 'tracker', 'compliance', 'system'],
        buttonPermissions: ['common', 'collector_buttons', 'publisher_buttons', 'compliance_buttons'],
        dataPermissions: ['all_data'],
        createdAt: '2023-01-01 08:00:00',
        updatedAt: '2024-01-01 10:30:00'
      },
      {
        id: 2,
        name: '管理员',
        description: '拥有大部分管理权限，可以管理大部分功能模块',
        status: 'active',
        userCount: 5,
        permissionsCount: 90,
        menuPermissions: ['dashboard', 'collector', 'ai_processor', 'publisher', 'tracker', 'compliance'],
        buttonPermissions: ['common', 'collector_buttons', 'publisher_buttons', 'compliance_buttons'],
        dataPermissions: ['department_data'],
        createdAt: '2023-02-01 09:00:00',
        updatedAt: '2024-01-01 09:15:00'
      },
      {
        id: 3,
        name: '内容编辑',
        description: '负责内容编辑和发布，可以使用AI处理功能',
        status: 'active',
        userCount: 12,
        permissionsCount: 45,
        menuPermissions: ['dashboard', 'ai_processor:generate', 'ai_processor:quality', 'publisher:task', 'publisher:record'],
        buttonPermissions: ['common:add', 'common:edit', 'common:view', 'publisher:execute'],
        dataPermissions: ['own_data'],
        createdAt: '2023-03-15 10:00:00',
        updatedAt: '2024-01-01 11:45:00'
      },
      {
        id: 4,
        name: '审核员',
        description: '负责内容审核，确保内容合规',
        status: 'active',
        userCount: 8,
        permissionsCount: 30,
        menuPermissions: ['dashboard', 'compliance:review', 'compliance:keyword'],
        buttonPermissions: ['common:view', 'compliance:approve', 'compliance:reject', 'compliance:batch_approve', 'compliance:batch_reject'],
        dataPermissions: ['department_data'],
        createdAt: '2023-04-20 11:00:00',
        updatedAt: '2024-01-01 12:30:00'
      },
      {
        id: 5,
        name: '数据分析师',
        description: '负责数据分析和报告生成',
        status: 'active',
        userCount: 3,
        permissionsCount: 25,
        menuPermissions: ['dashboard', 'tracker:analysis', 'tracker:report'],
        buttonPermissions: ['common:view', 'common:export', 'tracker:analysis:export', 'tracker:report:generate'],
        dataPermissions: ['department_data'],
        createdAt: '2023-05-25 12:00:00',
        updatedAt: '2024-01-01 13:20:00'
      },
      {
        id: 6,
        name: '普通用户',
        description: '基本使用权限，可以查看部分数据',
        status: 'active',
        userCount: 45,
        permissionsCount: 10,
        menuPermissions: ['dashboard'],
        buttonPermissions: ['common:view'],
        dataPermissions: ['own_data'],
        createdAt: '2023-06-30 13:00:00',
        updatedAt: '2024-01-01 14:10:00'
      },
      {
        id: 7,
        name: '系统维护员',
        description: '负责系统维护和技术支持',
        status: 'inactive',
        userCount: 2,
        permissionsCount: 20,
        menuPermissions: ['system:setting'],
        buttonPermissions: ['common:view', 'system:setting:update'],
        dataPermissions: ['company_data'],
        createdAt: '2023-07-15 14:00:00',
        updatedAt: '2023-12-20 15:30:00'
      }
    ];
    
    // 应用搜索过滤
    let filteredData = mockData.filter(item => {
      let match = true;
      if (searchForm.name && !item.name.includes(searchForm.name)) {
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
    default: return 'info';
  }
};

// 状态标签显示文本
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return '启用';
    case 'inactive': return '禁用';
    default: return status;
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
  dialog.title = '添加角色';
  dialog.visible = true;
  
  // 重置表单
  Object.assign(formData, {
    id: undefined,
    name: '',
    description: '',
    status: 'active'
  });
};

// 打开编辑对话框
const handleEdit = (row: Role) => {
  dialog.type = 'edit';
  dialog.title = '编辑角色';
  dialog.visible = true;
  
  // 填充表单数据
  Object.assign(formData, { ...row });
};

// 查看角色详情
const handleView = (row: Role) => {
  currentItem.value = { ...row };
  detailDialog.visible = true;
};

// 切换角色状态
const handleToggleStatus = async (row: Role) => {
  try {
    await ElMessageBox.confirm(
      `确定要${row.status === 'active' ? '禁用' : '启用'}此角色吗？`,
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

// 配置权限
const handlePermissions = (row: Role) => {
  currentPermissionRole.value = { ...row };
  permissionDialog.visible = true;
  
  // 确保权限数组存在
  if (!currentPermissionRole.value.menuPermissions) {
    currentPermissionRole.value.menuPermissions = [];
  }
  if (!currentPermissionRole.value.buttonPermissions) {
    currentPermissionRole.value.buttonPermissions = [];
  }
  if (!currentPermissionRole.value.dataPermissions) {
    currentPermissionRole.value.dataPermissions = [];
  }
};

// 菜单权限勾选
const handleMenuCheck = () => {
  if (menuTreeRef.value) {
    const checkedKeys = menuTreeRef.value.getCheckedKeys();
    if (currentPermissionRole.value) {
      currentPermissionRole.value.menuPermissions = checkedKeys;
    }
  }
};

// 保存权限
const savePermissions = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要保存权限配置吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 查找并更新角色权限
    const roleIndex = tableData.value.findIndex(role => role.id === currentPermissionRole.value?.id);
    if (roleIndex !== -1) {
      tableData.value[roleIndex].menuPermissions = currentPermissionRole.value?.menuPermissions || [];
      tableData.value[roleIndex].buttonPermissions = currentPermissionRole.value?.buttonPermissions || [];
      tableData.value[roleIndex].dataPermissions = currentPermissionRole.value?.dataPermissions || [];
      tableData.value[roleIndex].permissionsCount = 
        (currentPermissionRole.value?.menuPermissions?.length || 0) +
        (currentPermissionRole.value?.buttonPermissions?.length || 0) +
        (currentPermissionRole.value?.dataPermissions?.length || 0);
      tableData.value[roleIndex].updatedAt = new Date().toLocaleString();
    }
    
    permissionDialog.visible = false;
    ElMessage.success('权限配置保存成功');
  } catch (error) {
    console.error('Save permissions cancelled:', error);
  }
};

// 删除角色
const handleDelete = async (row: Role) => {
  try {
    await ElMessageBox.confirm(
      `此操作将永久删除角色 "${row.name}", 是否继续?`,
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'error'
      }
    );
    
    // 检查角色是否有关联用户
    if (row.userCount > 0) {
      ElMessage.error('该角色下还有用户，无法删除');
      return;
    }
    
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
      // 添加新角色
      const newRole: Role = {
        id: Math.max(...tableData.value.map(item => item.id), 0) + 1,
        name: formData.name!,
        description: formData.description,
        status: formData.status as any,
        userCount: 0,
        permissionsCount: 0,
        createdAt: new Date().toLocaleString(),
        updatedAt: new Date().toLocaleString()
      };
      
      tableData.value.unshift(newRole);
      pagination.total++;
      ElMessage.success('添加成功');
    } else {
      // 更新现有角色
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
.roles-container {
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

.permission-content {
  max-height: 70vh;
  overflow-y: auto;
}

.role-info {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.role-info h4 {
  margin: 0 0 10px 0;
  font-size: 16px;
}

.permission-tree {
  margin: 20px 0;
  padding: 15px;
  background-color: #fafafa;
  border-radius: 4px;
}

.data-permissions {
  padding: 15px;
}

:deep(.el-descriptions__content) {
  word-break: break-all;
}
</style>