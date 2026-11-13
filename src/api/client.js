const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export function publicFileUrl(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) return '';

  const apiUrl = new URL(API_BASE_URL, window.location.origin);
  const publicBasePath = apiUrl.pathname.replace(/\/api\/?$/, '/');
  const relativePath = filePath.replace(/^\/+/, '');

  return new URL(relativePath, `${apiUrl.origin}${publicBasePath}`).href;
}

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('bayanalert_token');
  const isFormData = options.body instanceof FormData;
  const headers = {
    'Accept': 'application/json',
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const config = {
    ...options,
    headers
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401) {
        // Clear token on unauthorized if on auth'd route
        if (!endpoint.includes('/auth/login')) {
          localStorage.removeItem('bayanalert_token');
          localStorage.removeItem('bayanalert_user');
          localStorage.removeItem('bayanalert_session_role');
          window.dispatchEvent(new Event('auth:unauthorized'));
        }
      }
      const message = data?.message || data?.error || `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export const api = {
  // Auth
  login: (credentials, expectedRole) => request('/auth/login', {
    method: 'POST',
    body: { ...credentials, expected_role: expectedRole },
  }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me'),

  // Admin
  getDashboard: () => request('/admin/dashboard'),
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'POST' }),
  createAnnouncement: (data) => request('/admin/announcements', { method: 'POST', body: data }),
  getTables: () => request('/admin/tables'),
  getTableRows: (table, search = '', page = 1) => 
    request(`/admin/tables/${table}?q=${encodeURIComponent(search)}&page=${page}`),
  getTableOptions: (table) => request(`/admin/tables/${table}/options`),
  getRecord: (table, id) => request(`/admin/tables/${table}/${id}`),
  createRecord: (table, data) => request(`/admin/tables/${table}`, { method: 'POST', body: data }),
  updateRecord: (table, id, data) => request(`/admin/tables/${table}/${id}`, { method: 'PUT', body: data }),
  deleteRecord: (table, id) => request(`/admin/tables/${table}/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: () => request('/categories'),
  getCategory: (id) => request(`/categories/${id}`),
  createCategory: (data) => request('/categories', { method: 'POST', body: data }),
  updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: data }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),


  //add
  getBarangays: () => request('/barangays'),
  register: (data) =>request('/auth/register', {method: 'POST',body: data,}),
  sendRegistrationVerification: (email) => request('/auth/send-registration-verification', {
    method: 'POST',
    body: { email },
  }),
  verifyEmail: (token) => request('/auth/verify-email', { method: 'POST', body: { token } }),
  resendVerificationEmail: (email) => request('/auth/resend-verification', {
    method: 'POST',
    body: { email },
  }),
  getCommunityDashboard: () => request('/reports/community'),
  getHazardMap: () => request('/map/reports'),
  getCalapanWeather: () => request('/weather/calapan'),
  getExternalResidentFeed: () => request('/external/resident-feed'),
  getExternalApiHealth: () => request('/admin/external-apis'),
  syncExternalApi: (key) => request(`/admin/external-apis/${key}/sync`, { method: 'POST' }),
  updateExternalApi: (key, payload) => request(`/admin/external-apis/${key}/config`, { method: 'PATCH', body: payload }),
  toggleExternalEventVisibility: (id, isPublished) => request(`/admin/external-events/${id}/visibility`, {
    method: 'PATCH',
    body: { is_published_to_residents: isPublished },
  }),
  getResidentReports: () => request('/reports'),
  getReportCategories: () => request('/hazard-categories'),
  createResidentReport: (data) => request('/reports', { method: 'POST', body: data }),
  updateResidentReport: (id, data) => request(`/reports/update/${id}`, { method: 'POST', body: data }),
  voteOnReport: (id, vote) => request(`/reports/${id}/vote`, {
    method: 'POST',
    body: { vote },
  }),
};
