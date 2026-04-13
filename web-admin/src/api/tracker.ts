import { request } from './request'

// 获取追踪链接列表
export const getLinks = (params?: { page?: number; page_size?: number; name?: string; status?: string }) => {
  return request.get('/tracker/links', params)
}

// 添加追踪链接
export const addLink = (data: { 
  name: string; 
  originalUrl: string; 
  trackingParams?: string; 
  status?: string; 
  description?: string 
}) => {
  return request.post('/tracker/links', data)
}

// 更新追踪链接
export const updateLink = (id: number, data: { 
  name?: string; 
  originalUrl?: string; 
  trackingParams?: string; 
  status?: string; 
  description?: string 
}) => {
  return request.put(`/tracker/links/${id}`, data)
}

// 删除追踪链接
export const deleteLink = (id: number) => {
  return request.delete(`/tracker/links/${id}`)
}

// 获取链接统计数据
export const getLinkStats = (id: number, params?: { startDate?: string; endDate?: string }) => {
  return request.get(`/tracker/links/${id}/stats`, params)
}

// 获取总体统计数据
export const getOverallStats = (params?: { startDate?: string; endDate?: string }) => {
  return request.get('/tracker/stats', params)
}

// 获取转化分析数据
export const getConversionData = (params?: { startDate?: string; endDate?: string }) => {
  return request.get('/tracker/conversion', params)
}

// 获取报表数据
export const getReportData = (params: { type: string; startDate: string; endDate: string }) => {
  return request.get('/tracker/reports', params)
}