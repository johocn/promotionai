<template>
  <!-- 系统配置页面 -->
  <div class="settings-container">
    <el-card class="card-container">
      <template #header>
        <div class="card-header">
          <span>系统配置</span>
          <el-button type="primary" @click="handleSave">保存配置</el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab" class="settings-tabs">
        <!-- 基础配置 -->
        <el-tab-pane label="基础配置" name="basic">
          <el-form 
            ref="basicFormRef" 
            :model="basicConfig" 
            :rules="basicRules" 
            label-width="150px"
            style="max-width: 800px;"
          >
            <el-form-item label="系统名称" prop="systemName">
              <el-input 
                v-model="basicConfig.systemName" 
                placeholder="请输入系统名称"
                maxlength="50"
                show-word-limit
              />
            </el-form-item>
            
            <el-form-item label="系统描述">
              <el-input 
                v-model="basicConfig.systemDescription" 
                type="textarea"
                :rows="3"
                placeholder="请输入系统描述"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>
            
            <el-form-item label="Logo地址">
              <el-input 
                v-model="basicConfig.logoUrl" 
                placeholder="请输入Logo图片地址"
              />
              <div v-if="basicConfig.logoUrl" class="logo-preview">
                <img :src="basicConfig.logoUrl" alt="Logo预览" style="max-width: 100px; max-height: 50px;" />
              </div>
            </el-form-item>
            
            <el-form-item label="版权信息">
              <el-input 
                v-model="basicConfig.copyright" 
                placeholder="请输入版权信息"
                maxlength="100"
                show-word-limit
              />
            </el-form-item>
            
            <el-form-item label="备案号">
              <el-input 
                v-model="basicConfig.beian" 
                placeholder="请输入备案号"
                maxlength="50"
                show-word-limit
              />
            </el-form-item>
            
            <el-form-item label="系统版本">
              <el-input 
                v-model="basicConfig.version" 
                placeholder="请输入系统版本"
                maxlength="20"
                show-word-limit
              />
            </el-form-item>
            
            <el-form-item label="维护模式">
              <el-switch
                v-model="basicConfig.maintenanceMode"
                active-text="开启"
                inactive-text="关闭"
              />
              <div class="form-help">开启后只有管理员可以访问系统</div>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 安全配置 -->
        <el-tab-pane label="安全配置" name="security">
          <el-form 
            ref="securityFormRef" 
            :model="securityConfig" 
            label-width="150px"
            style="max-width: 800px;"
          >
            <el-form-item label="密码最小长度">
              <el-input-number 
                v-model="securityConfig.minPasswordLength" 
                :min="6" 
                :max="20"
                controls-position="right"
              />
              <div class="form-help">密码最小长度要求</div>
            </el-form-item>
            
            <el-form-item label="密码复杂度">
              <el-checkbox-group v-model="securityConfig.passwordComplexity">
                <el-checkbox label="uppercase">大写字母</el-checkbox>
                <el-checkbox label="lowercase">小写字母</el-checkbox>
                <el-checkbox label="numbers">数字</el-checkbox>
                <el-checkbox label="symbols">特殊符号</el-checkbox>
              </el-checkbox-group>
              <div class="form-help">密码必须包含所选的字符类型</div>
            </el-form-item>
            
            <el-form-item label="登录失败锁定">
              <el-switch
                v-model="securityConfig.loginFailureLock"
                active-text="开启"
                inactive-text="关闭"
              />
              <div class="form-help">开启后登录失败会锁定账户</div>
            </el-form-item>
            
            <el-form-item 
              label="失败次数阈值" 
              v-show="securityConfig.loginFailureLock"
            >
              <el-input-number 
                v-model="securityConfig.loginFailureThreshold" 
                :min="3" 
                :max="10"
                controls-position="right"
              />
              <div class="form-help">连续登录失败多少次后锁定</div>
            </el-form-item>
            
            <el-form-item 
              label="锁定时间(分钟)" 
              v-show="securityConfig.loginFailureLock"
            >
              <el-input-number 
                v-model="securityConfig.lockTime" 
                :min="1" 
                :max="1440"
                controls-position="right"
              />
              <div class="form-help">账户锁定的时间长度</div>
            </el-form-item>
            
            <el-form-item label="会话超时时间">
              <el-input-number 
                v-model="securityConfig.sessionTimeout" 
                :min="10" 
                :max="1440"
                controls-position="right"
              />
              <div class="form-help">用户无操作后自动退出的时间(分钟)</div>
            </el-form-item>
            
            <el-form-item label="双因素认证">
              <el-switch
                v-model="securityConfig.twoFactorAuth"
                active-text="开启"
                inactive-text="关闭"
              />
              <div class="form-help">强制用户启用双因素认证</div>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 邮件配置 -->
        <el-tab-pane label="邮件配置" name="email">
          <el-form 
            ref="emailFormRef" 
            :model="emailConfig" 
            label-width="150px"
            style="max-width: 800px;"
          >
            <el-form-item label="SMTP服务器">
              <el-input 
                v-model="emailConfig.smtpServer" 
                placeholder="请输入SMTP服务器地址"
              />
            </el-form-item>
            
            <el-form-item label="SMTP端口">
              <el-input-number 
                v-model="emailConfig.smtpPort" 
                :min="1" 
                :max="65535"
                controls-position="right"
              />
            </el-form-item>
            
            <el-form-item label="加密方式">
              <el-select v-model="emailConfig.encryption" placeholder="请选择加密方式">
                <el-option label="None" value="none" />
                <el-option label="SSL" value="ssl" />
                <el-option label="TLS" value="tls" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="发件人邮箱">
              <el-input 
                v-model="emailConfig.senderEmail" 
                placeholder="请输入发件人邮箱"
              />
            </el-form-item>
            
            <el-form-item label="发件人名称">
              <el-input 
                v-model="emailConfig.senderName" 
                placeholder="请输入发件人名称"
              />
            </el-form-item>
            
            <el-form-item label="用户名">
              <el-input 
                v-model="emailConfig.username" 
                placeholder="请输入用户名"
              />
            </el-form-item>
            
            <el-form-item label="密码">
              <el-input 
                v-model="emailConfig.password" 
                type="password"
                placeholder="请输入密码"
                show-password
              />
              <div class="form-help">建议使用应用专用密码</div>
            </el-form-item>
            
            <el-form-item label="测试邮件">
              <el-button type="primary" @click="handleTestEmail">测试邮件</el-button>
              <div class="form-help">保存配置后可以测试邮件发送</div>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 内容配置 -->
        <el-tab-pane label="内容配置" name="content">
          <el-form 
            ref="contentFormRef" 
            :model="contentConfig" 
            label-width="150px"
            style="max-width: 800px;"
          >
            <el-form-item label="内容审核">
              <el-switch
                v-model="contentConfig.enableAudit"
                active-text="开启"
                inactive-text="关闭"
              />
              <div class="form-help">开启后所有内容都需要审核</div>
            </el-form-item>
            
            <el-form-item label="自动审核">
              <el-switch
                v-model="contentConfig.autoAudit"
                active-text="开启"
                inactive-text="关闭"
              />
              <div class="form-help">开启后使用AI自动审核内容</div>
            </el-form-item>
            
            <el-form-item 
              label="AI审核阈值" 
              v-show="contentConfig.autoAudit"
            >
              <el-slider 
                v-model="contentConfig.aiAuditThreshold" 
                :min="0" 
                :max="100"
                show-input
              />
              <div class="form-help">AI审核分数超过此阈值需要人工复核</div>
            </el-form-item>
            
            <el-form-item label="内容保留天数">
              <el-input-number 
                v-model="contentConfig.contentRetentionDays" 
                :min="1" 
                :max="3650"
                controls-position="right"
              />
              <div class="form-help">内容在系统中保留的天数</div>
            </el-form-item>
            
            <el-form-item label="敏感词过滤">
              <el-switch
                v-model="contentConfig.sensitiveWordFilter"
                active-text="开启"
                inactive-text="关闭"
              />
              <div class="form-help">开启后自动过滤敏感词汇</div>
            </el-form-item>
            
            <el-form-item label="内容标签">
              <el-select 
                v-model="contentConfig.defaultLabels" 
                multiple
                placeholder="请选择默认内容标签"
                style="width: 100%"
              >
                <el-option label="热门" value="hot" />
                <el-option label="推荐" value="recommended" />
                <el-option label="精选" value="featured" />
                <el-option label="最新" value="latest" />
              </el-select>
              <div class="form-help">默认的内容标签</div>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 性能配置 -->
        <el-tab-pane label="性能配置" name="performance">
          <el-form 
            ref="performanceFormRef" 
            :model="performanceConfig" 
            label-width="150px"
            style="max-width: 800px;"
          >
            <el-form-item label="缓存启用">
              <el-switch
                v-model="performanceConfig.enableCache"
                active-text="开启"
                inactive-text="关闭"
              />
              <div class="form-help">开启系统缓存提高性能</div>
            </el-form-item>
            
            <el-form-item 
              label="缓存时间(秒)" 
              v-show="performanceConfig.enableCache"
            >
              <el-input-number 
                v-model="performanceConfig.cacheTime" 
                :min="60" 
                :max="86400"
                controls-position="right"
              />
              <div class="form-help">缓存数据的有效时间</div>
            </el-form-item>
            
            <el-form-item label="数据库连接池">
              <el-input-number 
                v-model="performanceConfig.dbPoolSize" 
                :min="5" 
                :max="100"
                controls-position="right"
              />
              <div class="form-help">数据库连接池大小</div>
            </el-form-item>
            
            <el-form-item label="最大并发数">
              <el-input-number 
                v-model="performanceConfig.maxConcurrency" 
                :min="1" 
                :max="1000"
                controls-position="right"
              />
              <div class="form-help">系统最大并发处理数</div>
            </el-form-item>
            
            <el-form-item label="文件上传大小限制(MB)">
              <el-input-number 
                v-model="performanceConfig.uploadSizeLimit" 
                :min="1" 
                :max="1024"
                controls-position="right"
              />
              <div class="form-help">单个文件上传的最大大小</div>
            </el-form-item>
            
            <el-form-item label="CDN加速">
              <el-switch
                v-model="performanceConfig.cdnEnabled"
                active-text="开启"
                inactive-text="关闭"
              />
              <div class="form-help">开启静态资源CDN加速</div>
            </el-form-item>
            
            <el-form-item 
              label="CDN域名" 
              v-show="performanceConfig.cdnEnabled"
            >
              <el-input 
                v-model="performanceConfig.cdnDomain" 
                placeholder="请输入CDN域名"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

// 激活的标签页
const activeTab = ref('basic');

// 基础配置
const basicConfig = reactive({
  systemName: 'PromotionAI 管理系统',
  systemDescription: '智能内容推广管理系统',
  logoUrl: '/logo.png',
  copyright: '© 2024 PromotionAI. All rights reserved.',
  beian: '京ICP备12345678号',
  version: '1.0.0',
  maintenanceMode: false
});

// 安全配置
const securityConfig = reactive({
  minPasswordLength: 8,
  passwordComplexity: ['uppercase', 'lowercase', 'numbers'],
  loginFailureLock: true,
  loginFailureThreshold: 5,
  lockTime: 30,
  sessionTimeout: 120,
  twoFactorAuth: false
});

// 邮件配置
const emailConfig = reactive({
  smtpServer: 'smtp.example.com',
  smtpPort: 587,
  encryption: 'tls',
  senderEmail: 'noreply@example.com',
  senderName: 'PromotionAI',
  username: 'noreply@example.com',
  password: ''
});

// 内容配置
const contentConfig = reactive({
  enableAudit: true,
  autoAudit: true,
  aiAuditThreshold: 70,
  contentRetentionDays: 365,
  sensitiveWordFilter: true,
  defaultLabels: ['hot', 'recommended']
});

// 性能配置
const performanceConfig = reactive({
  enableCache: true,
  cacheTime: 3600,
  dbPoolSize: 20,
  maxConcurrency: 100,
  uploadSizeLimit: 10,
  cdnEnabled: false,
  cdnDomain: ''
});

// 基础配置验证规则
const basicRules = {
  systemName: [
    { required: true, message: '请输入系统名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ]
};

// 表单引用
const basicFormRef = ref();
const securityFormRef = ref();
const emailFormRef = ref();
const contentFormRef = ref();
const performanceFormRef = ref();

// 保存配置
const handleSave = async () => {
  try {
    // 验证当前激活的表单
    let valid = true;
    switch (activeTab.value) {
      case 'basic':
        if (basicFormRef.value) {
          await basicFormRef.value.validate().catch(() => {
            valid = false;
          });
        }
        break;
      case 'security':
        // 安全配置不需要验证
        break;
      case 'email':
        // 邮件配置不需要验证
        break;
      case 'content':
        // 内容配置不需要验证
        break;
      case 'performance':
        // 性能配置不需要验证
        break;
    }
    
    if (!valid) {
      ElMessage.error('请检查表单输入');
      return;
    }
    
    // 模拟保存配置
    console.log('Saving configuration:', {
      basic: basicConfig,
      security: securityConfig,
      email: emailConfig,
      content: contentConfig,
      performance: performanceConfig
    });
    
    // 实际项目中这里会调用API保存配置
    ElMessage.success('配置保存成功');
  } catch (error) {
    console.error('Save configuration error:', error);
    ElMessage.error('配置保存失败');
  }
};

// 测试邮件
const handleTestEmail = async () => {
  try {
    // 检查邮件配置是否完整
    if (!emailConfig.smtpServer || !emailConfig.senderEmail || !emailConfig.username || !emailConfig.password) {
      ElMessage.error('请先完善邮件配置信息');
      return;
    }
    
    await ElMessageBox.confirm(
      `确定要发送测试邮件到 ${emailConfig.senderEmail} 吗？`,
      '测试邮件',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    );
    
    // 模拟发送测试邮件
    console.log('Sending test email:', emailConfig);
    
    // 实际项目中这里会调用API发送测试邮件
    ElMessage.success('测试邮件已发送');
  } catch (error) {
    console.error('Test email error:', error);
  }
};

// 初始化配置
const initConfig = () => {
  // 这里可以从API获取当前系统配置
  // 模拟获取配置数据
  console.log('Initializing system configuration...');
};

// 初始化
onMounted(() => {
  initConfig();
});
</script>

<style scoped>
.settings-container {
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

.settings-tabs {
  margin-top: 20px;
}

.logo-preview {
  margin-top: 10px;
}

.form-help {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

:deep(.el-form-item__content) {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
</style>