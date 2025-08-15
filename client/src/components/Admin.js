import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import './Admin.css';
import PrintFacilityManager from './PrintFacilityManager';
import OrderManager from './OrderManager';
import PrintShopCompletion from './PrintShopCompletion';

const Admin = () => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Get current tab from URL
  const currentTab = location.pathname.split('/').pop() || 'facilities';
  
  // Handle the case where /admin is accessed directly
  const effectiveTab = currentTab === 'admin' ? 'facilities' : currentTab;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersResponse, facilitiesResponse] = await Promise.all([
        axios.get('/api/orders'),
        axios.get('/api/print-facilities')
      ]);
      
      setOrders(ordersResponse.data);
      setFacilities(facilitiesResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderAssignment = async (orderId, facilityId) => {
    try {
      if (facilityId) {
        await axios.post(`/api/orders/${orderId}/assign-facility`, { printFacilityId: facilityId });
      } else {
        await axios.post(`/api/orders/${orderId}/unassign-facility`);
      }
      
      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error assigning facility:', error);
      setError('Failed to assign facility to order');
    }
  };

  const handleRegeneratePDF = async (orderId) => {
    try {
      await axios.post(`/api/orders/${orderId}/regenerate-pdf`);
      setError(null); // Clear any previous errors
      // Show success message (you could add a success state if needed)
    } catch (error) {
      console.error('Error regenerating PDF:', error);
      setError(error.response?.data?.error || 'Failed to regenerate PDF');
    }
  };

  if (loading) {
    return (
      <div className="admin">
        <div className="card">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin">
        <div className="card">
          <div className="error-message">{error}</div>
          <button className="btn" onClick={fetchData}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin">
      <div className="card">
        <h2>Admin Dashboard</h2>
        <p>Manage print facilities and order assignments</p>
      </div>

      <div className="admin-tabs">
        <Link
          to="/admin/facilities"
          className={`tab-button ${effectiveTab === 'facilities' ? 'active' : ''}`}
        >
          Print Facilities
        </Link>
        <Link
          to="/admin/orders"
          className={`tab-button ${effectiveTab === 'orders' ? 'active' : ''}`}
        >
          Order Management
        </Link>
        <Link
          to="/admin/completion"
          className={`tab-button ${effectiveTab === 'completion' ? 'active' : ''}`}
        >
          Print Shop Completion
        </Link>
      </div>

      {effectiveTab === 'facilities' && (
        <PrintFacilityManager 
          facilities={facilities} 
          onFacilityChange={fetchData}
        />
      )}

      {effectiveTab === 'orders' && (
        <OrderManager 
          orders={orders} 
          facilities={facilities}
          onOrderAssignment={handleOrderAssignment}
          onRegeneratePDF={handleRegeneratePDF}
          onRefresh={fetchData}
        />
      )}

      {effectiveTab === 'completion' && (
        <PrintShopCompletion 
          facilities={facilities}
        />
      )}

      {/* Default case - if no tab matches, show facilities */}
      {!['facilities', 'orders', 'completion'].includes(effectiveTab) && (
        <PrintFacilityManager 
          facilities={facilities} 
          onFacilityChange={fetchData}
        />
      )}
    </div>
  );
};

export default Admin; 