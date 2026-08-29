import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useUser } from '../components/UserProvider';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function CreateAnnouncement() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useUser();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        address: '',
        start_time: '',
        end_time: '',
        link: '',
        audience: 'all',
        image: null
    });

    const [selectedRoles, setSelectedRoles] = useState(['all']);

    const [pastAnnouncements, setPastAnnouncements] = useState([]);
    const [loadingPast, setLoadingPast] = useState(true);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        if (user && !user.is_superuser && user.roles !== 'admin') {
            navigate('/login');
        }
    }, [user, navigate]);

    useEffect(() => {
        fetchPastAnnouncements();
    }, []);

    const fetchPastAnnouncements = async () => {
        try {
            setLoadingPast(true);
            const res = await api.get('/api/announcements/admin/all/');
            setPastAnnouncements(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching past announcements:', err);
        } finally {
            setLoadingPast(false);
        }
    };

    const handleDelete = async (announcement) => {
        if (!window.confirm(t('announcements.confirmDelete', 'Delete "{{name}}"? This cannot be undone.', { name: announcement.name || `#${announcement.id}` }))) {
            return;
        }
        try {
            setDeletingId(announcement.id);
            await api.delete(`/api/announcements/${announcement.id}/delete/`);
            setPastAnnouncements((prev) => prev.filter((a) => a.id !== announcement.id));
        } catch (err) {
            console.error('Error deleting announcement:', err);
            alert(t('announcements.deleteFailed', 'Failed to delete announcement.'));
        } finally {
            setDeletingId(null);
        }
    };

    const isExpired = (announcement) => announcement.expires_at && new Date(announcement.expires_at) < new Date();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        setFormData(prev => ({ ...prev, image: e.target.files[0] }));
    };

    const handleRoleChange = (role) => {
        if (role === 'all') {
            setSelectedRoles(['all']);
            setFormData(prev => ({ ...prev, audience: 'all' }));
        } else {
            let newRoles = [...selectedRoles];

            // Remove 'all' if selecting specific roles
            if (newRoles.includes('all')) {
                newRoles = newRoles.filter(r => r !== 'all');
            }

            if (newRoles.includes(role)) {
                newRoles = newRoles.filter(r => r !== role);
            } else {
                newRoles.push(role);
            }

            // If no roles selected, default to 'all'
            if (newRoles.length === 0) {
                newRoles = ['all'];
            }

            setSelectedRoles(newRoles);
            setFormData(prev => ({ ...prev, audience: newRoles.join(',') }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (formData[key]) {
                data.append(key, formData[key]);
            }
        });

        try {
            await api.post('/api/announcements/create/', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert(t('admin.announcementCreatedSuccess'));
            setFormData({
                name: '',
                description: '',
                address: '',
                start_time: '',
                end_time: '',
                link: '',
                audience: 'all',
                image: null
            });
            setSelectedRoles(['all']);
            fetchPastAnnouncements();
        } catch (err) {
            console.error(err);
            alert(t('admin.announcementCreatedFailed'));
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>{t('announcements.createAnnouncement')}</h2>
            <form onSubmit={handleSubmit}>

                <label>{t('announcements.name')}</label><br />
                <input type="text" name="name" value={formData.name} onChange={handleChange} /><br /><br />

                <label>{t('common.description')}</label><br />
                <textarea name="description" value={formData.description} onChange={handleChange} rows={4} /><br /><br />

                <label>{t('common.address')}</label><br />
                <input type="text" name="address" value={formData.address} onChange={handleChange} /><br /><br />

                <label>{t('logHours.startTime')}</label><br />
                <input type="datetime-local" name="start_time" value={formData.start_time} onChange={handleChange} /><br /><br />

                <label>{t('logHours.endTime')}</label><br />
                <input type="datetime-local" name="end_time" value={formData.end_time} onChange={handleChange} /><br /><br />

                <label>{t('announcements.linkOptional')}</label><br />
                <input type="url" name="link" value={formData.link} onChange={handleChange} /><br /><br />

                <label>{t('announcements.audienceSelectOneOrMore')}</label><br />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '0.5rem 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={selectedRoles.includes('all')}
                            onChange={() => handleRoleChange('all')}
                        />
                        {t('announcements.everyone')}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={selectedRoles.includes('parent')}
                            onChange={() => handleRoleChange('parent')}
                        />
                        {t('announcements.parents')}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={selectedRoles.includes('tutor')}
                            onChange={() => handleRoleChange('tutor')}
                        />
                        {t('announcements.tutors')}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={selectedRoles.includes('admin')}
                            onChange={() => handleRoleChange('admin')}
                        />
                        {t('announcements.admins', 'Admins')}
                    </label>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#666', margin: '0.5rem 0' }}>
                    {t('announcements.selected')}: {selectedRoles.includes('all') ? t('announcements.everyone') : selectedRoles.join(', ')}
                </p><br />

                <label>{t('announcements.imageOptional')}</label><br />
                <input type="file" name="image" accept="image/*" onChange={handleImageChange} /><br /><br />

                <button type="submit">{t('common.submit')}</button>
            </form>

            <hr style={{ margin: '2rem 0' }} />

            <h3>{t('announcements.pastAnnouncements', 'Past Announcements')}</h3>
            {loadingPast ? (
                <p>{t('common.loading')}</p>
            ) : pastAnnouncements.length === 0 ? (
                <p style={{ color: '#666' }}>{t('announcements.noPastAnnouncements', 'No announcements yet.')}</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {pastAnnouncements.map((announcement) => {
                        const expired = isExpired(announcement);
                        return (
                            <div
                                key={announcement.id}
                                style={{
                                    border: '1px solid #ddd',
                                    borderRadius: '6px',
                                    padding: '0.75rem 1rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    backgroundColor: expired ? '#f8f9fa' : 'white',
                                    opacity: expired ? 0.75 : 1,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                                    {announcement.image && (
                                        <img
                                            src={`${API_BASE_URL}${announcement.image}`}
                                            alt=""
                                            style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }}
                                        />
                                    )}
                                    <div style={{ minWidth: 0 }}>
                                        <strong>{announcement.name || `#${announcement.id}`}</strong>
                                        {expired && (
                                            <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', fontWeight: 'bold', color: '#856404' }}>
                                                {t('announcements.expired', 'EXPIRED')}
                                            </span>
                                        )}
                                        <div style={{ fontSize: '0.8rem', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {announcement.audience === 'all' ? t('announcements.everyone') : announcement.audience}
                                            {' · '}
                                            {new Date(announcement.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(announcement)}
                                    disabled={deletingId === announcement.id}
                                    style={{
                                        padding: '0.4rem 0.8rem',
                                        backgroundColor: '#dc3545',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: deletingId === announcement.id ? 'not-allowed' : 'pointer',
                                        flexShrink: 0,
                                    }}
                                >
                                    {deletingId === announcement.id ? t('admin.processing', 'Processing...') : t('common.delete', 'Delete')}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default CreateAnnouncement;
