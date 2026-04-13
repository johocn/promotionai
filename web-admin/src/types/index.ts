// 全局类型定义

// 分页参数
export interface PaginationParams {
  page?: number;
  page_size?: number;
}

// 分页响应
export interface PaginationResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// 响应数据结构
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

// 通用状态类型
export type Status = 'active' | 'inactive' | 'pending' | 'processing' | 'completed' | 'failed' | 'banned';

// 数据源类型
export interface DataSource {
  id: number;
  name: string;
  type: 'rss' | 'api' | 'crawler' | 'social';
  url: string;
  description?: string;
  status: Status;
  frequency: number;
  createdAt: string;
  updatedAt: string;
}

// 采集任务类型
export interface CollectionTask {
  id: number;
  name: string;
  sourceId: number;
  sourceName: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  priority: 'high' | 'medium' | 'low';
  progress: number;
  totalItems: number;
  collectedItems: number;
  rule: string;
  startTime?: string;
  endTime?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

// 生成内容类型
export interface GeneratedContent {
  id: number;
  topic: string;
  keywords: string;
  contentType: 'news' | 'blog' | 'product' | 'ad';
  languageStyle: 'formal' | 'casual' | 'humorous' | 'professional';
  audience: 'general' | 'professional' | 'student' | 'business' | 'developer';
  length: number;
  requirements: string;
  content: string;
  status: 'processing' | 'completed' | 'failed' | 'approved' | 'rejected';
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  approvedAt?: string;
  reviewer?: string;
}

// 发布账号类型
export interface PublishAccount {
  id: number;
  name: string;
  platform: 'weibo' | 'wechat' | 'douyin' | 'kuaishou' | 'xiaohongshu' | 'zhihu' | 'bilibili' | 'toutiao';
  account: string;
  fansCount: number;
  status: Status;
  authStatus: 'unverified' | 'personal_verified' | 'organization_verified';
  description?: string;
  apiConfig?: string;
  lastPublishTime?: string;
  createdAt: string;
  updatedAt: string;
}

// 发布任务类型
export interface PublishTask {
  id: number;
  title: string;
  accountId: number;
  contentId: number;
  status: Status;
  priority: 'high' | 'medium' | 'low';
  scheduledTime?: string;
  tags?: string;
  description?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 发布记录类型
export interface PublishRecord {
  id: number;
  taskId: number;
  accountId: number;
  contentId: number;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  publishTime?: string;
  stats?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  };
  createdAt: string;
  updatedAt: string;
}

// 追踪链接类型
export interface TrackingLink {
  id: number;
  name: string;
  originalUrl: string;
  trackingParams?: string;
  shortUrl?: string;
  status: Status;
  description?: string;
  clicks?: number;
  conversions?: number;
  createdAt: string;
  updatedAt: string;
}

// 敏感词类型
export interface SensitiveWord {
  id: number;
  word: string;
  category: string;
  description?: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

// 审核记录类型
export interface ReviewRecord {
  id: number;
  contentId: number;
  contentTitle?: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  comment?: string;
  reviewer?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 用户类型
export interface User {
  id: number;
  username: string;
  email: string;
  phone?: string;
  roleId: number;
  roleName?: string;
  status: Status;
  department?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// 角色类型
export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

// 系统设置类型
export interface SystemSettings {
  siteName: string;
  siteDescription?: string;
  logoUrl?: string;
  theme?: string;
  timezone?: string;
  language?: string;
  notificationSettings?: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    pushNotifications?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}