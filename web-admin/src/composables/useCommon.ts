import { ref, computed, reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

/**
 * 表单验证组合式函数
 */
export const useFormValidation = (formRef: any) => {
  const validate = async () => {
    if (!formRef.value) {
      throw new Error('Form reference is not available');
    }
    
    try {
      await formRef.value.validate();
      return true;
    } catch (error) {
      console.error('Form validation failed:', error);
      return false;
    }
  };

  const validateField = async (prop: string) => {
    if (!formRef.value) {
      throw new Error('Form reference is not available');
    }
    
    try {
      await formRef.value.validateField(prop);
      return true;
    } catch (error) {
      console.error(`Field validation failed for ${prop}:`, error);
      return false;
    }
  };

  const clearValidate = () => {
    if (formRef.value) {
      formRef.value.clearValidate();
    }
  };

  const resetFields = () => {
    if (formRef.value) {
      formRef.value.resetFields();
    }
  };

  return {
    validate,
    validateField,
    clearValidate,
    resetFields
  };
};

/**
 * 分页管理组合式函数
 */
export const usePagination = (initialPage: number = 1, initialPageSize: number = 10) => {
  const currentPage = ref(initialPage);
  const pageSize = ref(initialPageSize);
  const total = ref(0);

  const paginationParams = computed(() => ({
    page: currentPage.value,
    page_size: pageSize.value
  }));

  const handleCurrentChange = (page: number) => {
    currentPage.value = page;
  };

  const handleSizeChange = (size: number) => {
    pageSize.value = size;
    // 如果当前页的数据量不足以填满新页面大小，可能需要回到第一页
    if ((currentPage.value - 1) * size >= total.value) {
      currentPage.value = 1;
    }
  };

  const resetPagination = () => {
    currentPage.value = initialPage;
    pageSize.value = initialPageSize;
  };

  return {
    currentPage,
    pageSize,
    total,
    paginationParams,
    handleCurrentChange,
    handleSizeChange,
    resetPagination
  };
};

/**
 * 数据加载组合式函数
 */
export const useDataLoad = <T>() => {
  const data = ref<T[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const loadData = async (loader: () => Promise<T[] | { items: T[], total: number }>, onError?: (err: any) => void) => {
    loading.value = true;
    error.value = null;

    try {
      const result = await loader();
      
      if (Array.isArray(result)) {
        data.value = result;
      } else {
        // 如果返回的是分页数据格式
        data.value = result.items || [];
      }
    } catch (err: any) {
      error.value = err.message || '数据加载失败';
      console.error('Data loading error:', err);
      
      if (onError) {
        onError(err);
      } else {
        ElMessage.error(error.value);
      }
    } finally {
      loading.value = false;
    }
  };

  const addItem = (item: T) => {
    data.value.unshift(item);
  };

  const updateItem = (id: any, updatedItem: Partial<T>) => {
    const index = data.value.findIndex((item: any) => item.id === id);
    if (index !== -1) {
      data.value[index] = { ...data.value[index], ...updatedItem };
    }
  };

  const removeItem = (id: any) => {
    const index = data.value.findIndex((item: any) => item.id === id);
    if (index !== -1) {
      data.value.splice(index, 1);
    }
  };

  return {
    data,
    loading,
    error,
    loadData,
    addItem,
    updateItem,
    removeItem
  };
};

/**
 * 对话框管理组合式函数
 */
export const useDialog = () => {
  const visible = ref(false);

  const open = () => {
    visible.value = true;
  };

  const close = () => {
    visible.value = false;
  };

  const toggle = () => {
    visible.value = !visible.value;
  };

  return {
    visible,
    open,
    close,
    toggle
  };
};

/**
 * 搜索功能组合式函数
 */
export const useSearch = <T>(data: T[], searchFields: string[]) => {
  const searchQuery = ref('');

  const filteredData = computed(() => {
    if (!searchQuery.value.trim()) {
      return data;
    }

    const query = searchQuery.value.toLowerCase();
    return data.filter(item => {
      return searchFields.some(field => {
        const fieldValue = getNestedValue(item, field);
        return fieldValue && String(fieldValue).toLowerCase().includes(query);
      });
    });
  });

  // 辅助函数：获取嵌套对象的值
  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  const setSearchQuery = (query: string) => {
    searchQuery.value = query;
  };

  const clearSearch = () => {
    searchQuery.value = '';
  };

  return {
    searchQuery,
    filteredData,
    setSearchQuery,
    clearSearch
  };
};

/**
 * 确认操作组合式函数
 */
export const useConfirm = () => {
  const confirm = async (
    message: string = '确定要执行此操作吗？',
    title: string = '提示',
    confirmButtonText: string = '确定',
    cancelButtonText: string = '取消',
    type: 'info' | 'warning' | 'success' | 'error' = 'warning'
  ) => {
    try {
      await ElMessageBox.confirm(
        message,
        title,
        {
          confirmButtonText,
          cancelButtonText,
          type
        }
      );
      return true;
    } catch (error) {
      // 用户取消操作
      return false;
    }
  };

  return {
    confirm
  };
};

/**
 * 表格选择组合式函数
 */
export const useTableSelection = <T>() => {
  const selectedRows = ref<T[]>([]);

  const handleSelectionChange = (selection: T[]) => {
    selectedRows.value = selection;
  };

  const clearSelection = () => {
    selectedRows.value = [];
  };

  const selectAll = (data: T[]) => {
    selectedRows.value = [...data];
  };

  const toggleRowSelection = (row: T, selected?: boolean) => {
    const index = selectedRows.value.findIndex(item => 
      (item as any).id === (row as any).id
    );
    
    if (selected === undefined) {
      // 切换选择状态
      if (index >= 0) {
        selectedRows.value.splice(index, 1);
      } else {
        selectedRows.value.push(row);
      }
    } else if (selected) {
      // 添加选择
      if (index < 0) {
        selectedRows.value.push(row);
      }
    } else {
      // 移除选择
      if (index >= 0) {
        selectedRows.value.splice(index, 1);
      }
    }
  };

  return {
    selectedRows,
    handleSelectionChange,
    clearSelection,
    selectAll,
    toggleRowSelection
  };
};