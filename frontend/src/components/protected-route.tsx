import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { PageLoader } from "@/components/page-loader";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const navigate = useNavigate();
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate({ to: "/login" });
        }
    }, [isAuthenticated, isLoading, navigate]);

    // Show loading spinner while checking auth
    if (isLoading) {
        return <PageLoader />;
    }

    // Don't render children if not authenticated
    if (!isAuthenticated) {
        return (
            <PageLoader />
        );
    }

    return <>{children}</>;
}
