import { Outlet, createRootRoute, useLocation } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { ProtectedRoute } from "@/components/protected-route";
import { AppLayout } from "@/components/layout/app-layout";

export const Route = createRootRoute({
  component: RootComponent,
});

// Routes that don't require authentication
const publicRoutes = ["/login", "/register"];

function RootComponent() {
  const location = useLocation();
  const isPublicRoute = publicRoutes.includes(location.pathname);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="homelab-theme">
      <AuthProvider>
        {isPublicRoute ? (
          // Public pages without layout (login, register)
          <Outlet />
        ) : (
          // Protected pages with sidebar layout
          <ProtectedRoute>
            <AppLayout>
              <Outlet />
            </AppLayout>
          </ProtectedRoute>
        )}
        <Toaster richColors position="bottom-right" />
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
