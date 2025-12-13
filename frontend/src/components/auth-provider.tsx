import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
    api,
    type User,
    type LoginRequest,
    type RegisterRequest,
    getStoredUser,
    getStoredToken,
    removeStoredToken,
    isAuthenticated as checkAuth,
} from "@/lib/api";

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (data: LoginRequest) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        if (getStoredToken()) {
            try {
                const response = await api.validateToken();
                if (response.valid && response.user) {
                    setUser(response.user);
                } else {
                    removeStoredToken();
                    setUser(null);
                }
            } catch {
                removeStoredToken();
                setUser(null);
            }
        } else {
            setUser(null);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        // Check for stored user on mount
        const storedUser = getStoredUser();
        if (storedUser) {
            setUser(storedUser);
        }
        refreshUser();
    }, [refreshUser]);

    const login = async (data: LoginRequest) => {
        const response = await api.login(data);
        setUser(response.user);
    };

    const register = async (data: RegisterRequest) => {
        const response = await api.register(data);
        setUser(response.user);
    };

    const logout = async () => {
        try {
            await api.logout();
        } catch {
            // Ignore errors during logout - token might already be invalid
        }
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user && checkAuth(),
                isLoading,
                login,
                register,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
