// Users module models

export type UsersSortDir = "asc" | "desc";

export type UserRow = {
  id: string;
  avatar?: string | null;
  name: string;
  email: string;
  phone?: string;
  role_name?: string;
  company_name?: string;
  status?: string; // derivado (activo/inactivo/suspendido) cuando aplique
};

export type UsersSort = {
  sortBy?: keyof Pick<UserRow, "id" | "name" | "email" | "phone" | "role_name" | "company_name">;
  sortDir?: UsersSortDir;
};

export type UsersPaging = {
  page: number;
  pageSize: number;
  total?: number;
};

// API contracts
export type UsersView = "summary" | "detail";

export interface ListUsersParams {
  name?: string;
  email?: string;
  phone?: string;
  company_id?: number;
  role_id?: number;
  limit?: number;
  offset?: number;
  view?: UsersView;
  sortBy?: string;
  sortDir?: UsersSortDir;
}

export interface UserDTO {
  id: string | number;
  name: string;
  email: string;
  phone?: string;
  role_id?: number;
  role_name?: string; // en summary
  company_id?: number;
  company_name?: string; // en summary
  avatar?: string | null;
  // detail view
  role?: {
    id: number;
    name: string;
    code?: string;
    description?: string;
    hierarchy_level?: number;
    state?: string;
  };
  company?: {
    id: number;
    isotype?: string | null;
    name: string;
    nit?: string;
    address?: string;
    city?: string;
    industry?: string;
    activity_description?: string;
  };
  [key: string]: unknown;
}

export interface ApiUsersPayload {
  users: UserDTO[];
  total: number;
}

export interface CreateUserDTO {
  name: string;
  email: string;
  phone: string; // el backend añade +57 si falta
  password: string;
  company_id: number;
  role_id: number;
  avatar?: File | null;
}

export type UpdateUserDTO = Partial<{
  name: string;
  email: string;
  phone: string;
  company_id: number;
  role_id: number;
  avatar: File | null;
}>;