import React, { useState, useEffect } from "react";
import axios from "axios";
import { useUser } from '../components/UserProvider';
import { useNavigate } from "react-router-dom";

const ViewInvoices = () => {
  const [requests, setRequests] = useState([]);
  const { user } = useUser();
  const email = user.email;
  const navigate = useNavigate();
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedRequestID, setSelectedRequestID] = useState(null);



  if (user.roles !== "parent" && user.is_superuser===0){
        navigate("/login");
    }
    

  const handleMessageClick = (request) => {
    window.location.href = (request.link);
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
        const response = await axios.get(`http://127.0.0.1:8000/api/invoiceList/?email=${email}`);
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
                        <strong>Created:</strong> {request.date} <br />
                        <strong>Amount:</strong> {request.amount} <br />
                        <strong>Due Date:</strong> {request.due_date} <br />
                        <strong>Status:</strong> {request.status} <br />
                        <div>
                            <button onClick={() => handleMessageClick(request)}>
                              View Invoice
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

export default ViewInvoices;
