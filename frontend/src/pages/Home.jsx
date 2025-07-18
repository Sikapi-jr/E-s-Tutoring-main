import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useUser } from '../components/UserProvider';
import { Link } from 'react-router-dom';
import AnnouncementCarousel from '../components/AnnouncementCarousel';

function getInvoiceAgeColor(unixTimestamp) {
    if (!unixTimestamp) return "#f8d7da";
    const invoiceDate = new Date(unixTimestamp * 1000);
    const now = new Date();
    const diffDays = Math.floor((now - invoiceDate) / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) return "#d4edda";
    if (diffDays <= 14) return "#fff3cd";
    return "#f8d7da";
}

function Home() {
    const { user } = useUser();
    const [hours, setHours] = useState([]);
    const [students, setStudents] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [paidTotal, setPaidTotal] = useState(0);
    const [unpaidTotal, setUnpaidTotal] = useState(0);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await axios.get(`http://127.0.0.1:8000/api/homeParent/?id=${user.account_id}`);
                const safeHours = Array.isArray(res.data.hours) ? res.data.hours : [];
                const safeStudents = Array.isArray(res.data.students) ? res.data.students : [];
                const safeInvoices = Array.isArray(res.data.invoices) ? res.data.invoices : [];
                setHours(safeHours);
                setStudents(safeStudents);
                setInvoices(safeInvoices);

                let paid = 0, unpaid = 0;
                safeInvoices.forEach(inv => {
                    if (inv.paid) paid += parseFloat(inv.amount_paid || 0) / 100;
                    else unpaid += parseFloat(inv.amount_due || 0) / 100;
                });
                setPaidTotal(paid);
                setUnpaidTotal(unpaid);
            } catch (error) {
                console.error("Failed to fetch data:", error);
                setHours([]); setStudents([]); setInvoices([]);
            }
        }
        fetchData();
    }, [user]);

    const total = paidTotal + unpaidTotal;
    const paidPercentage = total ? (paidTotal / total) * 100 : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                textAlign: 'center',
                width: '100%',
                justifyContent: 'space-between',
                padding: '2%',
                boxSizing: 'border-box',
            }}>
                {/* LEFT COLUMN */}
                <div style={{
                    width: '20%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                }}>
                    <div style={{
                        border: '1px solid #ccc',
                        padding: '1rem',
                        borderRadius: '8px',
                        wordWrap: 'break-word'
                        }}>
                            <h3 style={{ textAlign: 'center', marginTop: '0.2rem', paddingBottom: '9rem' }}>Logged Hours</h3>
                        {hours.length === 0 ? (
                            <Link to="/request" style={{ color: '#192A88', alignContent: 'center', justifyContent: 'center',}}>
                                No hours yet? Request a tutor for your child.
                            </Link>
                        ) : hours.map(hour => (
                            <div key={hour.id} style={{ fontSize: '0.9rem', marginBottom: '0.8rem' }}>
                                <strong>{hour.student}</strong><br />
                                {hour.totalTime} hrs — {hour.subject}<br />
                                {hour.date}
                            </div>
                        ))}
                    </div>
                    <AnnouncementCarousel />
                </div>

                {/* MIDDLE */}
            
                {/* MIDDLE END COLUMN */}
                {/* RIGHT COLUMN */}
                <div style={{
                    width: '20%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem'
                }}>
                    <div style={{
                        border: '1px solid #ccc',
                        padding: '1rem',
                        borderRadius: '8px',
                        wordWrap: 'break-word'
                    }}>
                        <h3 style={{ textAlign: 'center', marginTop: '0.2rem' }}>Students</h3>
                        {students.length === 0 ? (
                            <Link to="/register" style={{ color: '#192A88' }}>
                                Don’t have any students? Register one.
                            </Link>
                        ) : students.map(s => <div key={s.id}>{s.username}</div>)}
                    </div>

                    {/* Progress Bar */}
                    <div>
                        <h4 style={{ textAlign: 'center', marginTop: '0.2rem' }}>Payment Progress</h4>
                        <div style={{
                            background: '#f8d7da',
                            width: '100%',
                            height: '20px',
                            borderRadius: '10px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${paidPercentage}%`,
                                height: '100%',
                                background: '#28a745',
                                transition: 'width 0.5s'
                            }} />
                        </div>
                        <p style={{ fontSize: '0.9rem', textAlign: 'center' }}>
                            {paidPercentage.toFixed(1)}% Paid
                        </p>
                    </div>

                    {/* Paid Invoices */}
                    <div style={{
                        border: '1px solid green',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        maxHeight: '180px',
                        overflowY: 'auto',
                        wordWrap: 'break-word'
                    }}>
                        <h4 style={{ textAlign: 'center', marginTop: '0.2rem' }}>Paid Invoices</h4>
                        {invoices.filter(i => i.paid).length === 0 ? (
                            <p>No paid invoices yet.</p>
                        ) : invoices.filter(i => i.paid).map(i => (
                            <a key={i.id} href={i.invoice_pdf} target="_blank" rel="noopener noreferrer"
                                style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div style={{
                                    backgroundColor: getInvoiceAgeColor(i.created),
                                    padding: '0.5rem',
                                    marginBottom: '0.5rem',
                                    borderRadius: '5px',
                                    fontSize: '0.9rem'
                                }}>
                                    <strong>${(i.amount_paid / 100).toFixed(2)}</strong> — {new Date(i.created * 1000).toLocaleDateString()}
                                </div>
                            </a>
                        ))}
                    </div>

                    {/* Unpaid Invoices */}
                    <div style={{
                        border: '1px solid red',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        maxHeight: '180px',
                        overflowY: 'auto',
                        wordWrap: 'break-word'
                    }}>
                        <h4 style={{ textAlign: 'center', marginTop: '0.2rem' }}>Unpaid Invoices</h4>
                        {invoices.filter(i => !i.paid).length === 0 ? (
                            <p>You’re all caught up!</p>
                        ) : invoices.filter(i => !i.paid).map(i => (
                            <a key={i.id} href={i.hosted_invoice_url} target="_blank" rel="noopener noreferrer"
                                style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div style={{
                                    backgroundColor: getInvoiceAgeColor(i.created),
                                    padding: '0.5rem',
                                    marginBottom: '0.5rem',
                                    borderRadius: '5px',
                                    fontSize: '0.9rem'
                                }}>
                                    <strong>${(i.amount_due / 100).toFixed(2)}</strong> — Due {i.due_date ? new Date(i.due_date * 1000).toLocaleDateString() : 'N/A'}
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Home;
