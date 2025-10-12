import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { ACCESS_TOKEN } from "../constants";
import { useTokenRefresh } from "../utils/useTokenRefresh";

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem("user");
        const accessToken = localStorage.getItem(ACCESS_TOKEN);
        // Only restore user if we have both user data and a valid token
        return (savedUser && accessToken) ? JSON.parse(savedUser) : null;
    });

    // Auto-refresh token on page navigation
    useTokenRefresh();

    useEffect(() => {
        if (user) {
            localStorage.setItem("user", JSON.stringify(user));
        } else {
            localStorage.removeItem("user");
        }
    }, [user]);

    // Check for token changes and clear user if token is removed
    useEffect(() => {
        const checkTokenSync = () => {
            const accessToken = localStorage.getItem(ACCESS_TOKEN);
            if (!accessToken && user) {
                // Token was removed but user still exists - clear user
                setUser(null);
            }
        };

        // Check immediately
        checkTokenSync();

        // Listen for storage changes (when tokens are cleared by API interceptor)
        const handleStorageChange = (e) => {
            if (e.key === ACCESS_TOKEN && !e.newValue && user) {
                setUser(null);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        
        // Also check periodically in case storage events don't fire
        const interval = setInterval(checkTokenSync, 1000);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, [user]);

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        user,
        setUser
    }), [user]);

    return (
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
