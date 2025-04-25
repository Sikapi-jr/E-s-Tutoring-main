import React from 'react';
import { useUser } from '../components/UserProvider';
import Form from "../components/RequestForm";

function Request() {

    const { user } = useUser();
    return (
        <div>
            <h1>Hi!</h1>
            {user ? (
                <div>
                    <p>Username: {user.username || 'N/A'}</p>
                    <p>Email: {user.email || 'N/A'}</p>
                    <p>Role: {user.roles}</p>
                    <p>Parent: {user.parent}</p>
                    {/* Add any additional user fields here */}
                </div>
            ) : (
                <p>No user logged in.</p>
            )}
            <Form route="/api/requests/create/" method="request" />
        </div>
    );

}
export default Request