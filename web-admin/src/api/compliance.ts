import { request } from './request'

// 获取敏感词库列表
export const getSensitiveWords = (params?: { page?: number; page_size?: number; keyword?: string; category?: string }) => {
  return request.get('/compliance/words', params)
}

// 添加敏感词
export const addSensitiveWord = (data: { 
  word: string; 
  category: string; 
  description?: string; 
  status?: string 
}) => {
  return request.post('/compliance/words', data)
}

// 更新敏感词
export const updateSensitiveWord = (id: number, data: { 
  word?: string; 
  category?: string; 
  description?: string; 
  status?: string 
}) => {
  return request.put(`/compliance/words/${id}`, data)
}

// 删除敏感词
export const deleteSensitiveWord = (id: number) => {
  return request.delete(`/compliance/words/${id}`)
}

// 获取待审核内容列表
export const getPendingReviews = (params?: { page?: number; page_size?: number; source?: string; priority?: string }) => {
  return request.get('/compliance/reviews/pending', params)
}

// 获取审核记录列表
export const getReviewHistory = (params?: { page?: number; page_size?: number; status?: string; reviewer?: string }) => {
  return request.get('/compliance/reviews/history', params)
}

// 提交审核结果
export const submitReview = (data: { 
  contentId: number; 
  status: 'approved' | 'rejected' | 'needs_revision'; 
  comment?: string; 
  reviewer?: string 
}) => {
  return request.post('/compliance/reviews', data)
}

// 获取审核统计数据
export const getReviewStats = () => {
  return request.get('/compliance/stats')
}