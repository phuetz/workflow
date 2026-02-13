import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const API_BASE_URL = __DEV__
  ? 'http://localhost:3001/api'
  : 'https://api.workflow-automation.app';

const RETRY_DELAY = 1000;
const MAX_RETRIES = 3;

class ApiClient {
  private client: AxiosInstance;
  private isOnline: boolean = true;
  private requestQueue: Array<() => Promise<unknown>> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.setupNetworkListener();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean; _retryCount?: number };

        // Handle 401 - Token expired
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            if (refreshToken) {
              const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                refreshToken,
              });

              const { token } = response.data;
              await AsyncStorage.setItem('auth_token', token);

              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }

              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            await this.logout();
            throw refreshError;
          }
        }

        // Handle network errors with retry
        if (!error.response && this.isOnline) {
          originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

          if (originalRequest._retryCount <= MAX_RETRIES) {
            await this.delay(RETRY_DELAY * originalRequest._retryCount);
            return this.client(originalRequest);
          }
        }

        // If offline, queue the request
        if (!this.isOnline && originalRequest.method !== 'get') {
          this.queueRequest(() => this.client(originalRequest));
        }

        return Promise.reject(error);
      }
    );
  }

  private setupNetworkListener() {
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      // Process queue when coming back online
      if (wasOffline && this.isOnline) {
        this.processQueue();
      }
    });
  }

  private queueRequest(request: () => Promise<unknown>) {
    this.requestQueue.push(request);
  }

  private async processQueue() {
    while (this.requestQueue.length > 0 && this.isOnline) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.error('Error processing queued request:', error);
        }
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async logout() {
    await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user']);
    // Navigation will be handled by the app
  }

  // Public methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  getIsOnline(): boolean {
    return this.isOnline;
  }

  getQueueLength(): number {
    return this.requestQueue.length;
  }
}

export default new ApiClient();
