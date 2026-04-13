// store/modules/user.ts - 用户状态管理

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { login as loginApi, getUserInfo as getUserInfoApi, logout as logoutApi } from '@/api/auth';
import { User } from '@/types';

interface UserState {
  token: string | null;
  userInfo: User | null;
  isAuthenticated: boolean;
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    token: localStorage.getItem('token'),
    userInfo: null,
    isAuthenticated: !!localStorage.getItem('token')
  }),

  getters: {
    token: (state) => state.token,
    userInfo: (state) => state.userInfo,
    isAuthenticated: (state) => state.isAuthenticated
  },

  actions: {
    async login(username: string, password: string) {
      try {
        const response = await loginApi({ username, password });
        
        // 假设API返回格式为 { code: 200, data: { token: 'xxx', user: {...} } }
        const { token: userToken, user } = response.data;
        
        // 存储token到localStorage
        localStorage.setItem('token', userToken);
        
        // 更新状态
        this.token = userToken;
        this.userInfo = user;
        this.isAuthenticated = true;
        
        return response;
      } catch (error) {
        throw error;
      }
    },

    async getUserInfo() {
      try {
        const response = await getUserInfoApi();
        this.userInfo = response.data;
        return response;
      } catch (error) {
        throw error;
      }
    },

    async logout() {
      try {
        // 调用登出API（可选）
        // await logoutApi();
        
        // 清除本地存储
        localStorage.removeItem('token');
        
        // 重置状态
        this.token = null;
        this.userInfo = null;
        this.isAuthenticated = false;
        
        return true;
      } catch (error) {
        console.error('Logout error:', error);
        // 即使API调用失败，也要清除本地状态
        localStorage.removeItem('token');
        this.token = null;
        this.userInfo = null;
        this.isAuthenticated = false;
        return true;
      }
    },

    setUserInfo(userInfo: User) {
      this.userInfo = userInfo;
    },

    updateToken(newToken: string) {
      this.token = newToken;
      localStorage.setItem('token', newToken);
    }
  }
});