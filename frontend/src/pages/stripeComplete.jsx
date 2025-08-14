import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";



export default function StripeReauth() {
  const { uid, token } = useParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/api/stripe/reauth/${uid}/${token}/`)
      .then((res) => res.data)
      .then((data) => {
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
