import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useSupabaseAuth.jsx";

function SupabaseProtectedRoute({ children, requiredRole = null }) {
    const { user, profile, loading } = useAuth();
    const { t } = useTranslation();

    if (loading) {
        return <div className="loading-spinner">{t('common.loading')}</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Check if email is confirmed
    if (!user.email_confirmed_at) {
        return (
            <div className="auth-message">
                <h2>{t('auth.emailNotConfirmed')}</h2>
                <p>{t('auth.pleaseCheckEmail')}</p>
            </div>
        );
    }

    // Check role if specified
    if (requiredRole && profile?.role !== requiredRole) {
        return (
            <div className="auth-message">
                <h2>{t('auth.accessDenied')}</h2>
                <p>{t('auth.insufficientPermissions')}</p>
            </div>
        );
    }

    return children;
}

export default SupabaseProtectedRoute;