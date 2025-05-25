import React, { useState, useEffect } from "react";
import axios from "axios";
import { useUser } from '../components/UserProvider';
import { useNavigate } from "react-router-dom";


const SendWeekly = () => {
    const { user } = useUser();
    const [currentDay, setcurrentDay] = useState(new Date());
    const [replies, setreplies] = useState([]);
    const [showReplies, setShowReplies] = useState(false);
    const [hours, setHours] = useState([]);
    const [total, setTotal] = useState([]);
    const [selectedRequestID, setSelectedRequestID] = useState(null);
    const [error, setError] = useState("");
    const parent = user.username;
    const navigate = useNavigate();
    
    if (user.is_superuser===0){
        navigate("/login");
    }
    
    const confirmButtonClick = async (hours) => {
        try {
            const response = await axios.post(`http://127.0.0.1:8000/api/weeklyHours/`, total);
            if (response.status === 201){
              alert("Weekly hours created!");
            }
            else if(response.status === 301){
              alert("Duplicate. Nothing created");
            }

            else {
              alert("Something happened");
            }
        }
        catch (error) {
            console.error("Error fetching weekly hours: ", error);
            }

    }

    
    const handleButtonClick = async (currentDay) => {
        try {
            const response = await axios.get(`http://127.0.0.1:8000/api/weeklyHours/?currentDay=${currentDay}`);
            setHours(response.data);
            const responseB = await axios.get(`http://127.0.0.1:8000/api/calculateHours/?currentDay=${currentDay}`);
            setTotal(responseB.data);
        }
        catch (error) {
            console.error("Error fetching weekly hours: ", error);
            }

    }

    const handleCheckout = async (currentDay) => {
        try {
            const response = await axios.post(`http://127.0.0.1:8000/api/checkout/?currentDay=${currentDay}`);
        }
        catch (error) {
            console.error("Error fetching sending stripe invoices: ", error);
            }

    }

    return (
        <div>
          <h1>Weekly Hours</h1>
          <form onSubmit={(e) => {
            e.preventDefault(); // prevent reload
            handleButtonClick(currentDay)}
          }>
                      <input
                        className="form-input"
                        type="date"
                        value={currentDay}
                        onChange={(e) => setcurrentDay(e.target.value)}
                        placeholder="Date today (Monday)"
                        required
                    />
              <button type="submit">Fetch Hours</button>
          </form>
          
          {hours.length === 0 ? (
            <p>No hours to fetch.</p>
          ) : (
            <ul>
              {hours.map((hour, index) => (
                <li key={hour.id}>
                  <strong>ID:</strong> {hour.id} <br />
                  <strong>Student:</strong> {hour.student} <br />
                  <strong>Parent:</strong> {hour.parent} <br />
                  <strong>Tutor:</strong> {hour.tutor} <br />
                  <strong>Date:</strong> {hour.date} <br />
                  <strong>Start:</strong> {hour.startTime} <br />
                  <strong>End:</strong> {hour.endTime} <br />
                  <strong>Total:</strong> {hour.totalTime} <br />
                  <strong>Subject:</strong> {hour.subject} <br />
                  <strong>Location:</strong> {hour.location} <br />
                  <strong>Notes:</strong> {hour.notes} <br />
                  <strong>Created At:</strong> {new Date(hour.created_at).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
          <p>-------------------------------------------------------------------------------------------</p>
          {total.length === 0 ? (
            <p>No total to calculate.</p>
          ) : (
            <ul>
              {total.map((hour, index) => (
                <li key={hour.id}>
                  <strong>Date:</strong> {hour.date} <br />
                  <strong>Parent:</strong> {hour.parent} <br />
                  <strong>Online Hours:</strong> {hour.OnlineHours} <br />
                  <strong>In-Person Hours:</strong> {hour.InPersonHours} <br />
                  <strong>Total Before Tax:</strong> {hour.TotalBeforeTax} <br />
                  <strong>Created At:</strong> {new Date(hour.created_at).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
          
          <p>{error}</p>
          <button onClick={() =>  confirmButtonClick(hours)}>Looks good?</button>
          <button onClick={() =>  handleCheckout(currentDay)}>CHECKOUT</button>
        </div>
      );
    
};
    

export default SendWeekly
