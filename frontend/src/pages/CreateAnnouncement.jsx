import React, { useState } from 'react';
import api from '../api';

function CreateAnnouncement() {
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
            alert('Announcement created successfully!');
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
            alert('Failed to create announcement.');
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Create Announcement</h2>
            <form onSubmit={handleSubmit}>

                <label>Name</label><br />
                <input type="text" name="name" value={formData.name} onChange={handleChange} /><br /><br />

                <label>Description</label><br />
                <textarea name="description" value={formData.description} onChange={handleChange} rows={4} /><br /><br />

                <label>Address</label><br />
                <input type="text" name="address" value={formData.address} onChange={handleChange} /><br /><br />

                <label>Start Time</label><br />
                <input type="datetime-local" name="start_time" value={formData.start_time} onChange={handleChange} /><br /><br />

                <label>End Time</label><br />
                <input type="datetime-local" name="end_time" value={formData.end_time} onChange={handleChange} /><br /><br />

                <label>Link (optional)</label><br />
                <input type="url" name="link" value={formData.link} onChange={handleChange} /><br /><br />

                <label>Audience (select one or more)</label><br />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '0.5rem 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={selectedRoles.includes('all')}
                            onChange={() => handleRoleChange('all')}
                        />
                        Everyone
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={selectedRoles.includes('parent')}
                            onChange={() => handleRoleChange('parent')}
                        />
                        Parents
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={selectedRoles.includes('student')}
                            onChange={() => handleRoleChange('student')}
                        />
                        Students
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={selectedRoles.includes('tutor')}
                            onChange={() => handleRoleChange('tutor')}
                        />
                        Tutors
                    </label>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#666', margin: '0.5rem 0' }}>
                    Selected: {selectedRoles.includes('all') ? 'Everyone' : selectedRoles.join(', ')}
                </p><br />

                <label>Image (optional)</label><br />
                <input type="file" name="image" accept="image/*" onChange={handleImageChange} /><br /><br />

                <button type="submit">Submit</button>
            </form>
        </div>
    );
}

export default CreateAnnouncement;
