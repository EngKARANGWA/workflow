export type SystemRole = "system_administrator" | "approver" | "requester";

export type BusinessRole = {
  id: number;
  name: string;
  description: string | null;
};

export type User = {
  id: number;
  name: string;
  email: string;
  system_role: SystemRole;
  department: string | null;
  employee_level: string | null;
  country: string | null;
  roles?: BusinessRole[];
  created_at?: string;
  updated_at?: string;
};

export type ApproverType = "role" | "user";

export type WorkflowCondition = {
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "greater_than"
    | "greater_than_or_equal"
    | "less_than"
    | "less_than_or_equal"
    | "in";
  value: unknown;
};

export type WorkflowApproverDef = {
  id?: number;
  approver_type: ApproverType;
  role_id?: number | null;
  user_id?: number | null;
  role?: BusinessRole;
  user?: User;
};

export type WorkflowStep = {
  id?: number;
  step_order?: number;
  approval_type: "single" | "all";
  conditions?: WorkflowCondition[] | null;
  approver_defs: WorkflowApproverDef[];
};

// Shape expected by POST /workflows and POST /workflows/{id}/versions —
// the API accepts `approvers` on write but returns `approver_defs` on read.
export type WorkflowStepInput = {
  approval_type: "single" | "all";
  conditions?: WorkflowCondition[];
  approvers: { approver_type: ApproverType; role_id?: number; user_id?: number }[];
};

export type WorkflowVersion = {
  id: number;
  workflow_id: number;
  version_number: number;
  is_current: boolean;
  steps?: WorkflowStep[];
  workflow?: Workflow;
  created_at?: string;
};

export type Workflow = {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  current_version?: WorkflowVersion | null;
  versions?: WorkflowVersion[];
  created_at?: string;
  updated_at?: string;
};

export type DecisionValue = "approved" | "rejected" | "returned";

export type RequestStepApprover = {
  id: number;
  request_step_id: number;
  user_id: number;
  acting_for_user_id: number | null;
  decision: DecisionValue | "pending";
  decided_at: string | null;
  comments: string | null;
  user?: User;
  acting_for_user?: User;
};

export type RequestStep = {
  id: number;
  request_id: number;
  workflow_step_id: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  workflow_step?: WorkflowStep;
  approvers?: RequestStepApprover[];
};

export type WorkflowRequest = {
  id: number;
  title: string;
  status: string;
  data: Record<string, unknown>;
  workflow_version_id: number;
  current_step_order: number | null;
  workflow_version?: WorkflowVersion;
  requester?: User;
  steps?: RequestStep[];
  created_at: string;
  updated_at?: string;
};

export type AuditLogEntry = {
  id: number;
  request_id: number;
  action: string;
  user_id: number | null;
  user?: User;
  previous_status: string | null;
  new_status: string | null;
  comments: string | null;
  created_at: string;
};

export type Delegation = {
  id: number;
  delegator_id: number;
  delegate_id: number;
  delegator?: User;
  delegate?: User;
  starts_at: string;
  ends_at: string;
  created_at?: string;
};

export type AppNotification = {
  id: number;
  user_id: number;
  request_id: number | null;
  type: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

export type Paginated<T> = {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
};
