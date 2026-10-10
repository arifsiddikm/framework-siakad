import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { AuthProvider, ME_KEY, type Me, type MenuNode } from "@/auth/AuthProvider";

export function node(id: number, title: string, to = "", children: MenuNode[] = [], locked = false): MenuNode {
  return { id, title, hint: `Hint ${title}`, icon: "box", to, locked, children };
}

export const baseMe: Me = {
  user: { id: 1, username: "rina", full_name: "Rina Lestari", email: "", identifier: "", initials: "RL" },
  roles: [{ code: "staf", name: "Staf Akademik" }],
  permissions: [],
  inactive_modules: [],
  menu: [],
};

/** Render with a signed-in user (or null) preloaded in the query cache. */
export function renderApp(ui: ReactElement, { me = baseMe, path = "/" }: { me?: Me | null; path?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(ME_KEY, me);
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
