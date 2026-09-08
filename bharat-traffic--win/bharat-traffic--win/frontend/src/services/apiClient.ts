import axios, { type InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Increased timeout to 60s to accommodate Render free tier cold-starts
  timeout: 60000,
});

// ── JWT helpers ──────────────────────────────────────────────────────

/** Decode a JWT payload without verifying the signature (client-side only). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1];
    // atob → Uint8Array → UTF-8 (handles non-ASCII)
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Returns the token expiry as a Date, or null if unparseable. */
function getTokenExpiry(token: string): Date | null {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return null;
  return new Date(payload.exp * 1000);
}

/** True when the token expires within the next `ms` milliseconds. */
function isTokenExpiringSoon(token: string, ms = 5 * 60 * 1000): boolean {
  const exp = getTokenExpiry(token);
  if (!exp) return false;
  return Date.now() + ms > exp.getTime();
}

// ── Silent refresh logic ─────────────────────────────────────────────

let refreshPromise: Promise<string> | null = null;
let refreshCooldownUntil = 0;
const REFRESH_COOLDOWN_MS = 30_000; // Don't retry refresh more than once per 30s on failure

/**
 * Silently request a new JWT from /auth/refresh.
 * Concurrent callers share the same in-flight request.
 * Returns the new access_token string, or throws on failure.
 */
async function silentRefresh(): Promise<string> {
  const currentToken = localStorage.getItem('bharat_traffic_token');
  if (!currentToken) throw new Error('No token to refresh');

  // Cooldown after a failed refresh — prevents hammering a dead backend
  if (Date.now() < refreshCooldownUntil) throw new Error('Refresh on cooldown');

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        null,
        {
          headers: {
            Authorization: `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const newToken: string = data.access_token;
      localStorage.setItem('bharat_traffic_token', newToken);

      // Also refresh stored user data if the response includes it
      if (data.user) {
        localStorage.setItem('bharat_traffic_user', JSON.stringify({
          id: data.user.id,
          name: data.user.full_name || data.user.name || data.user.email,
          email: data.user.email,
          role: (data.user.role === 'ADMIN' || data.user.role === 'admin') ? 'admin' : 'user',
        }));
      }

      return newToken;
    } catch (err) {
      refreshCooldownUntil = Date.now() + REFRESH_COOLDOWN_MS;
      throw err;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ── Request interceptor: attach JWT token to every request ───────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    let token = localStorage.getItem('bharat_traffic_token');

    // Proactively refresh before expiry (skip for the refresh endpoint itself)
    if (token && isTokenExpiringSoon(token) && !config.url?.includes('/auth/refresh')) {
      try {
        token = await silentRefresh();
      } catch {
        // Refresh failed — proceed with the old token; the 401 handler will deal with it
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 with silent retry ───────────────

// Prevent infinite loops: only retry once per request.
const retriedRequests = new WeakSet<InternalAxiosRequestConfig>();

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !retriedRequests.has(originalRequest) &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      retriedRequests.add(originalRequest);

      try {
        const newToken = await silentRefresh();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch {
        // Refresh failed — fall through to logout
      }
    }

    if (error.response?.status === 401) {
      // Token expired and refresh failed — clear auth state
      localStorage.removeItem('bharat_traffic_token');
      localStorage.removeItem('bharat_traffic_user');
      if (
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register')
      ) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
