import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { ApiError, api, setUnauthorizedHandler } from "@/lib/api";

export type MenuNode = {
  id: number;
  title: string;
  hint: string;
  icon: string;
  to: string;
  locked: boolean;
  children: MenuNode[];
};

export type Me = {
  user: { id: number; username: string; full_name: string; email: string; identifier: string; initials: string };
  roles: { code: string; name: string }[];
  permissions: string[];
  inactive_modules: string[];
  menu: MenuNode[];
};

// eslint-disable-next-line react-refresh/only-export-components
export const ME_KEY = ["me"] as const;

/** Holding any of these opens the admin panel. */
// eslint-disable-next-line react-refresh/only-export-components
export const ADMIN_PERMISSIONS = ["core.roles.manage", "core.users.manage", "core.modules.manage", "core.menu.manage"];

type AuthState = {
  me: Me | null;
  loading: boolean;
  /** True when the user may open the admin panel. */
  isAdmin: boolean;
  /** True when the user holds the permission and its module is active. */
  can: (permission: string) => boolean;
  moduleInactive: (moduleCode: string) => boolean;
  setMe: (me: Me | null) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return await api.get<Me>("/auth/me/");
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
    staleTime: 30_000,
    // Pick up menu/permission changes made by an admin when the person returns to the tab.
    refetchOnWindowFocus: true,
  });

  const setMe = useCallback((me: Me | null) => queryClient.setQueryData(ME_KEY, me), [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(() => setMe(null));
    return () => setUnauthorizedHandler(null);
  }, [setMe]);

  const value = useMemo<AuthState>(() => {
    const me = query.data ?? null;
    const permissions = new Set(me?.permissions ?? []);
    const inactive = new Set(me?.inactive_modules ?? []);
    return {
      me,
      loading: query.isLoading,
      isAdmin: ADMIN_PERMISSIONS.some((code) => permissions.has(code)),
      can: (permission) => permissions.has(permission),
      moduleInactive: (code) => inactive.has(code),
      setMe,
      logout: async () => {
        try {
          await api.post("/auth/logout/");
        } finally {
          // Signed-out state first, so route guards redirect; then drop every other cached answer.
          setMe(null);
          queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== ME_KEY[0] });
        }
      },
    };
  }, [query.data, query.isLoading, setMe, queryClient]);

  if (query.isError) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="text-base font-semibold">Server tidak dapat dihubungi.</p>
          <p className="mt-1 text-text-2">Periksa koneksi atau coba lagi beberapa saat lagi.</p>
          <button className="mt-4 rounded-ctl bg-navy-700 px-4 py-2 font-medium text-white" onClick={() => query.refetch()}>
            Coba lagi
          </button>
        </div>
      </div>
    );
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
