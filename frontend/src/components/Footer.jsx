// src/components/Footer.jsx
import React from "react";
import "../styles/Footer.css";

export default function Footer(){
  return (
    <footer className="footer">
      <div className="footer-column">
        <h4>About</h4>
        <ul>
          <li><a href="/about">Our Mission</a></li>
          <li><a href="/team">Team</a></li>
          <li><a href="/careers">Careers</a></li>
        </ul>
      </div>

      <div className="footer-column">
        <h4>Services</h4>
        <ul>
          <li><a href="/tutoring">Tutoring</a></li>
          <li><a href="/pricing">Pricing</a></li>
          <li><a href="/faq">FAQ</a></li>
        </ul>
      </div>

      <div className="footer-column">
        <h4>Contact</h4>
        <ul>
          <li><a href="/contact">Email Us</a></li>
          <li><a href="/support">Support</a></li>
          <li><a href="/terms">Terms of Use</a></li>
        </ul>
      </div>
    </footer>
  );
};
