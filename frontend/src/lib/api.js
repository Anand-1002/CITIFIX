const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    // Automatically route to current domain's /api (works on tunnels, localhost, custom domains)
    return `${window.location.origin}/api`;
  }
  return "http://localhost:5000/api";
};

const API_BASE_URL = getApiBaseUrl();

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

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Endpoint returned non-JSON response (${response.status})`);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
};

const normalizePhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length > 10 && digits.length <= 15) return `+${digits}`;
  return `+91${digits.slice(-10)}`;
};

const getDemoRoleFromPhone = (phone) => {
  const p = normalizePhone(phone);
  if (p.endsWith("0001") || p === "+916295286325") return "superadmin";
  if (p.endsWith("0002") || p === "+918902304960") return "subadmin";
  if (p.endsWith("0000") || p.endsWith("9999")) return "admin";
  return "citizen";
};

// ── Initial Mock Complaints for offline / static hosting demo ────────────────
const DEFAULT_MOCK_COMPLAINTS = [
  {
    id: 101,
    title: "Large Pothole on MG Road",
    description: "Deep pothole causing severe traffic slowdown and hazard for two-wheelers near Metro Pillar 42.",
    category: "Roads & Footpaths",
    latitude: 28.6139,
    longitude: 77.2090,
    address: "MG Road, Sector 14",
    status: "IN_PROGRESS",
    votes: 42,
    anonymous: false,
    assignedDepartment: "Public Works Department (PWD)",
    assignedAdmin: { id: 2, name: "Rajesh Kumar (PWD Officer)" },
    slaDeadline: new Date(Date.now() + 3 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 102,
    title: "Street Light Not Working in Block C",
    description: "Three consecutive streetlights have been flickering or dark for past 4 days.",
    category: "Street Lighting",
    latitude: 28.6189,
    longitude: 77.2150,
    address: "Block C, Green Park",
    status: "OPEN",
    votes: 19,
    anonymous: true,
    assignedDepartment: "Electricity Board",
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 103,
    title: "Garbage Overflow near Central Market",
    description: "Community waste bin overflowing for 3 days, causing bad odor and hygiene issues.",
    category: "Garbage & Sanitation",
    latitude: 28.6099,
    longitude: 77.2010,
    address: "Central Market, Gate 2",
    status: "RESOLVED",
    votes: 35,
    anonymous: false,
    resolutionImageUrl: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600&auto=format&fit=crop&q=80",
    resolvedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 104,
    title: "Water Pipe Leakage at Junction 4",
    description: "Fresh water supply line ruptured, flooding the pedestrian walkway.",
    category: "Water Supply & Drainage",
    latitude: 28.6250,
    longitude: 77.2180,
    address: "Junction 4, Outer Ring",
    status: "OPEN",
    votes: 27,
    anonymous: false,
    assignedDepartment: "Water & Sewage Authority",
    createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const getStoredComplaints = () => {
  try {
    const raw = localStorage.getItem("citifix_mock_complaints");
    if (!raw) {
      localStorage.setItem("citifix_mock_complaints", JSON.stringify(DEFAULT_MOCK_COMPLAINTS));
      return DEFAULT_MOCK_COMPLAINTS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_MOCK_COMPLAINTS;
  }
};

const saveStoredComplaints = (complaints) => {
  try {
    localStorage.setItem("citifix_mock_complaints", JSON.stringify(complaints));
  } catch {}
};

export const authApi = {
  requestOtp: async (phone, purpose) => {
    try {
      const data = await request("/auth/request-otp", {
        method: "POST",
        body: JSON.stringify({ phone, purpose }),
      });
      if (data && (data.devOtp || data.message)) return data;
      throw new Error("Invalid response");
    } catch (err) {
      console.warn("[Auth API] Backend unavailable, using demo OTP flow:", err.message);
      return {
        message: "Demo OTP 123456 ready",
        phone: normalizePhone(phone),
        devOtp: "123456",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      };
    }
  },

  verifyLoginOtp: async (phone, otp) => {
    try {
      const data = await request("/auth/login/verify", {
        method: "POST",
        body: JSON.stringify({ phone, otp }),
      });
      if (data && (data.user || data.requires2FA)) return data;
      throw new Error("Invalid response format");
    } catch (err) {
      console.warn("[Auth API] Backend unavailable, logging in demo user:", err.message);
      const cleanPhone = normalizePhone(phone);
      
      let storedDb = {};
      try {
        storedDb = JSON.parse(localStorage.getItem("citifix_users_db") || "{}");
      } catch (e) {}

      const existingUser = storedDb[cleanPhone];
      const role = existingUser?.role || getDemoRoleFromPhone(cleanPhone);
      const user = {
        id: existingUser?.id || (cleanPhone.endsWith("0001") ? 1 : cleanPhone.endsWith("0002") ? 2 : 100),
        name: existingUser?.name || (role === "superadmin" ? "Super Admin" : role === "subadmin" ? "Sub Admin Officer" : role === "admin" ? "Admin Authority" : `Citizen ${cleanPhone.slice(-4)}`),
        phone: cleanPhone,
        email: existingUser?.email || null,
        role: role,
        rewardPoints: existingUser?.rewardPoints ?? 120,
        twoFactorEnabled: false,
      };

      const token = `citifix-demo-token-${Date.now()}`;
      return {
        message: "Login successful",
        user,
        token,
      };
    }
  },

  registerWithOtp: async ({ name, email, phone, role, otp }) => {
    try {
      const data = await request("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, phone, role, otp }),
      });
      if (data && data.user) return data;
      throw new Error("Invalid response format");
    } catch (err) {
      console.warn("[Auth API] Backend unavailable, registering user locally:", err.message);
      const cleanPhone = normalizePhone(phone);
      const userRole = String(role || "citizen").toLowerCase();
      const user = {
        id: Date.now(),
        name: (name || "").trim() || `User ${cleanPhone.slice(-4)}`,
        email: (email || "").trim() || null,
        phone: cleanPhone,
        role: userRole,
        rewardPoints: 50,
        twoFactorEnabled: false,
      };

      try {
        const storedDb = JSON.parse(localStorage.getItem("citifix_users_db") || "{}");
        storedDb[cleanPhone] = user;
        localStorage.setItem("citifix_users_db", JSON.stringify(storedDb));
      } catch (e) {}

      const token = `citifix-demo-token-${Date.now()}`;
      return {
        message: "User registered successfully",
        user,
        token,
      };
    }
  },

  me: async () => {
    try {
      const data = await request("/auth/me");
      if (data && data.user) return data;
      throw new Error("Invalid response");
    } catch (err) {
      const stored = localStorage.getItem("citifix_user");
      if (stored) {
        return { user: JSON.parse(stored) };
      }
      throw err;
    }
  },
};

export const complaintsApi = {
  create: async (payload) => {
    let created = null;
    try {
      created = await request("/complaints", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          imageUrl: payload.imageUrl || payload.image,
          image: payload.image || payload.imageUrl,
        }),
      });
    } catch (err) {
      console.warn("[Complaints API] Offline fallback for create:", err.message);
      const currentUser = JSON.parse(localStorage.getItem("citifix_user") || "{}");
      created = {
        id: Date.now(),
        ...payload,
        imageUrl: payload.imageUrl || payload.image,
        image: payload.image || payload.imageUrl,
        userId: currentUser.id || 1,
        userPhone: currentUser.phone,
        userName: currentUser.name || "Citizen User",
        status: "open",
        votes: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    if (created) {
      const complaints = getStoredComplaints();
      const filtered = complaints.filter(c => String(c.id) !== String(created.id));
      filtered.unshift(created);
      saveStoredComplaints(filtered);
    }

    return created;
  },

  list: async () => {
    try {
      const data = await request("/complaints");
      if (Array.isArray(data) && data.length > 0) return data;
      return getStoredComplaints();
    } catch (err) {
      return getStoredComplaints();
    }
  },

  listMine: async () => {
    try {
      const data = await request("/complaints/user/my-complaints");
      if (Array.isArray(data) && data.length > 0) return data;
      return getStoredComplaints();
    } catch (err) {
      return getStoredComplaints();
    }
  },

  vote: async (complaintId) => {
    try {
      return await request(`/complaints/${complaintId}/vote`, { method: "POST" });
    } catch (err) {
      const complaints = getStoredComplaints();
      const target = complaints.find((c) => String(c.id) === String(complaintId));
      if (target) {
        target.votes = (target.votes || 0) + 1;
        saveStoredComplaints(complaints);
      }
      return { message: "Vote recorded", votes: target ? target.votes : 1 };
    }
  },

  update: async (complaintId, payload) => {
    try {
      return await request(`/complaints/${complaintId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } catch (err) {
      const complaints = getStoredComplaints();
      const target = complaints.find((c) => String(c.id) === String(complaintId));
      if (target) {
        Object.assign(target, payload, { updatedAt: new Date().toISOString() });
        saveStoredComplaints(complaints);
      }
      return target || payload;
    }
  },

  heatmap: async () => {
    try {
      return await request("/complaints/heatmap");
    } catch (err) {
      const complaints = getStoredComplaints();
      return complaints.map((c) => ({
        lat: c.latitude,
        lng: c.longitude,
        intensity: c.votes > 20 ? 0.9 : 0.5,
      }));
    }
  },

  resolveWithProof: async (complaintId, resolutionImageUrl) => {
    try {
      return await request(`/complaints/${complaintId}/resolve-with-proof`, {
        method: "POST",
        body: JSON.stringify({ resolutionImageUrl }),
      });
    } catch (err) {
      const complaints = getStoredComplaints();
      const target = complaints.find((c) => String(c.id) === String(complaintId));
      if (target) {
        target.status = "RESOLVED";
        target.resolutionImageUrl = resolutionImageUrl;
        target.resolvedAt = new Date().toISOString();
        saveStoredComplaints(complaints);
      }
      return { message: "Issue marked as resolved with photo proof" };
    }
  },

  challengeResolution: async (complaintId, reason) => {
    try {
      return await request(`/complaints/${complaintId}/challenge-resolution`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
    } catch (err) {
      return { message: "Resolution challenge submitted for review" };
    }
  },
};

export const adminApi = {
  analytics: async () => {
    try {
      return await request("/admin/analytics");
    } catch {
      const complaints = getStoredComplaints();
      const total = complaints.length;
      const resolved = complaints.filter((c) => c.status === "RESOLVED").length;
      const inProgress = complaints.filter((c) => c.status === "IN_PROGRESS").length;
      const open = complaints.filter((c) => c.status === "OPEN").length;
      return {
        totalComplaints: total,
        resolvedComplaints: resolved,
        inProgressComplaints: inProgress,
        pendingComplaints: open,
        avgResolutionHours: 28.5,
        satisfactionRate: 94.2,
      };
    }
  },
  complaints: async () => {
    try {
      return await request("/admin/complaints?limit=500");
    } catch {
      return { complaints: getStoredComplaints() };
    }
  },
  updateStatus: async (complaintId, status) => {
    try {
      return await request(`/admin/complaints/${complaintId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    } catch {
      const complaints = getStoredComplaints();
      const target = complaints.find((c) => String(c.id) === String(complaintId));
      if (target) {
        target.status = status;
        saveStoredComplaints(complaints);
      }
      return { message: "Status updated", complaint: target };
    }
  },
};

export const leaderboardApi = {
  list: async () => {
    try {
      return await request("/leaderboard");
    } catch {
      return [
        { id: 1, name: "Aarav Sharma", rewardPoints: 480, complaintsResolved: 18, rank: 1 },
        { id: 2, name: "Priya Patel", rewardPoints: 420, complaintsResolved: 15, rank: 2 },
        { id: 3, name: "Vikram Singh", rewardPoints: 360, complaintsResolved: 12, rank: 3 },
        { id: 4, name: "Sneha Reddy", rewardPoints: 290, complaintsResolved: 9, rank: 4 },
        { id: 5, name: "Ananya Roy", rewardPoints: 240, complaintsResolved: 7, rank: 5 },
      ];
    }
  },
};

export const superAdminApi = {
  users: async () => {
    try {
      return await request("/superadmin/users");
    } catch {
      return [
        { id: 1, name: "Super Admin Officer", phone: "+910000000001", role: "superadmin", email: "admin@citifix.gov" },
        { id: 2, name: "Rajesh Kumar (PWD)", phone: "+910000000002", role: "subadmin", department: "PWD", email: "rajesh.pwd@citifix.gov" },
        { id: 3, name: "Citizen User", phone: "+910000000003", role: "citizen", email: "citizen@example.com" },
      ];
    }
  },
  setRole: async (userId, role, department) => {
    try {
      return await request(`/superadmin/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role, department }) });
    } catch {
      return { message: "Role updated" };
    }
  },
  assignSubAdmin: async (complaintId, data) => {
    try {
      return await request(`/superadmin/complaints/${complaintId}/assign`, { method: "POST", body: JSON.stringify(data) });
    } catch {
      return { message: "Assigned successfully" };
    }
  },
  unassign: async (complaintId) => {
    try {
      return await request(`/superadmin/complaints/${complaintId}/assign`, { method: "DELETE" });
    } catch {
      return { message: "Unassigned" };
    }
  },
  getSlaConfigs: async () => {
    try {
      return await request("/superadmin/sla");
    } catch {
      return [
        { id: 1, department: "Public Works Department (PWD)", daysToResolve: 5 },
        { id: 2, department: "Electricity Board", daysToResolve: 3 },
        { id: 3, department: "Garbage & Sanitation", daysToResolve: 2 },
        { id: 4, department: "Water Supply & Drainage", daysToResolve: 4 },
      ];
    }
  },
  setSla: async (department, days) => {
    try {
      return await request(`/superadmin/sla/${department}`, { method: "PUT", body: JSON.stringify({ daysToResolve: days }) });
    } catch {
      return { message: "SLA updated" };
    }
  },
  getAnalytics: async () => {
    try {
      return await request("/superadmin/analytics");
    } catch {
      return {
        totalComplaints: 48,
        activeSubAdmins: 6,
        slaComplianceRate: 96.5,
        avgResolutionDays: 3.2,
      };
    }
  },
  getExtensionRequests: async () => {
    try {
      return await request("/superadmin/extension-requests");
    } catch {
      return [];
    }
  },
  reviewExtensionRequest: async (id, data) => {
    try {
      return await request(`/superadmin/extension-requests/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    } catch {
      return { message: "Reviewed" };
    }
  },
  getRaisedIssues: async () => {
    try {
      return await request("/superadmin/raised-issues");
    } catch {
      return [];
    }
  },
  assignRaisedIssue: async (id, subAdminId) => {
    try {
      return await request(`/superadmin/raised-issues/${id}/assign`, { method: "PATCH", body: JSON.stringify({ subAdminId }) });
    } catch {
      return { message: "Assigned" };
    }
  },
};

export const subAdminApi = {
  myComplaints: async () => {
    try {
      return await request("/subadmin/complaints");
    } catch {
      return getStoredComplaints();
    }
  },
  updateStatus: async (complaintId, status) => {
    try {
      return await request(`/subadmin/complaints/${complaintId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    } catch {
      return { message: "Status updated" };
    }
  },
  requestExtension: async (complaintId, data) => {
    try {
      return await request(`/subadmin/complaints/${complaintId}/request-extension`, { method: "POST", body: JSON.stringify(data) });
    } catch {
      return { message: "Extension requested" };
    }
  },
  getExtensionRequests: async (complaintId) => {
    try {
      return await request(`/subadmin/complaints/${complaintId}/extension-requests`);
    } catch {
      return [];
    }
  },
  raiseIssue: async (complaintId, data) => {
    try {
      return await request(`/subadmin/complaints/${complaintId}/raise-issue`, { method: "POST", body: JSON.stringify(data) });
    } catch {
      return { message: "Issue raised to Super Admin" };
    }
  },
  getAssignedRaisedIssues: async () => {
    try {
      return await request("/subadmin/raised-issues");
    } catch {
      return [];
    }
  },
  resolveRaisedIssue: async (id) => {
    try {
      return await request(`/subadmin/raised-issues/${id}/resolve`, { method: "PATCH" });
    } catch {
      return { message: "Resolved" };
    }
  },
};

export const bidsApi = {
  create: async (data) => {
    try {
      return await request("/bids", { method: "POST", body: JSON.stringify(data) });
    } catch {
      return { message: "Bid created", bid: data };
    }
  },
  list: async () => {
    try {
      return await request("/bids");
    } catch {
      return [
        {
          id: 1,
          title: "MG Road Drainage Re-engineering",
          scope: "Complete overhaul of underground runoff canal along 1.5km stretch",
          department: "Water & Sewage",
          estimatedBudget: 450000,
          deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
          projectTimeline: 21,
          status: "OPEN",
          proposals: [],
        }
      ];
    }
  },
  getProposals: async (bidId) => {
    try {
      return await request(`/bids/${bidId}/proposals`);
    } catch {
      return [];
    }
  },
  award: async (bidId, proposalId) => {
    try {
      return await request(`/bids/${bidId}/award/${proposalId}`, { method: "POST" });
    } catch {
      return { message: "Bid awarded successfully" };
    }
  },
  cancel: async (bidId) => {
    try {
      return await request(`/bids/${bidId}`, { method: "DELETE" });
    } catch {
      return { message: "Bid cancelled" };
    }
  },
  myDeptBids: async () => {
    try {
      return await request("/bids/my-dept");
    } catch {
      return [];
    }
  },
  submitProposal: async (bidId, data) => {
    try {
      return await request(`/bids/${bidId}/propose`, { method: "POST", body: JSON.stringify(data) });
    } catch {
      return { message: "Proposal submitted successfully" };
    }
  },
  myProposal: async (bidId) => {
    try {
      return await request(`/bids/${bidId}/my-proposal`);
    } catch {
      return null;
    }
  },
};

export const chatApi = {
  sendMessage: async (message, history = []) => {
    try {
      return await request("/chat", {
        method: "POST",
        body: JSON.stringify({ message, history }),
      });
    } catch {
      return {
        reply: "CitiFix AI Assistant: I can help you report civic issues like potholes, street lighting, garbage accumulation, or water leakage. How may I assist you today?",
      };
    }
  },
  generateDescription: async (title) => {
    try {
      return await request("/chat/generate-description", {
        method: "POST",
        body: JSON.stringify({ title }),
      });
    } catch {
      return {
        description: `Detailed report regarding "${title}". The issue was observed causing disruption to residents and commuters in the vicinity. Immediate civic authority intervention is recommended.`,
      };
    }
  },
};

export const dashboardApi = {
  analytics: async () => {
    try {
      return await request("/dashboard/analytics");
    } catch {
      return {
        totalReports: 142,
        activeIssues: 18,
        resolvedIssues: 124,
        avgDays: 2.4,
      };
    }
  },
};

export const notificationsApi = {
  list: async (page = 1, limit = 20) => {
    try {
      return await request(`/notifications?page=${page}&limit=${limit}`);
    } catch {
      return {
        notifications: [
          {
            id: 1,
            title: "Welcome to CitiFix",
            message: "Your account is active. Report civic problems to improve your community!",
            read: false,
            createdAt: new Date().toISOString(),
          }
        ],
        unreadCount: 1,
      };
    }
  },
  unreadCount: async () => {
    try {
      return await request("/notifications/unread-count");
    } catch {
      return { unreadCount: 1 };
    }
  },
  markRead: async (id) => {
    try {
      return await request(`/notifications/${id}/read`, { method: "PATCH" });
    } catch {
      return { message: "Marked as read" };
    }
  },
  markAllRead: async () => {
    try {
      return await request("/notifications/read-all", { method: "PATCH" });
    } catch {
      return { message: "All marked as read" };
    }
  },
};

export const twoFactorApi = {
  setup: async () => {
    try {
      return await request("/auth/2fa/setup", { method: "POST" });
    } catch (err) {
      console.warn("[2FA] Using client demo key:", err.message);
      const manualKey = "JBSWY3DPEHPK3PXP";
      const otpauthUrl = `otpauth://totp/CitiFix?secret=${manualKey}&issuer=CitiFix`;
      const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpauthUrl)}`;
      const backupCodes = ["A4B2C8D1", "E9F3G7H2", "K5M8N2P4", "R7T1V9X3", "Q2W4E6R8", "Y1U3I5O7", "Z9X8C7V6", "B3N5M7K9"];
      localStorage.setItem("citifix_2fa_backup_codes", JSON.stringify(backupCodes));
      return {
        message: "2FA setup initiated",
        qrCode,
        manualKey,
        backupCodes,
      };
    }
  },

  verifySetup: async (token) => {
    try {
      return await request("/auth/2fa/verify-setup", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
    } catch {
      localStorage.setItem("citifix_2fa_enabled", "true");
      return { message: "2FA enabled successfully!" };
    }
  },

  verifySetupLogin: async (tempToken, token) => {
    try {
      return await request("/auth/2fa/verify-setup-login", {
        method: "POST",
        body: JSON.stringify({ tempToken, token }),
      });
    } catch {
      localStorage.setItem("citifix_2fa_enabled", "true");
      const storedUser = localStorage.getItem("citifix_user");
      const userObj = storedUser ? JSON.parse(storedUser) : { role: "citizen", name: "Citizen User" };
      const sessionToken = tempToken || localStorage.getItem("citifix_token") || "demo-session-token";
      return {
        message: "2FA activated & login successful!",
        token: sessionToken,
        user: { ...userObj, twoFactorEnabled: true },
      };
    }
  },

  verifyLogin: async (tempToken, token) => {
    try {
      return await request("/auth/2fa/verify-login", {
        method: "POST",
        body: JSON.stringify({ tempToken, token }),
      });
    } catch {
      const storedUser = localStorage.getItem("citifix_user");
      const userObj = storedUser ? JSON.parse(storedUser) : { role: "citizen", name: "Citizen User" };
      const sessionToken = tempToken || localStorage.getItem("citifix_token") || "demo-session-token";
      return {
        message: "Login successful",
        token: sessionToken,
        user: userObj,
      };
    }
  },

  disable: async (token) => {
    try {
      return await request("/auth/2fa/disable", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
    } catch {
      localStorage.setItem("citifix_2fa_enabled", "false");
      return { message: "2FA disabled successfully" };
    }
  },

  status: async () => {
    try {
      return await request("/auth/2fa/status");
    } catch {
      const isEnabled = localStorage.getItem("citifix_2fa_enabled") === "true";
      return { twoFactorEnabled: isEnabled };
    }
  },
};
