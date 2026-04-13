import { request } from './request'
import { PublishAccount, PublishTask, PublishRecord, PaginationParams, PaginationResponse } from '@/types'

// 获取账号列表
export const getAccounts = (params?: { name?: string; platform?: string; status?: string } & PaginationParams) => {
  return request.get<PaginationResponse<PublishAccount>>('/publisher/accounts', params)
}

// 添加账号
export const addAccount = (data: Omit<PublishAccount, 'id' | 'createdAt' | 'updatedAt' | 'lastPublishTime'>) => {
  return request.post<PublishAccount>('/publisher/accounts', data)
}

// 更新账号
export const updateAccount = (id: number, data: Partial<Omit<PublishAccount, 'id' | 'createdAt' | 'updatedAt' | 'lastPublishTime'>>) => {
  return request.put<PublishAccount>(`/publisher/accounts/${id}`, data)
}

// 删除账号
export const deleteAccount = (id: number) => {
  return request.delete(`/publisher/accounts/${id}`)
}

// 更新账号状态
export const updateAccountStatus = (id: number, status: string) => {
  return request.put<PublishAccount>(`/publisher/accounts/${id}/status`, { status })
}

// 获取发布任务列表
export const getTasks = (params?: { title?: string; status?: string; priority?: string } & PaginationParams) => {
  return request.get<PaginationResponse<PublishTask>>('/publisher/tasks', params)
}

// 添加发布任务
export const addTask = (data: Omit<PublishTask, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt'>) => {
  return request.post<PublishTask>('/publisher/tasks', data)
}

// 更新发布任务
export const updateTask = (id: number, data: Partial<Omit<PublishTask, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt'>>) => {
  return request.put<PublishTask>(`/publisher/tasks/${id}`, data)
}

// 删除发布任务
export const deleteTask = (id: number) => {
  return request.delete(`/publisher/tasks/${id}`)
}

// 更新任务状态
export const updateTaskStatus = (id: number, status: string) => {
  return request.put<PublishTask>(`/publisher/tasks/${id}/status`, { status })
}

// 获取发布记录列表
export const getRecords = (params?: { taskId?: number; status?: string } & PaginationParams) => {
  return request.get<PaginationResponse<PublishRecord>>('/publisher/records', params)
}

// 获取单个发布记录详情
export const getRecordDetail = (id: number) => {
  return request.get<PublishRecord>(`/publisher/records/${id}`)
}

// 重新发布
export const republish = (id: number) => {
  return request.put<PublishRecord>(`/publisher/records/${id}/republish`)
}

// 获取发布统计数据
export const getPublishStats = () => {
  return request.get('/publisher/stats')
}