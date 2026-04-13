import { request } from './request'

// 用户管理相关API
// 获取用户列表
export const getUsers = (params?: { page?: number; page_size?: number; username?: string; role?: string; status?: string }) => {
  return request.get('/system/users', params)
}

// 添加用户
export const addUser = (data: { 
  username: string; 
  email: string; 
  phone?: string; 
  roleId: number; 
  status?: string; 
  department?: string; 
  description?: string 
}) => {
  return request.post('/system/users', data)
}

// 更新用户
export const updateUser = (id: number, data: { 
  username?: string; 
  email?: string; 
  phone?: string; 
  roleId?: number; 
  status?: string; 
  department?: string; 
  description?: string 
}) => {
  return request.put(`/system/users/${id}`, data)
}

// 删除用户
export const deleteUser = (id: number) => {
  return request.delete(`/system/users/${id}`)
}

// 重置用户密码
export const resetUserPassword = (id: number) => {
  return request.put(`/system/users/${id}/reset-password`)
}

// 角色管理相关API
// 获取角色列表
export const getRoles = (params?: { page?: number; page_size?: number; name?: string }) => {
  return request.get('/system/roles', params)
}

// 添加角色
export const addRole = (data: { 
  name: string; 
  description?: string; 
  permissions?: string[] 
}) => {
  return request.post('/system/roles', data)
}

// 更新角色
export const updateRole = (id: number, data: { 
  name?: string; 
  description?: string; 
  permissions?: string[] 
}) => {
  return request.put(`/system/roles/${id}`, data)
}

// 删除角色
export const deleteRole = (id: number) => {
  return request.delete(`/system/roles/${id}`)
}

// 获取角色权限
export const getRolePermissions = (id: number) => {
  return request.get(`/system/roles/${id}/permissions`)
}

// 更新角色权限
export const updateRolePermissions = (id: number, permissions: string[]) => {
  return request.put(`/system/roles/${id}/permissions`, { permissions })
}

// 系统设置相关API
// 获取系统配置
export const getSystemSettings = () => {
  return request.get('/system/settings')
}

// 更新系统配置
export const updateSystemSettings = (settings: Record<string, any>) => {
  return request.put('/system/settings', settings)
}

// 获取系统统计信息
export const getSystemStats = () => {
  return request.get('/system/stats')
}

// 获取系统日志
export const getSystemLogs = (params?: { page?: number; page_size?: number; level?: string; startTime?: string; endTime?: string }) => {
  return request.get('/system/logs', params)
}