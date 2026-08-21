const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

export const authStorage = {
  getToken: () => localStorage.getItem("citifix_token"),
  setToken: (token) => localStorage.setItem("citifix_token", token),
  clearToken: () => localStorage.removeItem("citifix_token"),
};

const getAuthHeaders = () => {
  const token = authStorage.getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
};

export const authApi = {
  requestOtp: (phone, purpose) =>
    request("/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ phone, purpose }),
    }),

  verifyLoginOtp: (phone, otp) =>
    request("/auth/login/verify", {
      method: "POST",
      body: JSON.stringify({ phone, otp }),
    }),

  registerWithOtp: ({ name, email, phone, role, otp }) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, phone, role, otp }),
    }),

  me: () => request("/auth/me"),
};

export const complaintsApi = {
  create: (payload) =>
    request("/complaints", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  list: () => request("/complaints"),

  listMine: () => request("/complaints/user/my-complaints"),

  vote: (complaintId) =>
    request(`/complaints/${complaintId}/vote`, {
      method: "POST",
    }),

  update: (complaintId, payload) =>
    request(`/complaints/${complaintId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  heatmap: () => request("/complaints/heatmap"),

  resolveWithProof: (complaintId, resolutionImageUrl) =>
    request(`/complaints/${complaintId}/resolve-with-proof`, {
      method: "POST",
      body: JSON.stringify({ resolutionImageUrl }),
    }),

  challengeResolution: (complaintId, reason) =>
    request(`/complaints/${complaintId}/challenge-resolution`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};

export const adminApi = {
  analytics: () => request("/admin/analytics"),
  complaints: () => request("/admin/complaints?limit=500"),
  updateStatus: (complaintId, status) =>
    request(`/admin/complaints/${complaintId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

export const leaderboardApi = {
  list: () => request("/leaderboard"),
};

export const superAdminApi = {
  users: () => request("/superadmin/users"),
  setRole: (userId, role, department) => request(`/superadmin/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role, department }) }),
  assignSubAdmin: (complaintId, data) => request(`/superadmin/complaints/${complaintId}/assign`, { method: "POST", body: JSON.stringify(data) }),
  unassign: (complaintId) => request(`/superadmin/complaints/${complaintId}/assign`, { method: "DELETE" }),
  getSlaConfigs: () => request("/superadmin/sla"),
  setSla: (department, days) => request(`/superadmin/sla/${department}`, { method: "PUT", body: JSON.stringify({ daysToResolve: days }) }),
  getAnalytics: () => request("/superadmin/analytics"),
  getExtensionRequests: () => request("/superadmin/extension-requests"),
  reviewExtensionRequest: (id, data) => request(`/superadmin/extension-requests/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  getRaisedIssues: () => request("/superadmin/raised-issues"),
  assignRaisedIssue: (id, subAdminId) => request(`/superadmin/raised-issues/${id}/assign`, { method: "PATCH", body: JSON.stringify({ subAdminId }) }),
};

export const subAdminApi = {
  myComplaints: () => request("/subadmin/complaints"),
  updateStatus: (complaintId, status) => request(`/subadmin/complaints/${complaintId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  requestExtension: (complaintId, data) => request(`/subadmin/complaints/${complaintId}/request-extension`, { method: "POST", body: JSON.stringify(data) }),
  getExtensionRequests: (complaintId) => request(`/subadmin/complaints/${complaintId}/extension-requests`),
  raiseIssue: (complaintId, data) => request(`/subadmin/complaints/${complaintId}/raise-issue`, { method: "POST", body: JSON.stringify(data) }),
  getAssignedRaisedIssues: () => request("/subadmin/raised-issues"),
  resolveRaisedIssue: (id) => request(`/subadmin/raised-issues/${id}/resolve`, { method: "PATCH" }),
};

export const bidsApi = {
  // SuperAdmin
  create: (data) => request("/bids", { method: "POST", body: JSON.stringify(data) }),
  list: () => request("/bids"),
  getProposals: (bidId) => request(`/bids/${bidId}/proposals`),
  award: (bidId, proposalId) => request(`/bids/${bidId}/award/${proposalId}`, { method: "POST" }),
  cancel: (bidId) => request(`/bids/${bidId}`, { method: "DELETE" }),
  // SubAdmin
  myDeptBids: () => request("/bids/my-dept"),
  submitProposal: (bidId, data) => request(`/bids/${bidId}/propose`, { method: "POST", body: JSON.stringify(data) }),
  myProposal: (bidId) => request(`/bids/${bidId}/my-proposal`),
};

export const chatApi = {
  sendMessage: (message, history = []) =>
    request("/chat", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    }),
  generateDescription: (title) =>
    request("/chat/generate-description", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
};

export const dashboardApi = {
  analytics: () => request("/dashboard/analytics"),
};

export const notificationsApi = {
  list: (page = 1, limit = 20) =>
    request(`/notifications?page=${page}&limit=${limit}`),
  unreadCount: () => request("/notifications/unread-count"),
  markRead: (id) =>
    request(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () =>
    request("/notifications/read-all", { method: "PATCH" }),
};

export const twoFactorApi = {
  setup: () =>
    request("/auth/2fa/setup", { method: "POST" }),
  verifySetup: (token) =>
    request("/auth/2fa/verify-setup", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  verifyLogin: (tempToken, token) =>
    request("/auth/2fa/verify-login", {
      method: "POST",
      body: JSON.stringify({ tempToken, token }),
    }),
  disable: (token) =>
    request("/auth/2fa/disable", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  status: () => request("/auth/2fa/status"),
};

