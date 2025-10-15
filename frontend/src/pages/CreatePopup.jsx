import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';

function CreatePopup() {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        link: '',
        link_text: '',
        audience: 'all',
        image: null,
        is_active: true,
        expires_at: ''
    });

    const [selectedRoles, setSelectedRoles] = useState(['all']);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
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
            if (formData[key] !== null && formData[key] !== '') {
                data.append(key, formData[key]);
            }
        });

        try {
            const res = await api.post('/api/popups/create/', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert(t('admin.popupCreatedSuccess', 'Popup created successfully!'));
            setFormData({
                title: '',
                content: '',
                link: '',
                link_text: '',
                audience: 'all',
                image: null,
                is_active: true,
                expires_at: ''
            });
            setSelectedRoles(['all']);
        } catch (err) {
            console.error(err);
            alert(t('admin.popupCreatedFailed', 'Failed to create popup. Please try again.'));
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>{t('popups.createPopup', 'Create Popup')}</h2>
            <form onSubmit={handleSubmit}>

                <label>{t('popups.title', 'Title')} *</label><br />
                <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
                /><br />

                <label>{t('popups.content', 'Content')} *</label><br />
                <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleChange}
                    rows={6}
                    required
                    style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
                /><br />

                <label>{t('popups.linkOptional', 'Link (Optional)')}</label><br />
                <input
                    type="url"
                    name="link"
                    value={formData.link}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
                /><br />

                <label>{t('popups.linkText', 'Link Button Text')}</label><br />
                <input
                    type="text"
                    name="link_text"
                    value={formData.link_text}
                    onChange={handleChange}
                    placeholder={t('popups.linkTextPlaceholder', 'Learn More')}
                    style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
                /><br />

                <label>{t('announcements.audienceSelectOneOrMore', 'Audience (select one or more)')}</label><br />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '0.5rem 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={selectedRoles.includes('all')}
                            onChange={() => handleRoleChange('all')}
                        />
                        {t('announcements.everyone', 'Everyone')}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={selectedRoles.includes('parent')}
                            onChange={() => handleRoleChange('parent')}
                        />
                        {t('announcements.parents', 'Parents')}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={selectedRoles.includes('student')}
                            onChange={() => handleRoleChange('student')}
                        />
                        {t('announcements.students', 'Students')}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={selectedRoles.includes('tutor')}
                            onChange={() => handleRoleChange('tutor')}
                        />
                        {t('announcements.tutors', 'Tutors')}
                    </label>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#666', margin: '0.5rem 0' }}>
                    {t('announcements.selected', 'Selected')}: {selectedRoles.includes('all') ? t('announcements.everyone', 'Everyone') : selectedRoles.join(', ')}
                </p><br />

                <label>{t('popups.imageOptional', 'Image (Optional)')}</label><br />
                <input
                    type="file"
                    name="image"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ marginBottom: '1rem' }}
                /><br />

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleChange}
                    />
                    {t('popups.isActive', 'Active (show immediately)')}
                </label>

                <label>{t('popups.expiresAt', 'Expiration Date (Optional)')}</label><br />
                <input
                    type="datetime-local"
                    name="expires_at"
                    value={formData.expires_at}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
                /><br />

                <button
                    type="submit"
                    style={{
                        backgroundColor: '#192A88',
                        color: 'white',
                        border: 'none',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        width: '100%'
                    }}
                >
                    {t('common.submit', 'Submit')}
                </button>
            </form>
        </div>
    );
}

export default CreatePopup;
