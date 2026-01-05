import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

// Google Client ID - should be configured in environment
const GOOGLE_CLIENT_ID = (window as any).GOOGLE_CLIENT_ID || '';

interface GoogleCredentialResponse {
    credential: string;
    select_by: string;
}

interface LoginButtonProps {
    onLoginSuccess?: () => void;
    onLoginError?: (error: string) => void;
    className?: string;
}

export const LoginButton: React.FC<LoginButtonProps> = ({
    onLoginSuccess,
    onLoginError,
    className = '',
}) => {
    const { login, isAuthenticated, user, logout } = useAuth();
    const buttonRef = useRef<HTMLDivElement>(null);
    const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
    const [showMigrateModal, setShowMigrateModal] = useState(false);
    const [pendingToken, setPendingToken] = useState<string | null>(null);

    // Load Google Identity Services script
    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) {
            console.warn('GOOGLE_CLIENT_ID not configured');
            return;
        }

        // Check if script already loaded
        if ((window as any).google?.accounts?.id) {
            setIsGoogleLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => setIsGoogleLoaded(true);
        document.body.appendChild(script);

        return () => {
            // Cleanup not needed for this script
        };
    }, []);

    // Initialize Google Sign-In button
    useEffect(() => {
        if (!isGoogleLoaded || !buttonRef.current || !GOOGLE_CLIENT_ID || isAuthenticated) {
            return;
        }

        const handleCredentialResponse = async (response: GoogleCredentialResponse) => {
            try {
                // Check if there are unauthenticated "orphan" data to migrate
                const res = await fetch('/api/auth/check-migrate');
                const { canMigrate } = await res.json();

                if (canMigrate) {
                    setPendingToken(response.credential);
                    setShowMigrateModal(true);
                } else {
                    // No data to migrate, login directly
                    const success = await login(response.credential, false);
                    if (success) onLoginSuccess?.();
                    else onLoginError?.('Login failed');
                }
            } catch (error) {
                console.error("Migration check failed, falling back to direct login", error);
                const success = await login(response.credential, false);
                if (success) onLoginSuccess?.();
                else onLoginError?.('Login failed');
            }
        };

        try {
            console.log("Initializing Google Auth with IDs:", GOOGLE_CLIENT_ID);
            (window as any).google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleCredentialResponse,
                auto_select: false,
                cancel_on_tap_outside: true,
                prompt: 'select_account', // Force account picker
            });

            (window as any).google.accounts.id.renderButton(buttonRef.current, {
                theme: 'filled_blue',
                size: 'large',
                type: 'standard',
                text: 'signin_with',
                shape: 'rectangular',
                logo_alignment: 'left',
                width: 250,
            });
        } catch (error) {
            console.error('Failed to initialize Google Sign-In:', error);
        }
    }, [isGoogleLoaded, isAuthenticated]);

    const handleMigrateChoice = async (migrate: boolean) => {
        if (!pendingToken) return;

        setShowMigrateModal(false);

        if (!migrate) {
            // If user says "No", we clear the orphan data so the modal doesn't show up again
            try {
                await fetch('/api/auth/clear-orphan', { method: 'POST' });
            } catch (e) {
                console.error("Failed to clear orphan data", e);
            }
        }

        const success = await login(pendingToken, migrate);
        setPendingToken(null);

        if (success) {
            onLoginSuccess?.();
        } else {
            onLoginError?.('Login failed');
        }
    };

    // If not configured, show a placeholder
    if (!GOOGLE_CLIENT_ID) {
        return (
            <div className={`text-center p-4 ${className}`}>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Google OAuth not configured.
                    <br />
                    Set GOOGLE_CLIENT_ID in environment.
                </p>
            </div>
        );
    }

    // If authenticated, show user info and logout button
    if (isAuthenticated && user) {
        return (
            <div className={`flex items-center gap-3 ${className}`}>
                {user.picture && (
                    <img
                        src={user.picture}
                        alt={user.name}
                        className="w-8 h-8 rounded-full border-2 border-blue-500"
                    />
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                    </p>
                </div>
                <button
                    onClick={logout}
                    className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                    Salir
                </button>
            </div>
        );
    }

    return (
        <>
            <div ref={buttonRef} className={className} />

            {/* Migration Modal */}
            {showMigrateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            ¡Bienvenido!
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Hemos detectado datos existentes (carteras y notas) guardados sin una cuenta.
                            ¿Deseas migrar estos datos a tu cuenta de Google?
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => handleMigrateChoice(false)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                No, empezar de cero
                            </button>
                            <button
                                onClick={() => handleMigrateChoice(true)}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                            >
                                Sí, migrar datos
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default LoginButton;
