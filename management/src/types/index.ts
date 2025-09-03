// Base types for the HPA Management Platform

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string;
  lastLogin?: string;
  status: 'active' | 'inactive' | 'suspended';
}

export type UserRole = 'admin' | 'operator' | 'viewer';

export interface Cluster {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error' | 'pending';
  version: string;
  nodeCount: number;
  region: string;
  createdAt: string;
  lastSeen?: string;
  metrics?: ClusterMetrics;
}

export interface ClusterMetrics {
  cpuUsage: number;
  memoryUsage: number;
  podCount: number;
  nodeCount: number;
  hpaCount: number;
}

export interface Agent {
  id: string;
  name: string;
  clusterId: string;
  clusterName?: string;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  version: string;
  lastHeartbeat?: string;
  ipAddress?: string;
  port?: number;
  tlsEnabled: boolean;
}

export interface Certificate {
  id: string;
  name: string;
  type: 'client' | 'server' | 'ca';
  status: 'active' | 'expired' | 'revoked' | 'pending';
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  fingerprint: string;
  createdAt: string;
}

export interface Token {
  id: string;
  name: string;
  agentId?: string;
  clusterId?: string;
  scope: TokenScope[];
  status: 'active' | 'expired' | 'revoked';
  createdAt: string;
  expiresAt?: string;
  lastUsed?: string;
  usageCount: number;
}

export type TokenScope = 
  | 'cluster:read' 
  | 'cluster:write' 
  | 'agent:read' 
  | 'agent:write'
  | 'metrics:read'
  | 'certificates:read'
  | 'certificates:write';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface Session {
  id: string;
  agentId: string;
  agentName: string;
  clusterId: string;
  clusterName: string;
  status: 'active' | 'inactive' | 'error';
  connectedAt: string;
  lastActivity?: string;
  bytesTransferred: number;
  requestCount: number;
  errors: number;
}

export interface DashboardMetrics {
  totalClusters: number;
  activeClusters: number;
  totalAgents: number;
  connectedAgents: number;
  totalCertificates: number;
  expiringSoon: number;
  activeTokens: number;
  recentAudits: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Form types
export interface CreateClusterForm {
  name: string;
  region: string;
  description?: string;
}

export interface CreateAgentForm {
  name: string;
  clusterId: string;
  description?: string;
}

export interface CreateCertificateForm {
  name: string;
  type: Certificate['type'];
  subject: string;
  validityDays: number;
  keySize: number;
}

export interface CreateTokenForm {
  name: string;
  agentId?: string;
  clusterId?: string;
  scope: TokenScope[];
  expiresIn?: number; // days
}

export interface CreateUserForm {
  username: string;
  email: string;
  password: string;
  role: UserRole;
}

// UI State types
export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  title: string;
  sortable?: boolean;
  render?: (value: any, record: T) => any;
  width?: string;
}

export interface FilterState {
  search: string;
  status?: string;
  role?: string;
  type?: string;
  dateRange?: [string, string];
}