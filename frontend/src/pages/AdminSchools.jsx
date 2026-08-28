// src/pages/AdminSchools.jsx
// Admin management page for the school list used by the student-creation
// dropdown: add schools, toggle "gives free hours", and set credit hours.
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useUser } from "../components/UserProvider";
import { ONTARIO_CITIES } from "../constants";

const SCHOOL_TYPES = [
  { value: "", label: "—" },
  { value: "elementary", label: "Elementary" },
  { value: "high", label: "High School" },
  { value: "other", label: "Other/K-12" },
];

const LANGUAGE_STREAMS = [
  { value: "", label: "—" },
  { value: "english", label: "English" },
  { value: "french", label: "French" },
  { value: "french_immersion", label: "French Immersion" },
];

const emptyForm = {
  name: "", city: "", school_type: "", language_stream: "", board_name: "",
  gives_credits: false, credit_hours: "0",
};

const AdminSchools = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();

  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [savingId, setSavingId] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    if (user && !user.is_superuser && user.roles !== 'admin') {
      navigate("/login");
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/admin/schools/");
      setSchools(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching schools:", err);
      setError(t('common.error', 'Error') + ": failed to load schools");
    } finally {
      setLoading(false);
    }
  };

  const patchSchool = async (id, patch) => {
    setSavingId(id);
    try {
      const res = await api.patch(`/api/admin/schools/${id}/`, patch);
      setSchools((prev) => prev.map((s) => (s.id === id ? res.data : s)));
    } catch (err) {
      console.error("Error updating school:", err);
      alert("Failed to update school.");
    } finally {
      setSavingId(null);
    }
  };

  const handleAddSchool = async () => {
    if (!addForm.name.trim()) {
      alert("Please enter a school name.");
      return;
    }
    try {
      const res = await api.post("/api/admin/schools/", {
        ...addForm,
        credit_hours: addForm.credit_hours || 0,
      });
      setSchools((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      setShowAddModal(false);
      setAddForm(emptyForm);
    } catch (err) {
      console.error("Error creating school:", err);
      alert(err?.response?.data?.name?.[0] || "Failed to create school.");
    }
  };

  if (!user) return <div style={{ padding: "2rem", textAlign: "center" }}><p>{t('common.loading')}</p></div>;
  if (!user.is_superuser && user.roles !== 'admin') return null;

  const visibleSchools = showInactive ? schools : schools.filter((s) => s.is_active);

  return (
    <div className="dash-wrapper">
      <div className="dash-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ margin: 0, color: '#192A88' }}>{t('admin.manageSchools', 'Manage Schools')}</h1>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setShowAddModal(true)}
              style={{ padding: '0.6rem 1.2rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
            >
              + {t('admin.addSchool', 'Add School')}
            </button>
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          {t('admin.showInactiveSchools', 'Show inactive schools')}
        </label>

        {error && <div style={{ color: '#721c24', backgroundColor: '#f8d7da', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem' }}>{error}</div>}

        {loading ? (
          <p>{t('common.loading')}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
              <thead>
                <tr style={{ backgroundColor: '#192A88', color: 'white' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>{t('admin.schoolName', 'Name')}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>{t('admin.schoolCity', 'City')}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>{t('admin.schoolBoard', 'Board')}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>{t('admin.givesCredits', 'Gives Free Hours')}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>{t('admin.creditHours', 'Credit Hours')}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>{t('admin.active', 'Active')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleSchools.map((school, idx) => (
                  <tr key={school.id} style={{ backgroundColor: idx % 2 === 0 ? '#f8f9fa' : 'white', opacity: school.is_active ? 1 : 0.55 }}>
                    <td style={{ padding: '0.75rem' }}>
                      <strong>{school.name}</strong>
                      {school.language_stream && (
                        <div style={{ fontSize: '0.75rem', color: '#666' }}>
                          {LANGUAGE_STREAMS.find(l => l.value === school.language_stream)?.label}
                          {school.school_type ? ` · ${SCHOOL_TYPES.find(t2 => t2.value === school.school_type)?.label}` : ''}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{school.city || '—'}</td>
                    <td style={{ padding: '0.75rem' }}>{school.board_name || '—'}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={!!school.gives_credits}
                        disabled={savingId === school.id}
                        onChange={(e) => patchSchool(school.id, { gives_credits: e.target.checked })}
                      />
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        defaultValue={school.credit_hours}
                        disabled={savingId === school.id || !school.gives_credits}
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (val !== String(school.credit_hours)) {
                            patchSchool(school.id, { credit_hours: val });
                          }
                        }}
                        style={{ width: '70px', padding: '0.35rem', textAlign: 'center' }}
                      />
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={!!school.is_active}
                        disabled={savingId === school.id}
                        onChange={(e) => patchSchool(school.id, { is_active: e.target.checked })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', maxWidth: '480px', margin: '10vh auto' }}>
            <h2>{t('admin.addSchool', 'Add School')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              <input
                type="text"
                placeholder="School name"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                style={{ padding: '0.6rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <select
                value={addForm.city}
                onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                style={{ padding: '0.6rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="">Select a city (optional)</option>
                {ONTARIO_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={addForm.school_type}
                onChange={(e) => setAddForm({ ...addForm, school_type: e.target.value })}
                style={{ padding: '0.6rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                {SCHOOL_TYPES.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <select
                value={addForm.language_stream}
                onChange={(e) => setAddForm({ ...addForm, language_stream: e.target.value })}
                style={{ padding: '0.6rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                {LANGUAGE_STREAMS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <input
                type="text"
                placeholder="Board name (optional, e.g. TDSB)"
                value={addForm.board_name}
                onChange={(e) => setAddForm({ ...addForm, board_name: e.target.value })}
                style={{ padding: '0.6rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={addForm.gives_credits}
                  onChange={(e) => setAddForm({ ...addForm, gives_credits: e.target.checked })}
                />
                {t('admin.givesCredits', 'Gives Free Hours')}
              </label>
              {addForm.gives_credits && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {t('admin.creditHours', 'Credit Hours')}:
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={addForm.credit_hours}
                    onChange={(e) => setAddForm({ ...addForm, credit_hours: e.target.value })}
                    style={{ width: '80px', padding: '0.4rem' }}
                  />
                </label>
              )}
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button onClick={() => { setShowAddModal(false); setAddForm(emptyForm); }} style={{ padding: '0.6rem 1.2rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                {t('common.cancel')}
              </button>
              <button onClick={handleAddSchool} style={{ padding: '0.6rem 1.2rem', backgroundColor: '#192A88', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSchools;
