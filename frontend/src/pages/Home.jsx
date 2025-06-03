import React from 'react';
import { useUser } from '../components/UserProvider';

function Home() {
    const { user } = useUser();
    console.log("Role:", user.roles);
    console.log("Is superuser:", user.is_superuser);

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
        </div>
    );
}

export default Home;
