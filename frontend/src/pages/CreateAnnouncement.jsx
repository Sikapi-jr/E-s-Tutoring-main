import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';

function CreateAnnouncement() {
    const { t } = useTranslation();
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
            const res = await api.post('/api/announcements/create/', data, {
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
                            checked={selectedRoles.includes('student')}
                            onChange={() => handleRoleChange('student')}
                        />
                        {t('announcements.students')}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={selectedRoles.includes('tutor')}
                            onChange={() => handleRoleChange('tutor')}
                        />
                        {t('announcements.tutors')}
                    </label>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#666', margin: '0.5rem 0' }}>
                    {t('announcements.selected')}: {selectedRoles.includes('all') ? t('announcements.everyone') : selectedRoles.join(', ')}
                </p><br />

                <label>{t('announcements.imageOptional')}</label><br />
                <input type="file" name="image" accept="image/*" onChange={handleImageChange} /><br /><br />

                <button type="submit">{t('common.submit')}</button>
            </form>
        </div>
    );
}

export default CreateAnnouncement;
