const API_URL = import.meta.env.VITE_API_URL || "";

function isFormData(value) {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

async function request(path, { token, method = "GET", body, formData } = {}) {
  if (!API_URL) {
    throw new Error("Missing VITE_API_URL for this deployment. Set the frontend API URL before deploying.");
  }

  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let payload;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: payload
    });
  } catch {
    throw new Error(`Network error reaching ${API_URL}. Check frontend API URL, backend URL, and backend CORS settings.`);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || "Request failed";
    const details = data?.error?.details;
    throw new Error(details?.length ? `${message} ${details.join(" ")}` : message);
  }

  return data;
}

export const api = {
  bootstrapCreator: (body) => request("/auth/bootstrap", { method: "POST", body }),
  login: (body) => request("/auth/login", { method: "POST", body }),
  signupRequest: (body) => request("/auth/signup-request", { method: "POST", body }),
  me: (token) => request("/auth/me", { token }),
  signupRequests: {
    list: (token) => request("/auth/signup-requests", { token }),
    approve: (token, id) => request(`/auth/signup-requests/${id}/approve`, { token, method: "POST" }),
    reject: (token, id) => request(`/auth/signup-requests/${id}/reject`, { token, method: "POST" })
  },
  auth: {
    changePassword: (token, body) => request("/auth/change-password", { token, method: "POST", body })
  },
  summary: (token, farmId) => request(`/dashboard/summary${farmId ? `?farmId=${farmId}` : ""}`, { token }),
  dashboard: {
    monthlyReport: (token, month, farmId) => request(`/dashboard/monthly-report?month=${encodeURIComponent(month)}${farmId ? `&farmId=${encodeURIComponent(farmId)}` : ""}`, { token }),
    workerContribution: (token, month) => request(`/dashboard/worker-contribution?month=${encodeURIComponent(month)}`, { token })
  },
  farms: {
    list: (token) => request("/farms", { token }),
    create: (token, payload) => isFormData(payload)
      ? request("/farms", { token, method: "POST", formData: payload })
      : request("/farms", { token, method: "POST", body: payload }),
    clearRecords: (token, id) => request(`/farms/${id}/records`, { token, method: "DELETE" }),
    delete: (token, id) => request(`/farms/${id}`, { token, method: "DELETE" })
  },
  packages: {
    list: (token) => request("/packages", { token }),
    create: (token, body) => request("/packages", { token, method: "POST", body }),
    assignToFarm: (token, farmId, body) => request(`/packages/farms/${farmId}`, { token, method: "PATCH", body })
  },
  workers: {
    list: (token, farmId) => request(`/workers${farmId ? `?farmId=${farmId}` : ""}`, { token }),
    create: (token, body) => request("/workers", { token, method: "POST", body }),
    update: (token, id, body) => request(`/workers/${id}`, { token, method: "PATCH", body }),
    assignments: (token, workerId) =>
      request(workerId ? `/workers/${workerId}/assignments` : "/workers/me/assignments", { token }),
    assignmentsAll: (token) => request("/workers/assignments/all", { token }),
    assign: (token, workerId, body) => request(`/workers/${workerId}/assignments`, { token, method: "POST", body }),
    updateAssignment: (token, workerId, assignmentId, body) =>
      request(`/workers/${workerId}/assignments/${assignmentId}`, { token, method: "PATCH", body })
  },
  logs: {
    list: (token, query = "") => request(`/logs${query ? `?${query}` : ""}`, { token }),
    create: (token, formData) => request("/logs", { token, method: "POST", formData })
  },
  crops: {
    list: (token, farmId) => request(`/crops${farmId ? `?farmId=${farmId}` : ""}`, { token }),
    create: (token, formData) => request("/crops", { token, method: "POST", formData }),
    regenerateQr: (token, id) => request(`/crops/${id}/regenerate-qr`, { token, method: "POST" })
  },
  livestock: {
    list: (token, farmId) => request(`/livestock${farmId ? `?farmId=${farmId}` : ""}`, { token }),
    create: (token, formData) => request("/livestock", { token, method: "POST", formData }),
    regenerateQr: (token, id) => request(`/livestock/${id}/regenerate-qr`, { token, method: "POST" }),
    addUpdate: (token, id, body) => request(`/livestock/${id}/updates`, { token, method: "POST", body })
  },
  education: {
    list: (token, farmId) => request(`/education${farmId ? `?farmId=${farmId}` : ""}`, { token }),
    create: (token, formData) => request("/education", { token, method: "POST", formData })
  },
  marketplace: {
    list: (token) => request("/marketplace", { token }),
    create: (token, formData) => request("/marketplace", { token, method: "POST", formData })
  },
  finance: {
    list: (token, month) => request(`/finance${month ? `?month=${encodeURIComponent(month)}` : ""}`, { token }),
    create: (token, body) => request("/finance", { token, method: "POST", body })
  }
};
