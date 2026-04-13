import { request } from './request'
import { GeneratedContent, PaginationParams, PaginationResponse } from '@/types'

// 生成 AI 内容
export const generateContent = (data: Omit<GeneratedContent, 'id' | 'status' | 'createdAt' | 'completedAt' | 'approvedAt' | 'reviewer'>) => {
  return request.post<GeneratedContent>('/ai-processor/generate', data)
}

// 获取 AI 生成内容列表
export const getContentList = (params?: { status?: string; topic?: string } & PaginationParams) => {
  return request.get<PaginationResponse<GeneratedContent>>('/ai-processor/content', params)
}

// 提交质量反馈
export const submitFeedback = (data: { contentId: number; score: number; comment?: string }) => {
  return request.post('/ai-processor/feedback', data)
}

// 获取统计信息
export const getStats = () => {
  return request.get('/ai-processor/stats')
}

// 获取单个内容详情
export const getContentDetail = (id: number) => {
  return request.get<GeneratedContent>(`/ai-processor/content/${id}`)
}

// 更新内容
export const updateContent = (id: number, data: Partial<Omit<GeneratedContent, 'id' | 'createdAt' | 'completedAt' | 'approvedAt' | 'reviewer'>>) => {
  return request.put<GeneratedContent>(`/ai-processor/content/${id}`, data)
}

// 删除内容
export const deleteContent = (id: number) => {
  return request.delete(`/ai-processor/content/${id}`)
}

// 批准内容
export const approveContent = (id: number) => {
  return request.put<GeneratedContent>(`/ai-processor/content/${id}/approve`)
}

// 提交内容进行人工审核
export const submitForReview = (id: number) => {
  return request.put<GeneratedContent>(`/ai-processor/content/${id}/review`)
}

// 获取待审核内容列表
export const getPendingReviews = (params?: PaginationParams) => {
  return request.get<PaginationResponse<GeneratedContent>>('/ai-processor/review/pending', params)
}

// 审核内容
export const reviewContent = (id: number, data: { status: 'approved' | 'rejected'; comment?: string }) => {
  return request.put<GeneratedContent>(`/ai-processor/review/${id}`, data)
}

// 获取质量评估列表
export const getQualityList = (params?: PaginationParams) => {
  return request.get('/ai-processor/quality', params)
}

// 提交质量评估
export const submitQualityAssessment = (data: { contentId: number; metrics: Record<string, number>; overallScore: number; feedback?: string }) => {
  return request.post('/ai-processor/quality', data)
}
