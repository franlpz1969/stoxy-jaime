import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// Types
interface User {
    id: string;
    email: string;
    name: string;
    picture: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (idToken: string, migrateExisting?: boolean) => Promise<boolean>;
    logout: () => void;
    getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys
const TOKEN_KEY = 'stoxy_auth_token';
const USER_KEY = 'stoxy_user';

// API Base URL
const API_BASE = '';

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
            try {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            } catch (e) {
                // Invalid stored data, clear it
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
            }
        }
        setIsLoading(false);
    }, []);

    // Verify token is still valid on mount
    useEffect(() => {
        if (token) {
            fetch(`${API_BASE}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then((res) => {
                    if (!res.ok) {
                        // Token is invalid, logout
                        logout();
                    }
                })
                .catch(() => {
                    // Network error, keep token for offline use
                });
        }
    }, [token]);

    const login = useCallback(async (idToken: string, migrateExisting = false): Promise<boolean> => {
        try {
            const response = await fetch(`${API_BASE}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken, migrateExisting }),
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('Login failed:', error);
                return false;
            }

            const data = await response.json();

            // Store in state
            setUser(data.user);
            setToken(data.token);

            // Persist to localStorage
            localStorage.setItem(TOKEN_KEY, data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));

            return true;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    }, []);

    const logout = useCallback(() => {
        // Clear state
        setUser(null);
        setToken(null);

        // Clear storage
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);

        // Notify server (optional, for logging)
        fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' }).catch(() => { });
    }, []);

    const getAuthHeaders = useCallback((): Record<string, string> => {
        if (token) {
            return { Authorization: `Bearer ${token}` };
        }
        return {};
    }, [token]);

    const value: AuthContextType = {
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        getAuthHeaders,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
