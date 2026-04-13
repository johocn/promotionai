<template>
  <div class="common-list-page">
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <CommonSearchForm 
        :initialFormData="initialSearchData"
        @search="handleSearch"
        @reset="handleReset"
      >
        <template #default="{ searchForm, handleSearch, handleReset }">
          <slot 
            name="search-form" 
            :searchForm="searchForm" 
            :handleSearch="handleSearch" 
            :handleReset="handleReset"
          ></slot>
        </template>
      </CommonSearchForm>
    </el-card>

    <!-- 操作栏 -->
    <div class="operation-bar">
      <div class="left-actions">
        <slot name="actions" :selectedRows="selectedRows"></slot>
        <el-button 
          v-if="showCreateButton" 
          type="primary" 
          @click="handleCreate"
        >
          {{ createButtonText }}
        </el-button>
      </div>
      <div class="right-actions">
        <slot name="extra-actions"></slot>
      </div>
    </div>

    <!-- 数据表格 -->
    <el-card class="table-card">
      <CommonDataTable
        :data="tableData"
        :total="total"
        :loading="loading"
        :show-selection="showSelection"
        :show-operations="showOperations"
        :page-sizes="pageSizes"
        :initial-page="currentPage"
        :initial-page-size="pageSize"
        @selection-change="handleSelectionChange"
        @current-change="handleCurrentChange"
        @size-change="handleSizeChange"
      >
        <template #columns>
          <slot name="table-columns"></slot>
        </template>
        <template #operations="{ row, index }">
          <slot name="table-operations" :row="row" :index="index"></slot>
        </template>
      </CommonDataTable>
    </el-card>

    <!-- 编辑对话框 -->
    <CommonDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      :width="dialogWidth"
      :form-model="dialogFormData"
      :form-rules="dialogFormRules"
      :submit-text="dialogSubmitText"
      @submit="handleDialogSubmit"
      @cancel="handleDialogCancel"
    >
      <template #form="{ formData, formRef }">
        <slot 
          name="dialog-form" 
          :formData="formData" 
          :formRef="formRef"
          :mode="dialogMode"
        ></slot>
      </template>
    </CommonDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import CommonSearchForm from '@/components/CommonSearchForm.vue';
import CommonDataTable from '@/components/CommonDataTable.vue';
import CommonDialog from '@/components/CommonDialog.vue';

interface Props {
  // 搜索相关
  initialSearchData?: Record<string, any>;
  showSearch?: boolean;
  
  // 操作按钮相关
  showCreateButton?: boolean;
  createButtonText?: string;
  
  // 表格相关
  showSelection?: boolean;
  showOperations?: boolean;
  pageSizes?: number[];
  
  // 对话框相关
  dialogWidth?: string;
  dialogFormRules?: Record<string, any>;
  
  // API相关
  apiLoad?: (params: any) => Promise<any>;
  apiCreate?: (data: any) => Promise<any>;
  apiUpdate?: (id: number, data: any) => Promise<any>;
  apiDelete?: (id: number) => Promise<any>;
}

const props = withDefaults(defineProps<Props>(), {
  initialSearchData: () => ({}),
  showSearch: true,
  showCreateButton: true,
  createButtonText: '新增',
  showSelection: true,
  showOperations: true,
  pageSizes: () => [10, 20, 50, 100],
  dialogWidth: '50%'
});

// 状态管理
const tableData = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(10);
const selectedRows = ref<any[]>([]);

// 对话框状态
const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create'); // 'create' 或 'edit'
const dialogTitle = ref('');
const dialogSubmitText = ref('提交');
const dialogFormData = ref<Record<string, any>>({});

// 搜索参数
const searchParams = ref<Record<string, any>>({ ...props.initialSearchData });

// 默认加载数据
const loadData = async () => {
  if (!props.apiLoad) return;
  
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      page_size: pageSize.value,
      ...searchParams.value
    };
    
    const response = await props.apiLoad(params);
    
    // 假设API返回格式为 { data: { items: [], total: 100 } }
    tableData.value = response.data?.items || response.data || [];
    total.value = response.data?.total || response.total || tableData.value.length;
  } catch (error) {
    console.error('Failed to load data:', error);
  } finally {
    loading.value = false;
  }
};

// 搜索处理
const handleSearch = (params: Record<string, any>) => {
  searchParams.value = { ...params };
  currentPage.value = 1; // 搜索时回到第一页
  loadData();
};

// 重置搜索
const handleReset = (params: Record<string, any>) => {
  searchParams.value = { ...params };
  currentPage.value = 1;
  loadData();
};

// 分页处理
const handleCurrentChange = (page: number) => {
  currentPage.value = page;
  loadData();
};

const handleSizeChange = (size: number) => {
  pageSize.value = size;
  currentPage.value = 1; // 改变页大小时回到第一页
  loadData();
};

// 表格选择处理
const handleSelectionChange = (selection: any[]) => {
  selectedRows.value = selection;
};

// 创建操作
const handleCreate = () => {
  dialogMode.value = 'create';
  dialogTitle.value = '新增';
  dialogSubmitText.value = '提交';
  dialogFormData.value = {}; // 重置表单数据
  dialogVisible.value = true;
};

// 编辑操作
const handleEdit = (row: any) => {
  dialogMode.value = 'edit';
  dialogTitle.value = '编辑';
  dialogSubmitText.value = '更新';
  dialogFormData.value = { ...row }; // 设置表单数据为当前行数据
  dialogVisible.value = true;
};

// 删除操作
const handleDelete = async (row: any) => {
  if (!props.apiDelete) return;
  
  try {
    await props.apiDelete(row.id);
    // 删除成功后重新加载数据
    await loadData();
  } catch (error) {
    console.error('Failed to delete:', error);
  }
};

// 对话框提交
const handleDialogSubmit = async (formData: Record<string, any>, formRef: any) => {
  if (dialogMode.value === 'create' && props.apiCreate) {
    // 创建操作
    try {
      await props.apiCreate(formData);
      dialogVisible.value = false;
      await loadData(); // 重新加载数据
    } catch (error) {
      console.error('Failed to create:', error);
    }
  } else if (dialogMode.value === 'edit' && props.apiUpdate && formData.id) {
    // 更新操作
    try {
      await props.apiUpdate(formData.id, formData);
      dialogVisible.value = false;
      await loadData(); // 重新加载数据
    } catch (error) {
      console.error('Failed to update:', error);
    }
  }
};

// 对话框取消
const handleDialogCancel = () => {
  dialogVisible.value = false;
};

// 监听页码和页大小变化
watch([currentPage, pageSize], () => {
  loadData();
});

// 初始化加载数据
onMounted(() => {
  loadData();
});

// 暴露方法给父组件
defineExpose({
  loadData,
  handleCreate,
  handleEdit,
  handleDelete,
  tableData,
  selectedRows
});
</script>

<style scoped>
.common-list-page {
  padding: 20px;
}

.search-card {
  margin-bottom: 20px;
}

.operation-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 0 10px;
}

.left-actions,
.right-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.table-card {
  min-height: 600px;
}
</style>