import { createContext, useContext, createSignal, createEffect, onMount, ParentComponent, JSX } from 'solid-js';
import { 
  AuthContextType, 
  AuthState, 
  AuthUser, 
  LoginForm, 
  RegisterForm, 
  PasswordResetForm 
} from '../types';
import { api, apiClient, ApiError } from '../services/api';

// Create the context with undefined default to force provider usage
const AuthContext = createContext<AuthContextType>();

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Constants for localStorage keys - Session-based auth, no token storage
const STORAGE_KEYS = {
  REMEMBER_ME: 'hpa_remember_me',
  USER: 'hpa_user',
} as const;


// Storage utilities
const storage = {
  get: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  set: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Silently fail if localStorage is not available
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently fail if localStorage is not available
    }
  },

  clear: (): void => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    } catch {
      // Silently fail if localStorage is not available
    }
  }
};

// Auth Provider Component
export const AuthProvider: ParentComponent = (props) => {
  console.log('AuthProvider: Component initializing');
  // Auth state signals
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const [user, setUser] = createSignal<AuthUser | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string>();
  console.log('AuthProvider: Initial isLoading state:', isLoading());

  // Clear error helper
  const clearError = () => setError(undefined);

  // Initialize auth state from localStorage
  const initializeAuth = async (): Promise<void> => {
    console.log('AuthContext: Starting initializeAuth');
    try {
      setIsLoading(true);
      clearError();
      console.log('AuthContext: isLoading set to true');

      // With session-based auth, check if we have an active session
      try {
        // Call the backend to verify session
        console.log('AuthContext: Calling getCurrentUser API');
        const response = await api.getCurrentUser();
        console.log('AuthContext: getCurrentUser successful', response);
        setUser(response.data);
        setIsAuthenticated(true);
        
        // Store user data if remember me was set
        const rememberMe = storage.get(STORAGE_KEYS.REMEMBER_ME) === 'true';
        if (rememberMe) {
          storage.set(STORAGE_KEYS.USER, JSON.stringify(response.data));
        }
      } catch (error: unknown) {
        console.log('AuthContext: getCurrentUser failed', error);
        // Check if it's an ApiError from axios
        if (error instanceof ApiError) {
          if (error.status === 401) {
            // This is expected - user is not authenticated
            console.log('AuthContext: 401 error - user not authenticated');
            setIsAuthenticated(false);
            storage.clear();
          } else {
            // This is an actual error (network, server error, etc.)
            console.error('AuthContext: Unexpected error verifying session:', error.message);
            setIsAuthenticated(false);
            storage.clear();
          }
        } else {
          // Non-API error
          console.error('AuthContext: Non-API error:', error);
          setIsAuthenticated(false);
          storage.clear();
        }
      }
    } catch (error) {
      console.error('AuthContext: Error in outer try-catch:', error);
      setError('Failed to initialize authentication');
    } finally {
      console.log('AuthContext: Setting isLoading to false');
      setIsLoading(false);
      console.log('AuthContext: isLoading is now', isLoading());
    }
  };

  // Login function
  const login = async (credentials: LoginForm): Promise<void> => {
    try {
      setIsLoading(true);
      clearError();

      // Real API call - Session will be set via cookies
      const response = await api.login(credentials);
      
      // Backend returns user, tenant_id, and role
      const { user: userData, tenant_id, role } = response.data;
      
      // Merge tenant_id and role into user object if not already present
      const userWithContext = {
        ...userData,
        tenant_id: userData.tenant_id || tenant_id,
        role: userData.role || role
      };

      // Session is managed by cookies, we just store user data
      setUser(userWithContext);
      setIsAuthenticated(true);

      // Store user data based on remember me preference
      if (credentials.rememberMe) {
        storage.set(STORAGE_KEYS.USER, JSON.stringify(userWithContext));
        storage.set(STORAGE_KEYS.REMEMBER_ME, 'true');
      } else {
        storage.set(STORAGE_KEYS.REMEMBER_ME, 'false');
      }

    } catch (error: unknown) {
      console.error('Login error:', error);
      if (error instanceof ApiError) {
        setError(error.message || 'Login failed. Please check your credentials.');
      } else {
        setError('Login failed. Please check your credentials.');
      }
      throw error; // Re-throw to allow form to handle it
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData: RegisterForm): Promise<void> => {
    try {
      setIsLoading(true);
      clearError();

      // Real API call - Session will be set via cookies
      const response = await api.register({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
      });

      // Backend returns user, tenant_id, and role
      const { user: newUser, tenant_id, role } = response.data;
      
      // Merge tenant_id and role into user object if not already present
      const userWithContext = {
        ...newUser,
        tenant_id: newUser.tenant_id || tenant_id,
        role: newUser.role || role
      };

      // Session is managed by cookies
      setUser(userWithContext);
      setIsAuthenticated(true);

      // Always remember registered users
      storage.set(STORAGE_KEYS.USER, JSON.stringify(userWithContext));
      storage.set(STORAGE_KEYS.REMEMBER_ME, 'true');

    } catch (error: unknown) {
      console.error('Registration error:', error);
      if (error instanceof ApiError) {
        setError(error.message || 'Registration failed. Please try again.');
      } else {
        setError('Registration failed. Please try again.');
      }
      throw error; // Re-throw to allow form to handle it
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    await handleLogout(true);
  };

  // Internal logout helper
  const handleLogout = async (callApi: boolean = true): Promise<void> => {
    try {
      setIsLoading(true);
      
      if (callApi) {
        try {
          await api.logout();
        } catch (error) {
          console.warn('Logout API call failed:', error);
          // Continue with logout even if API call fails
        }
      }

      // Clear state
      setUser(null);
      setIsAuthenticated(false);
      clearError();

      // Clear stored data
      storage.clear();

    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password function
  const resetPassword = async (email: string): Promise<void> => {
    try {
      setIsLoading(true);
      clearError();

      await api.resetPassword(email);

    } catch (error: unknown) {
      console.error('Reset password error:', error);
      if (error instanceof ApiError) {
        setError(error.message || 'Failed to send reset password email.');
      } else {
        setError('Failed to send reset password email.');
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Update password function
  const updatePassword = async (data: PasswordResetForm): Promise<void> => {
    try {
      setIsLoading(true);
      clearError();

      await api.updatePassword(data);

    } catch (error: unknown) {
      console.error('Update password error:', error);
      if (error instanceof ApiError) {
        setError(error.message || 'Failed to update password.');
      } else {
        setError('Failed to update password.');
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh user data
  const refreshUser = async (): Promise<void> => {
    if (!isAuthenticated()) return;

    try {
      const response = await api.getCurrentUser();
      setUser(response.data);
      
      // Update stored user data if remember me is enabled
      if (storage.get(STORAGE_KEYS.REMEMBER_ME) === 'true') {
        storage.set(STORAGE_KEYS.USER, JSON.stringify(response.data));
      }

    } catch (error: unknown) {
      console.error('Refresh user error:', error);
      // If refresh fails due to auth issues, logout
      if (error instanceof ApiError && error.status === 401) {
        await handleLogout(false);
      }
    }
  };

  // Initialize auth on mount
  onMount(() => {
    console.log('AuthContext: onMount triggered');
    initializeAuth();
  });

  // Auto-refresh user data periodically
  createEffect(() => {
    if (isAuthenticated()) {
      const interval = setInterval(refreshUser, 5 * 60 * 1000); // 5 minutes
      return () => clearInterval(interval);
    }
  });

  // Create context value - pass signals directly for proper reactivity
  const contextValue: AuthContextType = {
    // State - pass signals directly, consumers will call them
    isAuthenticated,
    user,
    isLoading,
    error,
    
    // Actions
    login,
    register,
    logout,
    resetPassword,
    updatePassword,
    clearError,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {props.children}
    </AuthContext.Provider>
  );
};

// Export context for advanced usage
export { AuthContext };