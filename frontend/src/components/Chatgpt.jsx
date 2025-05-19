import { useState, useEffect } from "react";

import "../styles/App.css";

function Chatgpt(){
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [sessionId, setSessionId] = useState(null);

    useEffect(() => {
        if (!sessionId) return;

        const intervalId = setInterval(async () => {  //setInterval allows a function to be ran on a polling system, on an interval
            const response = await fetch(`http://localhost:8000/api/chat/sessions/${sessionId}`, {method: "GET"}
            );
            const data = await response.json()
            setMessages(data.messages)
        }, 1000);

        return () => clearInterval(intervalId);
    }, [sessionId])

    const postMessage = async (sessionId, message) => {
        await fetch(`http://localhost:8000/api/chat/sessions/${sessionId}/`, {
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

            if (!sessionId) {
                const response = await fetch("http://localhost:8000/api/chat/sessions/", {
                    method: 'POST',
                });
                const data = await response.json();
                setSessionId(data.id); // Fire and forget
                await postMessage(data.id, message); // Use data.id directly
            } else {
                await postMessage(sessionId, message);
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

                                {message.role === "user" ? "Me: " : "AI: "}
                                {message.content}
                            </div>
                        )
                        
                    )

                        }

                    </div>
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