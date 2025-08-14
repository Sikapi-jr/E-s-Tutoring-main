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

  return (
    <div className="inv-wrapper">
      <div className="inv-card">
        <h1>{t('invoices.title')}</h1>

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
      </div>
    </div>
  );
};

export default ViewInvoices;
