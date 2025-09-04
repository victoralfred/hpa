import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse, PaginatedResponse } from '~/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// Custom error class for API errors
export class ApiError extends Error {
  status: number;
  code?: string;
  data?: any;

  constructor(message: string, status: number, code?: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

// API client configuration for session-based authentication
class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor(baseURL: string) {
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Important: include cookies for session auth
    });

    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Log requests in development
        if (import.meta.env.DEV) {
          console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.data);
        }
        return config;
      },
      (error) => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Log successful responses in development
        if (import.meta.env.DEV) {
          console.log(`[API] Response ${response.status}:`, response.data);
        }
        return response;
      },
      (error: AxiosError) => {
        // Handle errors globally
        const status = error.response?.status || 0;
        const data = error.response?.data as any;
        
        let errorMessage = 'An unexpected error occurred';
        let errorCode: string | undefined;

        if (error.response) {
          // Server responded with error status
          errorMessage = data?.message || data?.error || `HTTP ${status} Error`;
          errorCode = data?.code;
          
          // Only log non-401 errors (401 is expected for unauthenticated users)
          if (status !== 401) {
            console.error('[API] Response error:', {
              status,
              message: errorMessage,
              code: errorCode,
              url: error.config?.url,
            });
          }
        } else if (error.request) {
          // Request was made but no response received
          errorMessage = 'No response from server. Please check your connection.';
          console.error('[API] No response:', error.request);
        } else {
          // Something happened in setting up the request
          errorMessage = error.message || 'Failed to make request';
          console.error('[API] Request setup error:', error.message);
        }

        // Create a standardized error object
        const apiError = new ApiError(errorMessage, status, errorCode, data);
        return Promise.reject(apiError);
      }
    );
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const response = await this.axiosInstance.get<T>(endpoint, { params });
    return response.data;
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.axiosInstance.post<T>(endpoint, data);
    return response.data;
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.axiosInstance.put<T>(endpoint, data);
    return response.data;
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.axiosInstance.patch<T>(endpoint, data);
    return response.data;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await this.axiosInstance.delete<T>(endpoint);
    return response.data;
  }

  // File upload with progress tracking
  async upload<T>(
    endpoint: string, 
    file: File, 
    onProgress?: (progressEvent: any) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };

    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = progressEvent.total
          ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
          : 0;
        onProgress({
          loaded: progressEvent.loaded,
          total: progressEvent.total || 0,
          percent: percentCompleted
        });
      };
    }

    const response = await this.axiosInstance.post<T>(endpoint, formData, config);
    return response.data;
  }

  // File download
  async download(endpoint: string, filename?: string): Promise<Blob> {
    const response = await this.axiosInstance.get(endpoint, {
      responseType: 'blob',
    });

    // If filename provided, trigger download
    if (filename && typeof window !== 'undefined') {
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }

    return response.data;
  }

  // Set a custom header (useful for CSRF tokens, etc.)
  setHeader(key: string, value: string) {
    this.axiosInstance.defaults.headers.common[key] = value;
  }

  // Remove a custom header
  removeHeader(key: string) {
    delete this.axiosInstance.defaults.headers.common[key];
  }

  // Get the axios instance for advanced use cases
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

// Create API client instance
export const apiClient = new ApiClient(API_BASE_URL);

// Generic API functions
export const api = {
  // Generic CRUD operations
  async getList<T>(
    resource: string, 
    params?: { page?: number; pageSize?: number; [key: string]: any }
  ): Promise<PaginatedResponse<T>> {
    return apiClient.get(`/${resource}`, params);
  },

  async getOne<T>(resource: string, id: string): Promise<ApiResponse<T>> {
    return apiClient.get(`/${resource}/${id}`);
  },

  async create<T>(resource: string, data: any): Promise<ApiResponse<T>> {
    return apiClient.post(`/${resource}`, data);
  },

  async update<T>(resource: string, id: string, data: any): Promise<ApiResponse<T>> {
    return apiClient.put(`/${resource}/${id}`, data);
  },

  async delete<T>(resource: string, id: string): Promise<ApiResponse<T>> {
    return apiClient.delete(`/${resource}/${id}`);
  },

  // Authentication - using existing backend endpoints with cookie-based tokens
  async login(credentials: { email: string; password: string; rememberMe?: boolean }): Promise<ApiResponse<{ 
    user: any;
    message?: string;
    tenant_id?: string;
    role?: string;
  }>> {
    try {
      // Extract rememberMe flag but don't send it to backend
      const { rememberMe, ...loginData } = credentials;
      
      const response = await apiClient.post<any>('/v1/auth/login', loginData);
      // Wrap the response in ApiResponse format if it isn't already
      if (response && typeof response === 'object' && !('data' in response)) {
        return {
          data: response,
          success: true
        };
      }
      return response;
    } catch (error) {
      // Re-throw the error with proper typing
      throw error;
    }
  },

  async register(userData: { 
    email: string; 
    password: string; 
    firstName: string; 
    lastName: string;
    tenantName?: string;
  }): Promise<ApiResponse<{ 
    user: any;
    message?: string;
    tenant_id?: string;
    role?: string;
  }>> {
    // Convert firstName + lastName to name for backend
    const registerData = {
      email: userData.email,
      password: userData.password,
      name: `${userData.firstName} ${userData.lastName}`.trim(),
      tenant_name: userData.tenantName,
    };
    
    try {
      const response = await apiClient.post<any>('/v1/auth/register', registerData);
      // Wrap the response in ApiResponse format if it isn't already
      if (response && typeof response === 'object' && !('data' in response)) {
        return {
          data: response,
          success: true
        };
      }
      return response;
    } catch (error) {
      throw error;
    }
  },

  async logout(): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post<any>('/v1/auth/logout');
      return {
        data: undefined,
        success: true
      };
    } catch (error) {
      throw error;
    }
  },

  async getCurrentUser(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get<any>('/v1/auth/me');
      // Wrap the response in ApiResponse format if it isn't already
      if (response && typeof response === 'object' && !('data' in response)) {
        return {
          data: response,
          success: true
        };
      }
      return response;
    } catch (error) {
      throw error;
    }
  },

  async refreshToken(): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await apiClient.post<any>('/v1/auth/refresh');
      if (response && typeof response === 'object' && !('data' in response)) {
        return {
          data: response,
          success: true
        };
      }
      return response;
    } catch (error) {
      throw error;
    }
  },

  async resetPassword(email: string): Promise<ApiResponse<void>> {
    try {
      await apiClient.post('/v1/auth/forgot-password', { email });
      return {
        data: undefined,
        success: true
      };
    } catch (error) {
      throw error;
    }
  },

  async updatePassword(data: { token: string; password: string }): Promise<ApiResponse<void>> {
    try {
      await apiClient.post('/v1/auth/reset-password', data);
      return {
        data: undefined,
        success: true
      };
    } catch (error) {
      throw error;
    }
  },

  async verifyEmail(token: string): Promise<ApiResponse<void>> {
    try {
      await apiClient.post('/auth/verify-email', { token });
      return {
        data: undefined,
        success: true
      };
    } catch (error) {
      throw error;
    }
  },

  async resendVerification(email: string): Promise<ApiResponse<void>> {
    try {
      await apiClient.post('/auth/resend-verification', { email });
      return {
        data: undefined,
        success: true
      };
    } catch (error) {
      throw error;
    }
  },

  // Dashboard metrics
  async getDashboardMetrics(): Promise<ApiResponse<any>> {
    return apiClient.get('/dashboard/metrics');
  },

  // Certificates
  async getCertificates(params?: any): Promise<PaginatedResponse<any>> {
    return apiClient.get('/certificates', params);
  },

  async createCertificate(data: any): Promise<ApiResponse<any>> {
    return apiClient.post('/certificates', data);
  },

  async revokeCertificate(id: string): Promise<ApiResponse<void>> {
    try {
      await apiClient.post(`/certificates/${id}/revoke`);
      return {
        data: undefined,
        success: true
      };
    } catch (error) {
      throw error;
    }
  },

  async downloadCertificate(id: string): Promise<Blob> {
    return apiClient.download(`/certificates/${id}/download`);
  },

  // Tokens
  async getTokens(params?: any): Promise<PaginatedResponse<any>> {
    return apiClient.get('/tokens', params);
  },

  async createToken(data: any): Promise<ApiResponse<any>> {
    return apiClient.post('/tokens', data);
  },

  async revokeToken(id: string): Promise<ApiResponse<void>> {
    try {
      await apiClient.post(`/tokens/${id}/revoke`);
      return {
        data: undefined,
        success: true
      };
    } catch (error) {
      throw error;
    }
  },

  async rotateToken(id: string): Promise<ApiResponse<any>> {
    return apiClient.post(`/tokens/${id}/rotate`);
  },

  // Sessions
  async getSessions(params?: any): Promise<PaginatedResponse<any>> {
    return apiClient.get('/sessions', params);
  },

  async terminateSession(id: string): Promise<ApiResponse<void>> {
    try {
      await apiClient.post(`/sessions/${id}/terminate`);
      return {
        data: undefined,
        success: true
      };
    } catch (error) {
      throw error;
    }
  },

  // Users
  async getUsers(params?: any): Promise<PaginatedResponse<any>> {
    return apiClient.get('/users', params);
  },

  async createUser(data: any): Promise<ApiResponse<any>> {
    return apiClient.post('/users', data);
  },

  async updateUser(id: string, data: any): Promise<ApiResponse<any>> {
    return apiClient.put(`/users/${id}`, data);
  },

  async deleteUser(id: string): Promise<ApiResponse<void>> {
    try {
      await apiClient.delete(`/users/${id}`);
      return {
        data: undefined,
        success: true
      };
    } catch (error) {
      throw error;
    }
  },

  // Audit logs
  async getAuditLogs(params?: any): Promise<PaginatedResponse<any>> {
    return apiClient.get('/audit', params);
  },

  // Clusters
  async getClusters(params?: any): Promise<PaginatedResponse<any>> {
    return apiClient.get('/clusters', params);
  },

  async createCluster(data: any): Promise<ApiResponse<any>> {
    return apiClient.post('/clusters', data);
  },

  async updateCluster(id: string, data: any): Promise<ApiResponse<any>> {
    return apiClient.put(`/clusters/${id}`, data);
  },

  async deleteCluster(id: string): Promise<ApiResponse<void>> {
    try {
      await apiClient.delete(`/clusters/${id}`);
      return {
        data: undefined,
        success: true
      };
    } catch (error) {
      throw error;
    }
  },

  // Agents
  async getAgents(params?: any): Promise<PaginatedResponse<any>> {
    return apiClient.get('/agents', params);
  },

  async createAgent(data: any): Promise<ApiResponse<any>> {
    return apiClient.post('/agents', data);
  },

  async updateAgent(id: string, data: any): Promise<ApiResponse<any>> {
    return apiClient.put(`/agents/${id}`, data);
  },

  async deleteAgent(id: string): Promise<ApiResponse<void>> {
    try {
      await apiClient.delete(`/agents/${id}`);
      return {
        data: undefined,
        success: true
      };
    } catch (error) {
      throw error;
    }
  }
};

export default api;