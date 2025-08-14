import React from "react";
import logo from "../../../media/EGS_LOGO.png";

export default function EGSLogo({ style, ...props }) {
  return (
    <img
      src={logo}
      alt="EGS Tutoring Logo"
      style={{ height: 50, ...style, marginLeft: 20, marginTop: 5 }}
      {...props}
    />
  );
}
 