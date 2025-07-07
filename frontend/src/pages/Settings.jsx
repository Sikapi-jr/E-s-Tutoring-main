import React, { useState, useEffect } from "react";
import axios from "axios";
import api from "../api";
import { useUser } from '../components/UserProvider';
import { useNavigate } from "react-router-dom";

const Settings = () => {
    const { user } = useUser();
    const firstName = user.firstName;
    const lastName = user.lastName;
    const parent = user.username;
    const [replyStudents, setReplyStudents] = useState([]);
    const [replyTutor, setReplyTutor] = useState([]);
    const [replyRequests, setReplyRequests] = useState([]);
    const [showCancel, setShowCancel] = useState(false);
    const [error, setError] = useState("");

    const handleTutorChange = async (request) => {
        setShowCancel(!showCancel);
        console.log("showCancel changed");
        const payload = {
            student: request.student,
            value: showCancel,
        }
        try {
            const response = await api.post(`http://127.0.0.1:8000/api/requests/TutorChange/`, payload);
        } catch (error) {
            console.error("Error changing tutors:", error);
          }
    };
    useEffect(() => {

        const fetchStudents = async () => {
          try {
            // Replace the URL with your actual endpoint that returns the student list
            const response1 = await api.get(`/api/requests/AcceptReply/?parent=${parent}`);
            setReplyStudents(response1.data);
          } catch (error) {
            console.error("Error fetchng students:", error);
          }
        };

        fetchStudents();

        const fetchRequests = async () => {
          try {
            // Replace the URL with your actual endpoint that returns the student list
            const response2 = await axios.get(`http://127.0.0.1:8000/api/requests/PersonalList/?parent=${parent}`);
            setReplyRequests(response2.data);
          } catch (error) {
            console.error("Error fetchng requests:", error);
          }
        };
        fetchRequests();
    }, []);
    
    return (
        <div>
            <h1>SETTINGS</h1>
            <p>First Name: {user.firstName}</p>
            <p>Last Name: {user.lastName}</p>
            {replyStudents.length === 0 ? (
                <p>No student accounts made.</p>
            ) : (
                <ul>
                    <p>STUDENTS</p> <br />
                    {replyStudents.map((student, index) =>{
                        return (
                        <li key={student.id}>
                            <strong>Username:</strong> {student.student_user} <p>  -  </p><strong>Tutor:</strong> {student.tutor}<button onClick={() => handleTutorChange(student)}>{showCancel ? 'Cancel' : 'Change Tutor'} </button><br />
                            <p>---------------------------------------------</p>
                            <br></br>
                        </li>
                    )})}
                </ul>
              )}
              {replyRequests.length === 0 ? (
                <p>No requests made.</p>
            ) : (
                <ul>
                    <p>REQUESTS</p> <br />
                    {replyRequests.map((request, index) => (
                        <li key={request.id}>
                            <strong>ID:</strong> {request.id} <br />
                            <strong>Student:</strong> {request.student} <br />
                            <strong>Subject:</strong> {request.subject} <br />
                            <strong>Grade:</strong> {request.grade} <br />
                            <strong>Service:</strong> {request.service} <br />
                            <strong>Description:</strong> {request.description} <br />
                            <strong>Created At:</strong> {new Date(request.created_at).toLocaleString()}
                            <p>---------------------------------------------</p>
                            <br></br>
                        </li>
                    ))}
                </ul>
              )}
    
            <p>{error}</p>
        </div>
    );
};



export default Settings;