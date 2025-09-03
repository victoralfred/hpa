import { ApiResponse, PaginatedResponse } from '~/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// API client configuration
class ApiClient {
  private baseURL: string;
  private token?: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = undefined;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(endpoint, this.baseURL);
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, String(params[key]));
        }
      });
    }

    return this.request<T>(url.pathname + url.search);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // File upload
  async upload<T>(endpoint: string, file: File): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    return response.json();
  }

  // File download
  async download(endpoint: string, filename?: string): Promise<Blob> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    return response.blob();
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

  // Authentication
  async login(credentials: { username: string; password: string }): Promise<ApiResponse<{ token: string; user: any }>> {
    return apiClient.post('/auth/login', credentials);
  },

  async logout(): Promise<ApiResponse<void>> {
    return apiClient.post('/auth/logout');
  },

  async getCurrentUser(): Promise<ApiResponse<any>> {
    return apiClient.get('/auth/me');
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
    return apiClient.post(`/certificates/${id}/revoke`);
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
    return apiClient.post(`/tokens/${id}/revoke`);
  },

  async rotateToken(id: string): Promise<ApiResponse<any>> {
    return apiClient.post(`/tokens/${id}/rotate`);
  },

  // Sessions
  async getSessions(params?: any): Promise<PaginatedResponse<any>> {
    return apiClient.get('/sessions', params);
  },

  async terminateSession(id: string): Promise<ApiResponse<void>> {
    return apiClient.post(`/sessions/${id}/terminate`);
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
    return apiClient.delete(`/users/${id}`);
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
    return apiClient.delete(`/clusters/${id}`);
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
    return apiClient.delete(`/agents/${id}`);
  }
};

export default api;