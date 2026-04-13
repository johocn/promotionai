<template>
  <div class="common-data-table">
    <el-table 
      :data="tableData" 
      v-loading="loading"
      stripe
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <el-table-column 
        v-if="showSelection" 
        type="selection" 
        width="55" 
      />
      
      <slot name="columns"></slot>
      
      <el-table-column 
        v-if="showOperations" 
        label="操作" 
        :fixed="operationFixed"
        :width="operationWidth"
      >
        <template #default="scope">
          <slot name="operations" :row="scope.row" :index="scope.$index"></slot>
        </template>
      </el-table-column>
    </el-table>
    
    <div class="pagination-container" v-if="showPagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="pageSizes"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  data?: any[];
  total?: number;
  loading?: boolean;
  showSelection?: boolean;
  showOperations?: boolean;
  showPagination?: boolean;
  operationFixed?: 'left' | 'right' | true | undefined;
  operationWidth?: number;
  pageSizes?: number[];
  initialPage?: number;
  initialPageSize?: number;
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  total: 0,
  loading: false,
  showSelection: false,
  showOperations: true,
  showPagination: true,
  operationFixed: 'right',
  operationWidth: 200,
  pageSizes: () => [10, 20, 50, 100],
  initialPage: 1,
  initialPageSize: 10
});

const emit = defineEmits(['update:page', 'selection-change', 'size-change', 'current-change']);

// 分页相关
const currentPage = ref(props.initialPage);
const pageSize = ref(props.initialPageSize);
const tableData = ref<any[]>(props.data);
const selectedRows = ref<any[]>([]);

// 监听外部数据变化
watch(() => props.data, (newData) => {
  tableData.value = [...newData];
}, { deep: true });

// 监听外部总数变化
watch(() => props.total, (newTotal) => {
  // 总数变化时，可能需要调整当前页码
  if (currentPage.value > 1 && props.total < (currentPage.value - 1) * pageSize.value + 1) {
    currentPage.value = 1;
  }
});

// 选择变化处理
const handleSelectionChange = (selection: any[]) => {
  selectedRows.value = selection;
  emit('selection-change', selection);
};

// 分页大小变化
const handleSizeChange = (size: number) => {
  pageSize.value = size;
  emit('size-change', size);
  emit('update:page', { page: currentPage.value, pageSize: size });
};

// 当前页变化
const handleCurrentChange = (page: number) => {
  currentPage.value = page;
  emit('current-change', page);
  emit('update:page', { page, pageSize: pageSize.value });
};

// 暴露方法给父组件
defineExpose({
  tableData,
  selectedRows,
  currentPage,
  pageSize
});
</script>

<style scoped>
.common-data-table {
  margin-top: 20px;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}
</style>