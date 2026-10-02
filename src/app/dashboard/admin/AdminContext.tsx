"use client";

import { createContext, useContext } from "react";
import type { useAdminDashboard } from "./useAdminDashboard";

export type AdminState = ReturnType<typeof useAdminDashboard>;

export const AdminContext = createContext<AdminState | null>(null);

/** State and actions of the admin dashboard, for the views rendered inside AdminDashboard. */
export function useAdmin(): AdminState {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin() must be used inside <AdminContext.Provider>");
  return ctx;
}
