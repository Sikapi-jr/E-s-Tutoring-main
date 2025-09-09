import { useState, useEffect } from "react";

import "../styles/App.css";

function Chatgpt(){
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [rateLimited, setRateLimited] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [retryTimeout, setRetryTimeout] = useState(null);

    useEffect(() => {
        if (!sessionId) return;

        const intervalId = setInterval(async () => {  //setInterval allows a function to be ran on a polling system, on an interval
            const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
            const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}`, {method: "GET"}
            );
            const data = await response.json()
            const prevLength = messages.length;
            setMessages(data.messages)
            
            // Stop loading when new message arrives
            if (data.messages.length > prevLength && isLoading) {
                setIsLoading(false);
            }
        }, 1000);

        return () => clearInterval(intervalId);
    }, [sessionId])
    
    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (retryTimeout) {
                clearTimeout(retryTimeout);
            }
        };
    }, [retryTimeout])

    const postMessage = async (sessionId, message) => {
        const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}/`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json", //Tells backend to expect content to be json content
            },
            body: JSON.stringify({message: message }) //String version of JSON message 
        });
        
        if (response.status === 429) {
            const errorData = await response.json();
            setErrorMessage(errorData.error);
            setRateLimited(true);
            setIsLoading(false);
            
            // Auto-reset after 15 seconds
            const timeout = setTimeout(() => {
                setRateLimited(false);
                setErrorMessage("");
            }, 15000);
            setRetryTimeout(timeout);
            
            throw new Error('Rate limited');
        }
        
        return response;
    }

    const sendMessage = async (e) => {
        if (e.key === 'Enter' && message.trim() && !rateLimited) {
            const newMessage = { role: "user", content: message };
            setMessages(prev => [newMessage, ...prev]); 
            setMessage("");
            setIsLoading(true);
            setErrorMessage("");

            try {
                if (!sessionId) {
                    const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
                    const response = await fetch(`${API_BASE_URL}/api/chat/sessions/`, {
                        method: 'POST',
                    });
                    
                    if (response.status === 429) {
                        const errorData = await response.json();
                        setErrorMessage(errorData.error);
                        setRateLimited(true);
                        setIsLoading(false);
                        
                        // Auto-reset after 15 seconds
                        const timeout = setTimeout(() => {
                            setRateLimited(false);
                            setErrorMessage("");
                        }, 15000);
                        setRetryTimeout(timeout);
                        
                        return;
                    }
                    
                    const data = await response.json();
                    setSessionId(data.id);
                    await postMessage(data.id, message);
                } else {
                    await postMessage(sessionId, message);
                }
            } catch (error) {
                console.error('Error sending message:', error);
                setErrorMessage('Failed to send message. Please try again.');
                setIsLoading(false);
            }
        }
    };


    return (
        <div className="wrapper">
            <div className="chat-wrapper">
                <div className="chat-history">
                    <div>
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`message${message.role === "user" ? " user" : ""}`} //If role is user, add user class in addition to message class. Thats how we get alternating colors
                                > 

                                {message.role === "user" ? "Me: " : "EGS Chat Bot: "}
                                {message.content}
                            </div>
                        )
                        
                    )

                        }

                    </div>
                    
                    {isLoading && (
                        <div className="loading-message">
                            <div className="loading-avatar">EGS Chat Bot:</div>
                            <div className="loading-dots">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    )}
                    
                    {errorMessage && (
                        <div className="error-message" style={{
                            background: '#ffe6e6',
                            border: '1px solid #ff9999',
                            borderRadius: '8px',
                            padding: '12px',
                            margin: '10px 0',
                            color: '#cc0000'
                        }}>
                            <strong>Error:</strong> {errorMessage}
                            {rateLimited && (
                                <div style={{ marginTop: '8px', fontSize: '0.9em' }}>
                                    <em>Please wait before sending more messages.</em>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <input
                    type="text"
                    placeholder={rateLimited ? "Rate limited - please wait..." : "Type a message..."}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyUp={sendMessage}
                    disabled={rateLimited}
                    style={{
                        opacity: rateLimited ? 0.6 : 1,
                        cursor: rateLimited ? 'not-allowed' : 'text'
                    }}
                />
            </div>

        </div>


    )

}

export default Chatgpt; 