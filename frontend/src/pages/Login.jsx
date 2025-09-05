import React, { useEffect } from 'react';
import Form from "../components/LoginForm"

function Login() {
    // Add Google gtag
    useEffect(() => {
        // Load Google Analytics script
        const gtagScript = document.createElement('script');
        gtagScript.async = true;
        gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=AW-16675525968';
        document.head.appendChild(gtagScript);

        // Add gtag configuration
        const configScript = document.createElement('script');
        configScript.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'AW-16675525968');
        `;
        document.head.appendChild(configScript);

        // Cleanup function
        return () => {
            document.head.removeChild(gtagScript);
            document.head.removeChild(configScript);
        };
    }, []);
    //Specifying route we want to send a message to, and specifying that method is "login"
    return <Form route="/api/token/" method="login" />
}

export default Login