<template>
  <div class="not-found">
    <div class="not-found-content">
      <h1 class="error-code">404</h1>
      <p class="error-message">页面不存在</p>
      <p class="error-description">抱歉，您访问的页面不存在或已被删除</p>
      <el-button type="primary" @click="goHome">返回首页</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

<style lang="scss" scoped>
.not-found {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $bg-color;

  .not-found-content {
    text-align: center;

    .error-code {
      font-size: 120px;
      font-weight: bold;
      color: $primary-color;
      margin: 0;
      line-height: 1;
    }

    .error-message {
      font-size: 24px;
      color: $text-color-primary;
      margin: 20px 0 10px;
    }

    .error-description {
      color: $text-color-secondary;
      margin-bottom: 30px;
    }
  }
}
</style>
