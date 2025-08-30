import React from 'react';
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useUser } from '../components/UserProvider';
import Form from "../components/RequestForm";

function Request() {
    const { t } = useTranslation();
    const { user } = useUser();
    const navigate = useNavigate();

    // Early return if user is not loaded yet
    if (!user) {
        return (
            <div style={{ padding: "2rem", textAlign: "center" }}>
                <p>{t('common.loading')}</p>
            </div>
        );
    }

    if (user.roles !== "parent" && user.is_superuser === 0) {
        navigate("/login");
    }
    return (
        <div>
            <Form route="/api/requests/create/" method="request" />
        </div>
    );

}
export default Request