import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import { useUser } from "../components/UserProvider";
import { useNavigate } from "react-router-dom";
import "../styles/ViewInvoices.css";          // stylings below

const ViewInvoices = () => {
  const { user } = useUser();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [showRefModal, setShowRefModal] = useState(false);
  const [refEmail, setRefEmail] = useState("");

  // Early return if user is not loaded yet
  if (!user) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  const email = user.email;

  /* gate‑keep */
  if (user.roles !== "parent" && user.is_superuser === 0) {
    navigate("/login");
  }

  /* state */
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState("");

  /* fetch list */
  useEffect(() => {
    api
      .get(`/api/invoiceList/?email=${email}`)
      .then(res => setInvoices(res.data))
      .catch(() => setError(t('errors.couldNotLoadInvoices')));
  }, [email]);

  /* view hosted invoice */
  const handleOpen = inv => {
    window.location.href = inv.link;
  };

  /* helper for colour class */
  const rowClass = status => {
    const s = String(status).toLowerCase();
    if (s === "open") return "inv-open";
    if (s === "paid") return "inv-paid";
    return "";
  };

  /* create referral */
  const createReferral = async () => {
    try {
      await api.post("/api/referral/create/", {
        receiver_email: refEmail,
        sender_id: user.account_id,
      });
      setShowRefModal(false);
      setRefEmail("");
      alert(t('settings.referralSent', 'Referral sent successfully!'));
    } catch (err) {
      console.error("Referral creation failed", err);
      const errorMsg = err.response?.data?.error || t('settings.referralFailed', 'Failed to send referral');
      alert(errorMsg);
    }
  };

  return (
    <div className="inv-wrapper">
      <div className="inv-card">
        <h1>{t('invoices.title')}</h1>

        {/* Referral message */}
        <div style={{
          backgroundColor: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong style={{ color: '#856404', fontSize: '1.1rem' }}>
              💰 {t('invoices.referralPromo', 'Refer a friend and earn $65 off your next invoice!')}
            </strong>
            <p style={{ color: '#856404', margin: '0.5rem 0 0 0', fontSize: '0.95rem' }}>
              {t('invoices.referralDescription', 'Share EGS Tutoring with friends and family. When they sign up and complete 4 hours, you both save!')}
            </p>
          </div>
          <button
            onClick={() => setShowRefModal(true)}
            style={{
              backgroundColor: '#192A88',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              marginLeft: '1rem'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#0d1654'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#192A88'}
          >
            {t('settings.sendReferral', 'Send Referral')}
          </button>
        </div>

        {invoices.length === 0 ? (
          <p>{t('invoices.noInvoices')}</p>
        ) : (
          <ul className="inv-list">
            {invoices.map(inv => (
              <li
                key={inv.id}
                className={`inv-box ${rowClass(inv.status)}`}
              >
                <strong>{t('invoices.invoiceNumber')}</strong> {inv.id} <br />
                <strong>{t('invoices.createdDate')}:</strong> {inv.date} <br />
                <strong>{t('invoices.amount')}:</strong> {inv.amount/100}$ <br />
                <strong>{t('invoices.dueDate')}:</strong> {inv.due_date} <br />
                <strong>{t('common.status')}:</strong> {inv.status} <br />
                <button
                  className="open-btn"
                  onClick={() => handleOpen(inv)}
                >
                  {t('invoices.viewInvoice')}
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="error-message">{error}</p>}

        {/* Referral modal */}
        {showRefModal && (
          <div className="modal-backdrop" onClick={() => setShowRefModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%'
            }}>
              <h2 style={{ marginBottom: '1.5rem', color: '#192A88' }}>
                {t('settings.sendReferral', 'Send Referral')}
              </h2>
              <label style={{ display: 'block', marginBottom: '1rem' }}>
                <span style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  {t('settings.receiverEmail', 'Receiver Email')}
                </span>
                <input
                  type="email"
                  value={refEmail}
                  onChange={(e) => setRefEmail(e.target.value)}
                  placeholder="friend@example.com"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #ccc',
                    fontSize: '1rem'
                  }}
                />
              </label>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  onClick={() => setShowRefModal(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '6px',
                    border: '1px solid #ccc',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={createReferral}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#192A88',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  {t('common.send', 'Send')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewInvoices;
