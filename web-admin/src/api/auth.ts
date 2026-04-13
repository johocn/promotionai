import { request } from './request'

// 登录
export const login = (data: { username: string; password: string }) => {
  return request.post('/auth/login', data)
}

// 获取用户信息
export const getUserInfo = () => {
  return request.get('/auth/userinfo')
}

// 退出登录
export const logout = () => {
  return request.post('/auth/logout')
}
