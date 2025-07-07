import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";



export default function StripeReauth() {
  const { uid, token } = useParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("uid:", uid)
    console.log("token:", token)
    axios
      .get(`http://127.0.0.1:8000/api/stripe/reauth/${uid}/${token}/`)
      .then((res) => res.json())
      .then((data) => {
        console.log(data)
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert("Failed to load onboarding link.");
        }
      })
      .catch(() => alert("Error retrying onboarding."))
      .finally(() => setLoading(false));
  }, [uid, token]);

  return (
    <div>
      <h2>{loading ? "Preparing Stripe setup..." : "Redirecting..."}</h2>
    </div>
  );
}
