import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api";
import "../styles/TutorReferralApproval.css";

const TutorReferralApproval = () => {
    const { t } = useTranslation();
    const { token } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [referralRequest, setReferralRequest] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [responseMessage, setResponseMessage] = useState("");

    useEffect(() => {
        fetchReferralRequest();
    }, [token]);

    const fetchReferralRequest = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/api/tutor-referral-approval/${token}/`);
            setReferralRequest(response.data);
            setError("");
        } catch (err) {
            console.error("Error fetching referral request:", err);
            setError(
                err.response?.data?.error ||
                "This referral request is no longer valid or has already been processed."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action) => {
        if (processing) return;

        const confirmMessage =
            action === "accept"
                ? `Are you sure you want to accept this tutoring request from ${referralRequest.parent_name} ${referralRequest.parent_lastname}?`
                : `Are you sure you want to decline this tutoring request? It will be posted to the general dashboard for other tutors.`;

        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            setProcessing(true);
            const response = await api.post(`/api/tutor-referral-approval/${token}/`, {
                action: action,
            });

            setSuccess(true);
            setResponseMessage(response.data.message);

            // Redirect after 3 seconds
            setTimeout(() => {
                navigate("/");
            }, 3000);
        } catch (err) {
            console.error(`Error ${action}ing referral:`, err);
            setError(
                err.response?.data?.error ||
                `Failed to ${action} referral request. Please try again.`
            );
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="referral-approval-wrapper">
                <div className="referral-approval-card">
                    <h1>Loading...</h1>
                    <p>Please wait while we fetch the referral request details...</p>
                </div>
            </div>
        );
    }

    if (error && !referralRequest) {
        return (
            <div className="referral-approval-wrapper">
                <div className="referral-approval-card error">
                    <h1>Request Not Found</h1>
                    <p className="error-message">{error}</p>
                    <button className="btn-primary" onClick={() => navigate("/")}>
                        Return to Home
                    </button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="referral-approval-wrapper">
                <div className="referral-approval-card success">
                    <div className="success-icon">✓</div>
                    <h1>Response Submitted</h1>
                    <p className="success-message">{responseMessage}</p>
                    <p>You will be redirected to the home page in a few seconds...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="referral-approval-wrapper">
            <div className="referral-approval-card">
                <h1>Tutoring Referral Request</h1>

                <div className="referral-info">
                    <div className="info-section">
                        <h2>Parent Information</h2>
                        <p>
                            <strong>Name:</strong> {referralRequest.parent_name}{" "}
                            {referralRequest.parent_lastname}
                        </p>
                        <p>
                            <strong>Email:</strong> {referralRequest.parent_email}
                        </p>
                    </div>

                    <div className="info-section">
                        <h2>Student Information</h2>
                        <p>
                            <strong>Name:</strong> {referralRequest.student_name}{" "}
                            {referralRequest.student_lastname}
                        </p>
                        <p>
                            <strong>Grade:</strong> {referralRequest.grade}
                        </p>
                    </div>

                    <div className="info-section">
                        <h2>Tutoring Details</h2>
                        <p>
                            <strong>Subject:</strong> {referralRequest.subject}
                        </p>
                        <p>
                            <strong>Service Type:</strong> {referralRequest.service}
                        </p>
                        <p>
                            <strong>City:</strong> {referralRequest.city}
                        </p>
                    </div>

                    {referralRequest.description && (
                        <div className="info-section">
                            <h2>Additional Details</h2>
                            <p className="description">{referralRequest.description}</p>
                        </div>
                    )}

                    <div className="info-section">
                        <h2>Request Date</h2>
                        <p>{new Date(referralRequest.created_at).toLocaleString()}</p>
                    </div>
                </div>

                {error && <p className="error-message">{error}</p>}

                <div className="action-buttons">
                    <button
                        className="btn-decline"
                        onClick={() => handleAction("decline")}
                        disabled={processing}
                    >
                        {processing ? "Processing..." : "Decline Request"}
                    </button>
                    <button
                        className="btn-accept"
                        onClick={() => handleAction("accept")}
                        disabled={processing}
                    >
                        {processing ? "Processing..." : "Accept Request"}
                    </button>
                </div>

                <div className="info-note">
                    <p>
                        <strong>Note:</strong> If you decline this request, it will be
                        automatically posted to the tutoring dashboard and made available to
                        all tutors.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TutorReferralApproval;
