import { useState, useEffect } from "react";

import "../styles/App.css";

function Chatgpt(){
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

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

    const postMessage = async (sessionId, message) => {
        const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
        await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}/`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json", //Tells backend to expect content to be json content
            },
            body: JSON.stringify({message: message }) //String version of JSON message 
        })
    }

    const sendMessage = async (e) => {
        if (e.key === 'Enter' && message.trim()) {
            const newMessage = { role: "user", content: message };
            setMessages(prev => [newMessage, ...prev]); 
            setMessage("");
            setIsLoading(true);

            try {
                if (!sessionId) {
                    const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
                    const response = await fetch(`${API_BASE_URL}/api/chat/sessions/`, {
                        method: 'POST',
                    });
                    const data = await response.json();
                    setSessionId(data.id); // Fire and forget
                    await postMessage(data.id, message); // Use data.id directly
                } else {
                    await postMessage(sessionId, message);
                }
            } catch (error) {
                console.error('Error sending message:', error);
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
                </div>
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyUp={sendMessage}                                                
                />
            </div>

        </div>


    )

}

export default Chatgpt; 