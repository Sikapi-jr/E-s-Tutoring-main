import React, { useState, useEffect } from "react";
import axios from "axios";
import { useUser } from '../components/UserProvider';
import { useNavigate } from "react-router-dom";

const ParentDashboard = () => {
  const [requests, setRequests] = useState([]);
  const { user } = useUser();
  const tutor = user.username;
  const navigate = useNavigate();
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedRequestID, setSelectedRequestID] = useState(null);



  if (user.roles !== "tutor" && user.is_superuser===0){
        navigate("/login");
    }
    

  const handleMessageClick = (request) => {
    setSelectedRequestID(request.id)
    setMessage(null)
    setShowReplyBox(!showReplyBox) //Will toggle the reply box on and off
    console.log(request.id)
    console.log(tutor)
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Handle submit:" + message)
    

    try {

        const payload = { 
            request: selectedRequestID,  
            tutor: user.username,
            message,
            
        };  //Payload to be sent to backend as a POST request
        const response = await axios.post('http://127.0.0.1:8000/api/requests/reply/', payload)
        console.log("BACKEND RECEIVED");
        navigate(0) //Refresh page
 
      }        
         
        catch (error) {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            setError(`Server responded with: ${error.response.status} - ${error.response.data.message}`);
        } else if (error.request) {
            // The request was made but no response was received
            setError("No response from server. Please check your network.");
        } else {
            // Something happened in setting up the request that triggered an Error
            setError("Error setting up registration request: " + error.message);
        }
    }
  };
  
  

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:8000/api/requests/list/');
        console.log("Response data:", response.data);
        setRequests(response.data); 
      } catch (error) {
        console.error("Error fetching requests:", error);
      }
    };

    fetchRequests();
  }, []);

  return (
    <div>
        <h1>Parent Dashboard</h1>
        {requests.length === 0 ? (
            <p>No requests available.</p>
        ) : (
            <ul>
                {requests.map((request, index) => (
                    <li key={index}>
                        <strong>ID:</strong> {request.id} <br />
                        <strong>Parent:</strong> {request.parent} <br />
                        <strong>Student:</strong> {request.student} <br />
                        <strong>Subject:</strong> {request.subject} <br />
                        <strong>Grade:</strong> {request.grade} <br />
                        <strong>Service:</strong> {request.service} <br />
                        <strong>Description:</strong> {request.description} <br />
                        <strong>Created At:</strong> {new Date(request.created_at).toLocaleString()}
                        <div>
                            <button onClick={() => handleMessageClick(request)}>
                                {selectedRequestID === request.id && showReplyBox ? 'Cancel' : 'Reply'}  
                            </button>
                        </div>
                        <br></br>
                        <br></br>
                        <br></br>
                        
                        {selectedRequestID === request.id && showReplyBox && (
            <form onSubmit={handleSubmit}>
                <input
                    className="form-input"
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your message! Introduce yourself, your best subjects, and years of experience."
                    required
                />
                
                <button type="submit">Send Message</button>
                <br></br>
                <br></br>
                <br></br>
                <br></br>
            </form>
        )}
                    </li>
                ))}
            </ul>
        )}

        <p>{error}</p>
    </div>
);
};

export default ParentDashboard;
