import React, { useState } from 'react';
import axios from 'axios';
import './PrintFacilityManager.css';

const PrintFacilityManager = ({ facilities, onFacilityChange }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    isActive: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (editingFacility) {
        // Update existing facility
        await axios.put(`/api/print-facilities/${editingFacility.id}`, formData);
      } else {
        // Create new facility
        await axios.post('/api/print-facilities', formData);
      }
      
      onFacilityChange();
      resetForm();
    } catch (error) {
      console.error('Error saving facility:', error);
      setError(error.response?.data?.error || 'Failed to save facility');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (facility) => {
    setEditingFacility(facility);
    setFormData({
      name: facility.name,
      contactPerson: facility.contactPerson,
      email: facility.email,
      phone: facility.phone || '',
      address: facility.address,
      city: facility.city,
      state: facility.state,
      zipCode: facility.zipCode,
      country: facility.country,
      isActive: facility.isActive === 1
    });
    setShowForm(true);
  };

  const handleDelete = async (facilityId) => {
    if (!window.confirm('Are you sure you want to delete this print facility?')) {
      return;
    }

    try {
      await axios.delete(`/api/print-facilities/${facilityId}`);
      onFacilityChange();
    } catch (error) {
      console.error('Error deleting facility:', error);
      setError(error.response?.data?.error || 'Failed to delete facility');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States',
      isActive: true
    });
    setEditingFacility(null);
    setShowForm(false);
    setError('');
  };

  return (
    <div className="print-facility-manager">
      <div className="card">
        <div className="facility-header">
          <h3>Print Facilities</h3>
          <button 
            className="btn" 
            onClick={() => setShowForm(true)}
            disabled={showForm}
          >
            Add New Facility
          </button>
        </div>

        {showForm && (
          <div className="facility-form">
            <h4>{editingFacility ? 'Edit Facility' : 'Add New Facility'}</h4>
            
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Facility Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="form-control"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="contactPerson">Contact Person *</label>
                  <input
                    type="text"
                    id="contactPerson"
                    name="contactPerson"
                    className="form-control"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="form-control"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="phone">Phone</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    className="form-control"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="address">Address *</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  className="form-control"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="city">City *</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    className="form-control"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="state">State/Province *</label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    className="form-control"
                    value={formData.state}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="zipCode">ZIP/Postal Code *</label>
                  <input
                    type="text"
                    id="zipCode"
                    name="zipCode"
                    className="form-control"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="country">Country *</label>
                  <select
                    id="country"
                    name="country"
                    className="form-control"
                    value={formData.country}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Germany">Germany</option>
                    <option value="France">France</option>
                    <option value="Australia">Australia</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                  />
                  Active Facility
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : (editingFacility ? 'Update Facility' : 'Add Facility')}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetForm}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="facilities-list">
          {facilities.length === 0 ? (
            <p>No print facilities found. Add your first facility above.</p>
          ) : (
            facilities.map(facility => (
              <div key={facility.id} className={`facility-item ${!facility.isActive ? 'inactive' : ''}`}>
                <div className="facility-info">
                  <div className="facility-header">
                    <h4>{facility.name}</h4>
                    <span className="facility-id">ID: {facility.id}</span>
                  </div>
                  <p><strong>Contact:</strong> {facility.contactPerson}</p>
                  <p><strong>Email:</strong> {facility.email}</p>
                  {facility.phone && <p><strong>Phone:</strong> {facility.phone}</p>}
                  <p><strong>Address:</strong> {facility.address}, {facility.city}, {facility.state} {facility.zipCode}</p>
                  <p><strong>Status:</strong> {facility.isActive ? 'Active' : 'Inactive'}</p>
                </div>
                
                <div className="facility-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleEdit(facility)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(facility.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PrintFacilityManager; 