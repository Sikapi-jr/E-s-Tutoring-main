import React from "react";
import { useUser } from './UserProvider';
import { Link } from "react-router-dom";

const Navbar = () => {
  const { user } = useUser();
  const role = user.roles;

  if (role === "parent" && user.is_superuser === false){
    return (
    <nav className="navbar">
      <h2 className="logo">EGS Tutoring</h2>
      <ul className="nav-links">
        <li><Link to="/">Home</Link></li>
        <li><Link to="/profile">Profile</Link></li>
        <li><Link to="/login">login</Link></li>
        <li><Link to="/register">Register</Link></li>
        <li><Link to="/request">Request a tutor</Link></li>
        <li><Link to="/request-reply">Replies</Link></li>
        <li><Link to="/calendar">Calendar</Link></li>
        <li><Link to="/ViewInvoices">View Invoices</Link></li>
        <li><Link to="/MonthlyHours">View Monthly Hours</Link></li>
        <li><Link to="/chatgpt">Chat</Link></li>
      </ul>
    </nav>
  );
  }

  if (role === "student" && user.is_superuser === false){
    return (
      <nav className="navbar">
        <h2 className="logo">EGS Tutoring</h2>
        <ul className="nav-links">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/profile">Profile</Link></li>
          <li><Link to="/calendar">Calendar</Link></li>
          <li><Link to="/chatgpt">Chat</Link></li>
        </ul>
      </nav>
  );}

  if (user.is_superuser === true){
    return (
      <nav className="navbar">
        <h2 className="logo">EGS Tutoring</h2>
        <ul className="nav-links">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/profile">Profile</Link></li>
          <li><Link to="/login">login</Link></li>
          <li><Link to="/register">Register</Link></li>
          <li><Link to="/parent-dashboard">Dashboard</Link></li>
          <li><Link to="/request">Request a tutor</Link></li>
          <li><Link to="/request-reply">Replies</Link></li>
          <li><Link to="/log">Log Hours</Link></li>
          <li><Link to="/calendar">Calendar</Link></li>
          <li><Link to="/WeeklyHours">Weekly Hours</Link></li>
          <li><Link to="/verify-email">Verify Email</Link></li>
          <li><Link to="/ViewInvoices">View Invoices</Link></li>
          <li><Link to="/chatgpt">Chat</Link></li>

        </ul>
    </nav>

  );}


};

export default Navbar;