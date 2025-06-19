// Enhanced API service with robust error handling and fallbacks
const getApiBaseUrl = () => {
  // Priority order for API URL determination:
  // 1. Explicit VITE_API_BASE_URL from environment
  // 2. Environment-based defaults
  // 3. Hardcoded fallbacks
  
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (envApiUrl) {
    console.log('🔧 Using API URL from environment:', envApiUrl);
    return envApiUrl;
  }
  
  // Environment-based fallbacks
  if (import.meta.env.PROD) {
    console.log('🚀 Production mode: using Render backend');
    return 'https://pb2-ahh9.onrender.com/api';
  } else {
    // Development mode logic
    if (import.meta.env.VITE_USE_LOCAL_BACKEND === 'true') {
      console.log('🔧 Development mode: using local backend via proxy');
      return '/api'; // Uses Vite proxy
    } else {
      console.log('🔧 Development mode: using production backend');
      return 'https://pb2-ahh9.onrender.com/api';
    }
  }
};

const API_BASE_URL = getApiBaseUrl();
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000');
const ENABLE_FALLBACK = import.meta.env.VITE_ENABLE_API_FALLBACK === 'true';

interface ApiError extends Error {
  status?: number;
  code?: string;
  retryable?: boolean;
}

class ApiService {
  private backendStatus: 'unknown' | 'healthy' | 'sleeping' | 'error' = 'unknown';
  private lastHealthCheck = 0;
  private healthCheckInterval = 5 * 60 * 1000; // 5 minutes

  private getAuthHeaders() {
    const token = localStorage.getItem('pasteforge-auth');
    if (token) {
      try {
        const authData = JSON.parse(token);
        return {
          'Authorization': `Bearer ${authData.state.token}`,
          'Content-Type': 'application/json'
        };
      } catch (error) {
        console.error('Error parsing auth token:', error);
      }
    }
    return {
      'Content-Type': 'application/json'
    };
  }

  private async handleResponse(response: Response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        error: `HTTP ${response.status}: ${response.statusText}` 
      }));
      
      const apiError: ApiError = new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      apiError.status = response.status;
      apiError.retryable = response.status >= 500 || response.status === 429;
      
      throw apiError;
    }
    return response.json();
  }

  private createTimeoutError(): ApiError {
    const error: ApiError = new Error(
      'Request timeout - the server may be sleeping or experiencing high load. Please try again in a moment.'
    );
    error.code = 'TIMEOUT';
    error.retryable = true;
    return error;
  }

  private createNetworkError(originalError: Error): ApiError {
    const error: ApiError = new Error(
      'Network error - unable to connect to server. The backend may be starting up, please wait a moment and try again.'
    );
    error.code = 'NETWORK_ERROR';
    error.retryable = true;
    return error;
  }

  private async makeRequest(url: string, options: RequestInit = {}, retryCount = 0): Promise<any> {
    const maxRetries = 2;
    
    try {
      console.log(`🌐 Making request to: ${url} (attempt ${retryCount + 1})`);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn(`⏰ Request timeout after ${API_TIMEOUT}ms for: ${url}`);
      }, API_TIMEOUT);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers
        }
      });
      
      clearTimeout(timeoutId);
      
      // Update backend status on successful response
      if (response.ok) {
        this.backendStatus = 'healthy';
        this.lastHealthCheck = Date.now();
      }
      
      return this.handleResponse(response);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Request failed for ${url}:`, message);
      if (error instanceof Error && error.stack) {
        console.debug(error.stack);
      }
      
      let apiError: ApiError;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          apiError = this.createTimeoutError();
          this.backendStatus = 'sleeping';
        } else if (error.message.includes('fetch') || error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
          apiError = this.createNetworkError(error);
          this.backendStatus = 'error';
        } else {
          apiError = error as ApiError;
        }
      } else {
        apiError = new Error('Unknown error occurred');
      }
      
      // Retry logic for retryable errors
      if (apiError.retryable && retryCount < maxRetries && ENABLE_FALLBACK) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`🔄 Retrying request in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequest(url, options, retryCount + 1);
      }
      
      throw apiError;
    }
  }

  // Enhanced health check with status tracking
  async healthCheck(): Promise<any> {
    try {
      console.log('🏥 Performing health check...');
      const result = await this.makeRequest(`${API_BASE_URL}/health`);
      
      this.backendStatus = 'healthy';
      this.lastHealthCheck = Date.now();
      
      console.log('✅ Health check successful:', result);
      return result;
      
    } catch (error) {
      console.warn('⚠️ Health check failed:', error);
      
      if (error instanceof Error && error.message.includes('timeout')) {
        this.backendStatus = 'sleeping';
      } else {
        this.backendStatus = 'error';
      }
      
      throw error;
    }
  }

  // Get current backend status
  getBackendStatus(): { status: string; lastCheck: number; needsCheck: boolean } {
    const needsCheck = Date.now() - this.lastHealthCheck > this.healthCheckInterval;
    return {
      status: this.backendStatus,
      lastCheck: this.lastHealthCheck,
      needsCheck
    };
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.makeRequest(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async register(userData: { username: string; email: string; password: string }) {
    return this.makeRequest(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async verifyToken() {
    return this.makeRequest(`${API_BASE_URL}/auth/verify`);
  }

  // Paste endpoints with enhanced error handling
  async getRecentPastes(limit = 20) {
    try {
      return await this.makeRequest(`${API_BASE_URL}/pastes/recent?limit=${limit}`);
    } catch (error) {
      console.error('Failed to fetch recent pastes:', error);
      
      // Return empty array as fallback for UI
      if (ENABLE_FALLBACK) {
        console.log('📋 Returning empty pastes array as fallback');
        return [];
      }
      
      throw error;
    }
  }

  async getPasteArchive(page = 1, limit = 20) {
    return this.makeRequest(`${API_BASE_URL}/pastes/archive?page=${page}&limit=${limit}`);
  }

  async getPaste(id: string) {
    return this.makeRequest(`${API_BASE_URL}/pastes/${id}`);
  }

  async createPaste(pasteData: {
    title: string;
    content: string;
    language: string;
    isPrivate?: boolean;
    isZeroKnowledge?: boolean;
    encryptedContent?: string;
    expiration?: string;
    tags?: string[];
  }) {
    return this.makeRequest(`${API_BASE_URL}/pastes`, {
      method: 'POST',
      body: JSON.stringify(pasteData)
    });
  }

  async getRelatedPastes(id: string, limit = 6) {
    try {
      return await this.makeRequest(`${API_BASE_URL}/pastes/${id}/related?limit=${limit}`);
    } catch (error) {
      console.error('Failed to fetch related pastes:', error);
      
      // Return empty array as fallback
      if (ENABLE_FALLBACK) {
        return [];
      }
      
      throw error;
    }
  }

  async getComments(id: string) {
    try {
      return await this.makeRequest(`${API_BASE_URL}/pastes/${id}/comments`);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      if (ENABLE_FALLBACK) {
        return [];
      }
      throw error;
    }
  }

  async getDiscussions(id: string) {
    try {
      return await this.makeRequest(`${API_BASE_URL}/pastes/${id}/discussions`);
    } catch (error) {
      console.error('Failed to fetch discussions:', error);
      if (ENABLE_FALLBACK) {
        return [];
      }
      throw error;
    }
  }

  async downloadPaste(id: string) {
    const response = await fetch(`${API_BASE_URL}/pastes/${id}/download`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to download paste');
    }
    
    return response.blob();
  }

  // User endpoints
  async getUser(username: string) {
    return this.makeRequest(`${API_BASE_URL}/users/${username}`);
  }

  async getUserPastes(username: string, limit = 20) {
    return this.makeRequest(`${API_BASE_URL}/users/${username}/pastes?limit=${limit}`);
  }

  // Admin endpoints
  async getAdminStats() {
    return this.makeRequest(`${API_BASE_URL}/admin/stats`);
  }

  async getAdminUsers(page = 1, limit = 20) {
    return this.makeRequest(`${API_BASE_URL}/admin/users?page=${page}&limit=${limit}`);
  }

  async getLanguageStats() {
    return this.makeRequest(`${API_BASE_URL}/admin/languages`);
  }
}

export const apiService = new ApiService();

// Enhanced startup configuration logging
console.log('🔧 API Configuration:');
console.log('  Base URL:', API_BASE_URL);
console.log('  Environment:', import.meta.env.MODE);
console.log('  Production mode:', import.meta.env.PROD);
console.log('  Use local backend:', import.meta.env.VITE_USE_LOCAL_BACKEND === 'true');
console.log('  API timeout:', API_TIMEOUT + 'ms');
console.log('  Fallback enabled:', ENABLE_FALLBACK);

// Startup health check with enhanced logging
apiService.healthCheck()
  .then((result) => {
    console.log('✅ Backend is healthy and reachable');
    console.log('📊 Health check result:', result);
  })
  .catch((error) => {
    console.warn('⚠️ Backend health check failed - this is normal if the server is sleeping');
    console.log('🔄 The backend will be automatically retried on first request');
    
    if (error.message.includes('timeout')) {
      console.log('💤 Server appears to be sleeping - it will wake up on first request');
    } else if (error.message.includes('Network error')) {
      console.log('🌐 Network connectivity issue detected');
    }
  });