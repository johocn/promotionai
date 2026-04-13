<template>
  <div class="common-search-form">
    <el-form :model="searchForm" inline @submit.prevent>
      <slot :searchForm="searchForm" :handleSearch="handleSearch" :handleReset="handleReset"></slot>
      <el-form-item>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';

interface Props {
  initialFormData?: Record<string, any>;
}

const props = withDefaults(defineProps<Props>(), {
  initialFormData: () => ({})
});

const emit = defineEmits(['search', 'reset']);

const searchForm = reactive<Record<string, any>>({ ...props.initialFormData });

const handleSearch = () => {
  emit('search', { ...searchForm });
};

const handleReset = () => {
  // 重置表单数据
  Object.keys(searchForm).forEach(key => {
    searchForm[key] = props.initialFormData[key] || '';
  });
  emit('reset', { ...searchForm });
};

// 暴露方法给父组件
defineExpose({
  searchForm,
  handleSearch,
  handleReset
});
</script>

<style scoped>
.common-search-form {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 4px;
}
</style>