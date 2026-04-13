<template>
  <el-dialog 
    v-model="visible" 
    :title="title" 
    :width="width"
    :top="top"
    @closed="handleClosed"
    @opened="handleOpened"
  >
    <el-form 
      ref="formRef" 
      :model="formData" 
      :rules="formRules" 
      :label-width="labelWidth"
      :inline="inline"
      :size="size"
    >
      <slot name="form" :formData="formData" :formRef="formRef"></slot>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ submitText }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';

interface FormRule {
  required?: boolean;
  message?: string;
  trigger?: string | string[];
  validator?: (rule: any, value: any, callback: (error?: Error) => void) => void;
}

interface Props {
  modelValue: boolean;
  title: string;
  width?: string;
  top?: string;
  labelWidth?: string;
  inline?: boolean;
  size?: 'large' | 'default' | 'small';
  submitText?: string;
  validateBeforeSubmit?: boolean;
  formModel?: Record<string, any>;
  formRules?: Record<string, FormRule | FormRule[]>;
}

const props = withDefaults(defineProps<Props>(), {
  width: '50%',
  top: '15vh',
  labelWidth: '100px',
  inline: false,
  size: 'default',
  submitText: '提交',
  validateBeforeSubmit: true,
  formModel: () => ({}),
  formRules: () => ({})
});

const emit = defineEmits(['update:modelValue', 'submit', 'cancel', 'opened', 'closed']);

const formRef = ref();
const submitting = ref(false);

// 控制对话框显隐
const visible = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emit('update:modelValue', value);
  }
});

// 表单数据
const formData = ref<Record<string, any>>({ ...props.formModel });

// 监听外部表单数据变化
watch(() => props.formModel, (newVal) => {
  formData.value = { ...newVal };
}, { deep: true });

// 处理取消
const handleCancel = () => {
  emit('cancel');
  visible.value = false;
};

// 处理提交
const handleSubmit = async () => {
  if (props.validateBeforeSubmit && formRef.value) {
    try {
      await formRef.value.validate();
    } catch (error) {
      ElMessage.error('表单验证失败');
      return;
    }
  }

  submitting.value = true;
  try {
    emit('submit', formData.value, formRef.value);
  } catch (error) {
    console.error('Submit error:', error);
  } finally {
    submitting.value = false;
  }
};

// 对话框打开事件
const handleOpened = () => {
  emit('opened');
};

// 对话框关闭事件
const handleClosed = () => {
  // 关闭时重置表单验证
  if (formRef.value) {
    formRef.value.clearValidate();
  }
  emit('closed');
};

// 暴露方法给父组件
defineExpose({
  formRef,
  formData,
  submitting,
  handleCancel,
  handleSubmit
});
</script>

<style scoped>
.dialog-footer {
  text-align: right;
}
</style>