import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const HomePopup = () => {
    const { t } = useTranslation();
    const [popup, setPopup] = useState(null);
    const [show, setShow] = useState(false);

    useEffect(() => {
        // Fetch active popups for the user
        const fetchPopup = async () => {
            try {
                const response = await api.get('/api/popups/');
                if (response.data && response.data.length > 0) {
                    // Show the first active popup
                    setPopup(response.data[0]);
                    setShow(true);
                }
            } catch (error) {
                console.error('Error fetching popup:', error);
            }
        };

        fetchPopup();
    }, []);

    const handleDismiss = async () => {
        if (!popup) return;

        try {
            await api.post('/api/popups/dismiss/', { popup_id: popup.id });
            setShow(false);
            setPopup(null);
        } catch (error) {
            console.error('Error dismissing popup:', error);
            // Still close the popup on error
            setShow(false);
            setPopup(null);
        }
    };

    if (!show || !popup) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 9999,
            }}
            onClick={handleDismiss}
        >
            <div
                style={{
                    backgroundColor: 'white',
                    borderRadius: 12,
                    padding: '2rem',
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    position: 'relative',
                    minWidth: '400px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button (X) */}
                <button
                    onClick={handleDismiss}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'none',
                        border: 'none',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        color: '#666',
                        fontWeight: 'bold',
                        lineHeight: 1,
                        padding: '0.25rem',
                    }}
                    title={t('common.close', 'Close')}
                >
                    ×
                </button>

                {/* Popup content */}
                <div style={{ marginTop: '0.5rem' }}>
                    {popup.title && (
                        <h2 style={{ color: '#192A88', marginBottom: '1rem', marginTop: 0 }}>
                            {popup.title}
                        </h2>
                    )}

                    {popup.image && (
                        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                            <img
                                src={`${API_BASE_URL}${popup.image}`}
                                alt={popup.title || 'Popup'}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '400px',
                                    objectFit: 'contain',
                                    borderRadius: 8,
                                }}
                            />
                        </div>
                    )}

                    {popup.content && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <p style={{ color: '#666', lineHeight: 1.6, fontSize: '1rem', whiteSpace: 'pre-wrap' }}>
                                {popup.content}
                            </p>
                        </div>
                    )}

                    {popup.link && (
                        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                            <a
                                href={popup.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-block',
                                    backgroundColor: '#192A88',
                                    color: 'white',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '6px',
                                    textDecoration: 'none',
                                    fontWeight: 'bold',
                                    fontSize: '1rem',
                                }}
                            >
                                {popup.link_text || t('popups.learnMore', 'Learn More')}
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HomePopup;
