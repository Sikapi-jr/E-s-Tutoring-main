// Import necessary dependencies
import { Navigate } from "react-router-dom";  // For navigation if not authorized
import { jwtDecode } from "jwt-decode";      // For decoding JWT tokens
import api from "../api";                     // API instance to handle HTTP requests
import { REFRESH_TOKEN, ACCESS_TOKEN } from "../constants";  // Constants for token keys
import { useState, useEffect } from "react";  // React hooks for state and side effects

// ProtectedRoute component which checks if the user is authorized
function ProtectedRoute({ children }) {
    // State to track whether the user is authorized or not
    const [isAuthorized, setIsAuthorized] = useState(null);

    // useEffect hook to check authentication status when component mounts
    useEffect(() => {
        // Call the auth function, which checks if the user is authenticated
        auth().catch(() => setIsAuthorized(false))  // If an error occurs, set isAuthorized to false
    }, [])  // Empty dependency array to only run once when the component mounts

    // Function to refresh the token when it's expired
    const refreshToken = async () => {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN);  // Get the refresh token from localStorage
        try {
            // Send a POST request to refresh the token using the refresh token
            const res = await api.post("/api/token/refresh/", {
                refresh: refreshToken,
            });
            // If the response is successful (status code 200)
            if (res.status === 200) {
                // Store the new access token in localStorage and mark as authorized
                localStorage.setItem(ACCESS_TOKEN, res.data.access)
                setIsAuthorized(true)
            } else {
                // If the response is not successful, set authorization to false
                setIsAuthorized(false)
            }
        } catch (error) {
            // If there's an error (like a network error), log it and set isAuthorized to false
            console.log(error);
            setIsAuthorized(false);
        }
    };

    // Function to check if the current access token is valid
    const auth = async () => {
        const token = localStorage.getItem(ACCESS_TOKEN);  // Get the access token from localStorage
        if (!token) {
            // If there's no token, set isAuthorized to false
            setIsAuthorized(false);
            return;
        }
        // Decode the token to extract expiration time
        const decoded = jwtDecode(token);
        const tokenExpiration = decoded.exp;  // Get the expiration time from the token
        const now = Date.now() / 1000;  // Get the current time in seconds

        // If the token is expired, try to refresh it
        if (tokenExpiration < now) {
            await refreshToken();
        } else {
            // If the token is valid, mark the user as authorized
            setIsAuthorized(true);
        }
    };

    // If the authorization status is still unknown (null), show a loading message
    if (isAuthorized === null) {
        return <div>Loading...</div>;
    }

    // If the user is authorized, render the children components (protected route content)
    // Otherwise, redirect to the login page
    return isAuthorized ? children : <Navigate to="/login" />;
}

// Export the ProtectedRoute component to be used in other parts of the application
export default ProtectedRoute;
