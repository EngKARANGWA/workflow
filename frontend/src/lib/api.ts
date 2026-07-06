import type {
  AppNotification,
  AuditLogEntry,
  BusinessRole,
  Delegation,
  DecisionValue,
  Paginated,
  User,
  Workflow,
  WorkflowRequest,
  WorkflowStepInput,
  WorkflowVersion,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";
const TOKEN_KEY = "workflow_token";

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]> | null;

  constructor(status: number, message: string, errors: Record<string, string[]> | null = null) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; params?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  const { method = "GET", body, params } = options;

  let url = `${API_URL}${path}`;
  if (params) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") query.set(key, String(value));
    }
    const qs = query.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json() : null;

  if (!res.ok) {
    const message = payload?.message ?? `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message, payload?.errors ?? null);
  }

  return payload as T;
}

// --- Auth ---
export const auth = {
  register: (data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    department?: string;
    employee_level?: string;
    country?: string;
  }) => request<{ user: User; token: string }>("/auth/register", { method: "POST", body: data }),

  login: (data: { email: string; password: string }) =>
    request<{ user: User; token: string }>("/auth/login", { method: "POST", body: data }),

  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),

  me: () => request<User>("/auth/me"),
};

// --- Users (admin) ---
export const users = {
  list: (params?: { system_role?: string; per_page?: number }) =>
    request<Paginated<User>>("/users", { params }),

  create: (data: {
    name: string;
    email: string;
    password: string;
    system_role: string;
    department?: string;
    employee_level?: string;
    country?: string;
    role_ids?: number[];
  }) => request<User>("/users", { method: "POST", body: data }),

  get: (id: number) => request<User>(`/users/${id}`),

  update: (id: number, data: Partial<{
    name: string;
    email: string;
    password: string;
    system_role: string;
    department: string;
    employee_level: string;
    country: string;
    role_ids: number[];
  }>) => request<User>(`/users/${id}`, { method: "PUT", body: data }),

  remove: (id: number) => request<void>(`/users/${id}`, { method: "DELETE" }),
};

// --- Business roles (admin) ---
export const roles = {
  list: () => request<BusinessRole[]>("/roles"),
  create: (data: { name: string; description?: string }) =>
    request<BusinessRole>("/roles", { method: "POST", body: data }),
  remove: (id: number) => request<void>(`/roles/${id}`, { method: "DELETE" }),
};

// --- Workflows ---
export const workflows = {
  list: (params?: { is_active?: boolean; per_page?: number }) =>
    request<Paginated<Workflow>>("/workflows", {
      params: params && { is_active: params.is_active === undefined ? undefined : String(params.is_active), per_page: params.per_page },
    }),

  get: (id: number) => request<Workflow>(`/workflows/${id}`),

  create: (data: { name: string; description?: string; steps: WorkflowStepInput[] }) =>
    request<Workflow>("/workflows", { method: "POST", body: data }),

  update: (id: number, data: Partial<{ name: string; description: string; is_active: boolean }>) =>
    request<Workflow>(`/workflows/${id}`, { method: "PUT", body: data }),

  addVersion: (id: number, data: { steps: WorkflowStepInput[] }) =>
    request<WorkflowVersion>(`/workflows/${id}/versions`, { method: "POST", body: data }),

  versions: (id: number) => request<WorkflowVersion[]>(`/workflows/${id}/versions`),
};

// --- Requests ---
export const requests = {
  list: (params?: { scope?: "mine" | "pending_my_approval" | "all"; per_page?: number }) =>
    request<Paginated<WorkflowRequest>>("/requests", { params }),

  get: (id: number) => request<WorkflowRequest>(`/requests/${id}`),

  history: (id: number) => request<AuditLogEntry[]>(`/requests/${id}/history`),

  create: (data: { workflow_id: number; title: string; data: Record<string, unknown> }) =>
    request<WorkflowRequest>("/requests", { method: "POST", body: data }),

  decide: (id: number, data: { decision: DecisionValue; comments?: string }) =>
    request<WorkflowRequest>(`/requests/${id}/decide`, { method: "POST", body: data }),

  resubmit: (id: number, data: { data: Record<string, unknown> }) =>
    request<WorkflowRequest>(`/requests/${id}/resubmit`, { method: "POST", body: data }),
};

// --- Delegations ---
export const delegations = {
  list: () => request<Delegation[]>("/delegations"),
  create: (data: { delegate_id: number; starts_at: string; ends_at: string }) =>
    request<Delegation>("/delegations", { method: "POST", body: data }),
  remove: (id: number) => request<void>(`/delegations/${id}`, { method: "DELETE" }),
};

// --- Notifications ---
export const notifications = {
  list: (params?: { per_page?: number }) =>
    request<Paginated<AppNotification>>("/notifications", { params }),
  markRead: (id: number) => request<AppNotification>(`/notifications/${id}/read`, { method: "POST" }),
};
