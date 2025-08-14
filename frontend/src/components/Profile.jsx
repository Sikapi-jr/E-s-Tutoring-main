import React from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "./UserProvider";

function Profile() {
    const { t } = useTranslation();
    const { user } = useUser();

    return (
        <div>
            <h1>{t('navigation.profile')}</h1>
            {user ? (
                <div>
                    <p>{t('auth.username')}: {user.username}</p>
                    <p>{t('common.email')}: {user.email}</p>
                    <p>{t('auth.role')}: {user.roles}</p>
                    <p>{t('auth.parent')}: {user.parent}</p>
                </div>
            ) : (
                <p>{t('auth.noUserLoggedIn')}</p>
            )}
        </div>
    );
}

export default Profile;
