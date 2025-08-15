import React, { useState } from 'react';
import './OrderManager.css';

const OrderManager = ({ orders, facilities, onOrderAssignment, onRegeneratePDF, onRefresh }) => {
  const [selectedFacility, setSelectedFacility] = useState({});
  const [selectedStatus, setSelectedStatus] = useState({});

  const handleAssignFacility = (orderId, facilityId) => {
    onOrderAssignment(orderId, facilityId);
  };

  const handleUnassignFacility = (orderId) => {
    onOrderAssignment(orderId, null);
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Refresh orders to show updated status
        onRefresh();
        // Clear the selected status for this order
        setSelectedStatus(prev => ({ ...prev, [orderId]: '' }));
      } else {
        const error = await response.json();
        console.error('Error updating status:', error);
        alert('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update order status');
    }
  };

  const getFacilityName = (facilityId) => {
    if (!facilityId) return 'Unassigned';
    const facility = facilities.find(f => f.id === facilityId);
    return facility ? facility.name : 'Unknown Facility';
  };

  const getFacilityStatus = (facilityId) => {
    if (!facilityId) return 'unassigned';
    const facility = facilities.find(f => f.id === facilityId);
    if (!facility) return 'unknown';
    return facility.isActive ? 'active' : 'inactive';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const activeFacilities = facilities.filter(f => f.isActive);

  return (
    <div className="order-manager">
      <div className="card">
        <div className="order-header">
          <h3>Order Management</h3>
          <button className="btn btn-secondary" onClick={onRefresh}>
            Refresh Orders
          </button>
        </div>

        {orders.length === 0 ? (
          <p>No orders found.</p>
        ) : (
          <div className="orders-list">
            {orders.map(order => (
              <div key={order.id} className="order-item">
                <div className="order-header-info">
                  <h4>Order #{order.orderNumber}</h4>
                  <div className="order-id-info">
                    <span className="order-id">ID: {order.id}</span>
                    <span className={`status status-${order.status}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
                
                <div className="order-details">
                                  <div className="order-images">
                  {order.designImages && order.designImages.length > 0 ? (
                    order.designImages.map((designImage, imgIndex) => (
                      <div key={imgIndex} className="order-image">
                        <img 
                          src={`/uploads/${designImage}`} 
                          alt={`T-shirt design ${imgIndex + 1}`} 
                          className="tshirt-preview"
                        />
                        <div className="image-label">Design {imgIndex + 1}</div>
                      </div>
                    ))
                  ) : (
                    <div className="no-image">No images</div>
                  )}
                </div>
                  
                  <div className="customer-info">
                    <p><strong>Customer:</strong> {order.customerName}</p>
                    <p><strong>Email:</strong> {order.customerEmail}</p>
                    <p><strong>Date:</strong> {formatDate(order.createdAt)}</p>
                    <p><strong>Total:</strong> ${order.totalAmount}</p>
                  </div>
                  
                  <div className="facility-assignment">
                    <h5>Print Facility Assignment</h5>
                    <div className={`facility-status facility-${getFacilityStatus(order.printFacilityId)}`}>
                      <strong>Current:</strong> {getFacilityName(order.printFacilityId)}
                    </div>
                    
                    {order.assignedAt && (
                      <p><strong>Assigned:</strong> {formatDate(order.assignedAt)}</p>
                    )}
                    
                    <div className="facility-actions">
                      <select
                        value={selectedFacility[order.id] || ''}
                        onChange={(e) => setSelectedFacility(prev => ({
                          ...prev,
                          [order.id]: e.target.value
                        }))}
                        className="facility-select"
                      >
                        <option value="">Select Facility</option>
                        {activeFacilities.map(facility => (
                          <option key={facility.id} value={facility.id}>
                            {facility.name}
                          </option>
                        ))}
                      </select>
                      
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleAssignFacility(order.id, selectedFacility[order.id])}
                        disabled={!selectedFacility[order.id]}
                      >
                        Assign
                      </button>
                      
                      {order.printFacilityId && (
                        <button
                          className="btn btn-danger"
                          onClick={() => handleUnassignFacility(order.id)}
                        >
                          Unassign
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Management Section */}
                <div className="status-management">
                  <h5>Order Status</h5>
                  <div className="status-info">
                    <p><strong>Current Status:</strong> <span className={`status status-${order.status}`}>{order.status}</span></p>
                  </div>
                  
                  <div className="status-actions">
                    <select
                      value={selectedStatus[order.id] || ''}
                      onChange={(e) => setSelectedStatus(prev => ({
                        ...prev,
                        [order.id]: e.target.value
                      }))}
                      className="status-select"
                    >
                      <option value="">Select New Status</option>
                      <option value="processing">Processing</option>
                      <option value="printing">Printing</option>
                      <option value="completed">Completed</option>
                      <option value="shipped">Shipped</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    
                    <button
                      className="btn btn-primary"
                      onClick={() => handleStatusUpdate(order.id, selectedStatus[order.id])}
                      disabled={!selectedStatus[order.id]}
                    >
                      Update Status
                    </button>
                  </div>
                </div>
                
                <div className="order-actions">
                  {order.printFacilityId ? (
                    <>
                      <a
                        href={`/orders/${order.orderNumber}.pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                      >
                        View PDF
                      </a>
                      <button
                        className="btn btn-primary"
                        onClick={() => onRegeneratePDF(order.id)}
                        title="Regenerate PDF with latest improvements"
                      >
                        Regenerate PDF
                      </button>
                    </>
                  ) : (
                    <span className="pdf-status">
                      PDF will be generated when assigned to a print facility
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderManager; 