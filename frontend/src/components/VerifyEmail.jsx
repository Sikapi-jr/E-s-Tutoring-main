import { useParams } from "react-router-dom";
import { useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function VerifyEmail() {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .post("http://localhost:8000/api/verifyEmail/", { uid, token })
      .then((res) => {
        alert("Email verified!");
        navigate("/");
      })
      .catch((err) => {
        alert("Verification failed.");
      });
  }, [uid, token]);

  return <p>Verifying your email...</p>;
}