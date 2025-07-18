import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useUser } from "./UserProvider";

function AnnouncementCarousel() {
    const [announcements, setAnnouncements] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const { user } = useUser();

    useEffect(() => {
        axios.get(`http://127.0.0.1:8000/api/announcements/?id=${user.account_id}`)
            .then(res => setAnnouncements(res.data))
            .catch(err => console.error("Failed to load announcements", err));
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex(prev =>
                announcements.length > 0 ? (prev + 1) % announcements.length : 0
            );
        }, 5000);
        return () => clearInterval(interval);
    }, [announcements]);

    if (announcements.length === 0) return null;

    const current = announcements[currentIndex];

    return (
        <div style={{
            width: '100%',
            height: '300px',
            backgroundColor: '#000',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 0 10px rgba(0,0,0,0.3)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
        }}>
            {/* "What's New?" header */}
            <div style={{
                color: '#FFF',
                background: '#000',
                fontWeight: 'bold',
                fontSize: '1.7rem',
                height: '50px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                What's New?
            </div>

            {/* Top title bar */}
            <div style={{
                padding: '0.5rem',
                backgroundColor: '#292929',
                color: '#E8E496',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '0.95rem',
                zIndex: 2
            }}>
                {current.name || 'Announcement'}
            </div>

            {/* Image with arrows */}
            <div style={{
                position: 'relative',
                width: '100%',
                flexGrow: 1
            }}>
                {/* Image */}
                <img
                    key={currentIndex} // Triggers re-render for fade
                    src={`http://127.0.0.1:8000${current.image}`}
                    alt="Announcement"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        zIndex: 0,
                        opacity: 1,
                        transition: 'opacity 0.5s ease-in-out'
                    }}
                />

                {/* Left arrow */}
                <div onClick={() =>
                    setCurrentIndex((currentIndex - 1 + announcements.length) % announcements.length)
                } style={{
                    cursor: 'pointer',
                    position: 'absolute',
                    top: '50%',
                    left: '10px',
                    transform: 'translateY(-50%)',
                    fontSize: '2rem',
                    color: 'white',
                    opacity: '60%',
                    zIndex: 2
                }}>
                    &#9664;
                </div>

                {/* Right arrow */}
                <div onClick={() =>
                    setCurrentIndex((currentIndex + 1) % announcements.length)
                } style={{
                    cursor: 'pointer',
                    position: 'absolute',
                    top: '50%',
                    right: '10px',
                    transform: 'translateY(-50%)',
                    fontSize: '2rem',
                    color: 'white',
                    opacity: '60%',
                    zIndex: 2
                }}>
                    &#9654;
                </div>
            </div>

            {/* Bottom info bar */}
            <div style={{
                padding: '0.5rem',
                backgroundColor: '#292929',
                color: '#E8E496',
                fontSize: '0.8rem',
                textAlign: 'center',
                zIndex: 2
            }}>
                {current.address || ''}<br />
                {current.start_time || ''}
            </div>
        </div>
    );
}

export default AnnouncementCarousel;
