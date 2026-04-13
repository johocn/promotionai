import { request } from './request'
import { DataSource, CollectionTask, PaginationParams, PaginationResponse } from '@/types'

// 获取采集资讯列表
export const getNewsList = (params: { page?: number; page_size?: number }) => {
  return request.get<PaginationResponse<any>>('/collector/news', params)
}

// 手动触发采集
export const triggerCollect = (data: { sourceId?: number }) => {
  return request.post('/collector/collect', data)
}

// 获取数据源列表
export const getSources = (params?: { page?: number; page_size?: number; name?: string; type?: string } & PaginationParams) => {
  return request.get<PaginationResponse<DataSource>>('/collector/sources', params)
}

// 添加数据源
export const addSource = (data: Omit<DataSource, 'id' | 'createdAt' | 'updatedAt'>) => {
  return request.post<DataSource>('/collector/sources', data)
}

// 更新数据源
export const updateSource = (id: number, data: Partial<Omit<DataSource, 'id' | 'createdAt' | 'updatedAt'>>) => {
  return request.put<DataSource>(`/collector/sources/${id}`, data)
}

// 删除数据源
export const deleteSource = (id: number) => {
  return request.delete(`/collector/sources/${id}`)
}

// 更改数据源状态
export const updateSourceStatus = (id: number, status: string) => {
  return request.put<DataSource>(`/collector/sources/${id}/status`, { status })
}

// 获取采集任务列表
export const getTasks = (params?: { name?: string; status?: string; priority?: string } & PaginationParams) => {
  return request.get<PaginationResponse<CollectionTask>>('/collector/tasks', params)
}

// 添加采集任务
export const addTask = (data: Omit<CollectionTask, 'id' | 'createdAt' | 'updatedAt' | 'progress' | 'totalItems' | 'collectedItems'>) => {
  return request.post<CollectionTask>('/collector/tasks', data)
}

// 更新采集任务
export const updateTask = (id: number, data: Partial<Omit<CollectionTask, 'id' | 'createdAt' | 'updatedAt'>>) => {
  return request.put<CollectionTask>(`/collector/tasks/${id}`, data)
}

// 删除采集任务
export const deleteTask = (id: number) => {
  return request.delete(`/collector/tasks/${id}`)
}

// 启动/暂停采集任务
export const toggleTaskStatus = (id: number, status: string) => {
  return request.put<CollectionTask>(`/collector/tasks/${id}/status`, { status })
}

// 获取单个任务详情
export const getTaskDetail = (id: number) => {
  return request.get<CollectionTask>(`/collector/tasks/${id}`)
}
