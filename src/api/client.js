const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me'),

  // Admin
  getDashboard: () => request('/admin/dashboard'),
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
  getCommunityDashboard: () => request('/reports/community'),
  getResidentReports: () => request('/reports'),
  getReportCategories: () => request('/hazard-categories'),
  getStations: () => request('/stations'),
  createResidentReport: (data) => request('/reports', { method: 'POST', body: data }),
  updateResidentReport: (id, data) => request(`/reports/update/${id}`, { method: 'POST', body: data }),
};
