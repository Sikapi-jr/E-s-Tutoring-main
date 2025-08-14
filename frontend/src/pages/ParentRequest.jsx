import React from 'react';
import { useTranslation } from "react-i18next";
import { useUser } from '../components/UserProvider';
import Form from "../components/RequestForm";

function Request() {
    
    const { user } = useUser();

    if (user.roles !== "parent" && user.is_superuser===0){
        navigate("/login");
    }
    return (
        <div>
            <Form route="/api/requests/create/" method="request" />
        </div>
    );

}
export default Request