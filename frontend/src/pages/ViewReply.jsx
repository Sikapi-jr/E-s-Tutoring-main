import React, { useState, useEffect } from "react";
import axios from "axios";
import { useUser } from '../components/UserProvider';
import { useNavigate } from "react-router-dom";


const ViewReply = () => {
    const { user } = useUser();
    const [replies, setreplies] = useState([]);
    const [showReplies, setShowReplies] = useState(false);
    const [requests, setrequests] = useState([]);
    const [selectedRequestID, setSelectedRequestID] = useState(null);
    const [error, setError] = useState("");
    const parent = user.account_id;
    const navigate = useNavigate();

    if (user.roles !== "parent" && user.is_superuser===0){
        navigate("/login");
    }
    

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const response = await axios.get(`http://127.0.0.1:8000/api/requests/PersonalList/?parent=${parent}`);
                setrequests(response.data);
            }
            catch (error) {
                console.error("Error fetching user requests:", error);
              }

        }

        if (parent) {
            fetchRequests();
          }

    }, [parent]);

    const handleRequestSelection = async (request) => {
        const requestID = request.id
        setSelectedRequestID(requestID)
        setShowReplies(!showReplies)
        try {
            const responseR = await axios.get(`http://127.0.0.1:8000/api/requests/ViewReply/?parent=${parent}&selectedRequestID=${request.id}`);
            setreplies(responseR.data);
        }
        catch (error) {
            console.error("Error fetching replies")
        }
    }

    const handleAcceptedReply = async (request, reply) => {
        //Instead of using setStudent... which updates the state a little later, just use normal variables to ensure that the values are set asap (Race conditions)
        const student = request.student
        const tutor = reply.tutor

        const payload = {
            request : request.id,
            parent,
            student,
            tutor,
        }
        console.log(parent)
        console.log(student)
        console.log(tutor)

        try{
            const reponseA = await axios.post(`http://127.0.0.1:8000/api/requests/AcceptReply/`, payload);
            console.log("You have been paired with this tutor")
            navigate(0)
            
        }
        catch (error) {
            console.error("Error creating relation")

        }
        
    }

    const handleDeniedReply = async (request, reply) => {
        

        try{
            const reponseB = await axios.post(`http://127.0.0.1:8000/api/requests/RejectReply/?replyID=${reply.id}`);
            navigate(0)
            console.log("Deleted Reply")
            
        }
        catch (error) {
            console.error("Error creating relation")

        }

    
    }


    return (
        <div>
            <h1>Your Requests</h1>
            {requests.length === 0 ? (
                <p>No requests made.</p>
            ) : (
                <ul>
                    {requests.map((request, index) => (
                        <li key={request.id}>
                            <strong>ID:</strong> {request.id} <br />
                            <strong>Student:</strong> {request.student} <br />
                            <strong>Subject:</strong> {request.subject} <br />
                            <strong>Grade:</strong> {request.grade} <br />
                            <strong>Service:</strong> {request.service} <br />
                            <strong>Description:</strong> {request.description} <br />
                            <strong>Created At:</strong> {new Date(request.created_at).toLocaleString()}
                            <div>
                                <button onClick={() => handleRequestSelection(request)}>
                                    {selectedRequestID === request.id && showReplies ? 'Cancel' : 'View Replies'}  
                                </button>
                            </div>
                            <br></br>
                            
                            {selectedRequestID === request.id && showReplies && (
                                <ul>
                                    {replies.map((reply, index) =>                                        
                                        <li key={reply.id}>
                                            <strong>Message: </strong> {reply.message} <br />
                                            <strong>Sent at: </strong> {reply.created_at} <br />
                                            <strong>Email (For further communication/questions)</strong> {reply.created_at} <br />
                                            <button onClick={() => handleAcceptedReply(request, reply)}>Accepted</button> 
                                            <button onClick={() => handleDeniedReply(request, reply)}>Decline</button>
                                            <br></br>
                                            <br></br>
                                        </li>
                                        )
                                    }
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
              )}
    
            <p>{error}</p>
        </div>
    );
};

export default ViewReply
