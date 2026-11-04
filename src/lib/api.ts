export const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith('http')) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return 'https://crm-uec-backend.onrender.com';
    }
    return `http://${host}:4000`;
  }
  return 'https://crm-uec-backend.onrender.com';
};

export const sanitizeRecordingUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const baseUrl = getApiBaseUrl();
  if (url.includes('localhost:4000') || url.includes('127.0.0.1:4000')) {
    return url.replace(/http:\/\/(localhost|127\.0\.0\.1):4000/g, baseUrl);
  }
  if (url.startsWith('/')) {
    return `${baseUrl}${url}`;
  }
  return url;
};

const BASE_URL = getApiBaseUrl();
class APIClient {
  private refreshPromise: Promise<string | null> | null = null;

  private getToken() {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('paramantra_access_token') || 
                  localStorage.getItem('crm_token');
    return token ? token.trim().replace(/^["']|["']$/g, '') : null;
  }

  private getRefreshToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('paramantra_refresh_token') || 
           localStorage.getItem('refresh_token');
  }

  private clearSessionAndRedirect() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('token');
    localStorage.removeItem('paramantra_access_token');
    localStorage.removeItem('paramantra_refresh_token');
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    localStorage.removeItem('paramantra_user');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        this.clearSessionAndRedirect();
        return null;
      }

      try {
        const activeBaseUrl = getApiBaseUrl();
        const res = await fetch(`${activeBaseUrl}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (!res.ok) {
          this.clearSessionAndRedirect();
          return null;
        }

        const data = await res.json();
        if (data.accessToken) {
          const cleanToken = data.accessToken.trim().replace(/^["']|["']$/g, '');
          localStorage.setItem('paramantra_access_token', cleanToken);
          localStorage.setItem('crm_token', cleanToken);
          localStorage.removeItem('access_token');
          localStorage.removeItem('token');
          if (data.refreshToken) {
            localStorage.setItem('paramantra_refresh_token', data.refreshToken);
          }

          // Broadcast real-time token rotation event so WebSocket updates its credentials
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth-token-refreshed', { detail: { token: cleanToken } }));
          }

          return cleanToken;
        }
        this.clearSessionAndRedirect();
        return null;
      } catch (err) {
        this.clearSessionAndRedirect();
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async request<T = Response>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers = new Headers(options.headers || {});
    
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (typeof window !== 'undefined' && !headers.has('x-crm-unit-id')) {
      const activeUnit = localStorage.getItem('crm_global_selected_unit');
      if (activeUnit && activeUnit !== 'ALL') {
        headers.set('x-crm-unit-id', activeUnit);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

    try {
      const activeBaseUrl = getApiBaseUrl();
      const url = endpoint.startsWith('http') ? endpoint : `${activeBaseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
      let res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      // Handle 401 Unauthorized: attempt refresh if token expired
      const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/refresh');
      if (res.status === 401 && !isAuthEndpoint && typeof window !== 'undefined') {
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          headers.set('Authorization', `Bearer ${newToken}`);
          const retryRes = await fetch(url, {
            ...options,
            headers
          });
          return retryRes as unknown as T;
        }
      }

      return res as unknown as T;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw error;
    }
  }
  private async handleResponseError(res: Response): Promise<never> {
    let errPayload: any = null;
    try {
      errPayload = await res.json();
    } catch (_) {}
    const errMsg = errPayload?.message || errPayload?.error || `HTTP Error ${res.status}`;
    const err = new Error(errMsg);
    (err as any).response = { status: res.status, data: errPayload };
    throw err;
  }

  async get<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await this.request(endpoint, { ...options, method: 'GET' });
    if (!res.ok) await this.handleResponseError(res);
    return res.json();
  }

  async post<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    const res = await this.request(endpoint, { 
      ...options, 
      method: 'POST', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    });
    if (!res.ok) await this.handleResponseError(res);
    return res.json();
  }

  async patch<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    const res = await this.request(endpoint, { 
      ...options, 
      method: 'PATCH', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    });
    if (!res.ok) await this.handleResponseError(res);
    return res.json();
  }

  async delete<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await this.request(endpoint, { ...options, method: 'DELETE' });
    if (!res.ok) await this.handleResponseError(res);
    return res.json();
  }
}

export const api = new APIClient();
export const apiFetch = <T = Response>(endpoint: string, options?: RequestInit) => api.request<T>(endpoint, options);
export const API_BASE_URL = BASE_URL;
