import React from "react";
import { useUser } from "./UserProvider";

function Profile() {
    const { user } = useUser();

    return (
        <div>
            <h1>Profile</h1>
            {user ? (
                <div>
                    <p>Username: {user.username}</p>
                    <p>Email: {user.email}</p>
                    <p>Role: {user.roles}</p>
                    <p>Parent: {user.parent}</p>
                </div>
            ) : (
                <p>No user is logged in.</p>
            )}
        </div>
    );
}

export default Profile;
