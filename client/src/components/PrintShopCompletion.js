import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './PrintShopCompletion.css';

const PrintShopCompletion = ({ facilities }) => {
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [completionPhotos, setCompletionPhotos] = useState([]);
  const [facilityOrders, setFacilityOrders] = useState([]);
  const [facilityOrderItems, setFacilityOrderItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [showManualMatch, setShowManualMatch] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [selectedMatchOrder, setSelectedMatchOrder] = useState('');
  const [loading, setLoading] = useState(false);
  const [showManualAssignment, setShowManualAssignment] = useState(false);
  const [photoToAssign, setPhotoToAssign] = useState(null);
  const [availableOrderItems, setAvailableOrderItems] = useState([]);
  const [selectedOrderItem, setSelectedOrderItem] = useState('');

  const fetchFacilityData = useCallback(async () => {
    if (!selectedFacilityId) {
      setCompletionPhotos([]);
      setFacilityOrders([]);
      setFacilityOrderItems([]);
      return;
    }

    try {
      const [photosResponse, ordersResponse, orderItemsResponse] = await Promise.all([
        axios.get(`/api/print-facilities/${selectedFacilityId}/completion-photos`),
        axios.get(`/api/print-facilities/${selectedFacilityId}/orders`),
        axios.get(`/api/print-facilities/${selectedFacilityId}/order-items`)
      ]);
      
      // Ensure we have arrays and handle potential errors
      const photos = Array.isArray(photosResponse.data) ? photosResponse.data : [];
      const orders = Array.isArray(ordersResponse.data) ? ordersResponse.data : [];
      const orderItems = Array.isArray(orderItemsResponse.data) ? orderItemsResponse.data : [];
      
      setCompletionPhotos(photos);
      setFacilityOrders(orders);
      setFacilityOrderItems(orderItems);
    } catch (error) {
      console.error('Error fetching facility data:', error);
      setMessage('Error loading data for this facility');
      // Set empty arrays on error to prevent map errors
      setCompletionPhotos([]);
      setFacilityOrders([]);
      setFacilityOrderItems([]);
    }
  }, [selectedFacilityId]);

  useEffect(() => {
    if (selectedFacilityId) {
      fetchFacilityData();
    } else {
      setCompletionPhotos([]);
      setFacilityOrders([]);
    }
  }, [selectedFacilityId, fetchFacilityData]);

  const handleFacilityChange = (facilityId) => {
    setSelectedFacilityId(facilityId);
    setMessage('');
    setShowManualMatch(false);
    setPendingPhoto(null);
    setSelectedMatchOrder('');
  };

  const handleFileUpload = async (event) => {
    if (!selectedFacilityId) {
      setMessage('Please select a facility first');
      return;
    }

    const file = event.target.files[0];
    if (!file) {
      setMessage('Please select a photo file');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('completionPhoto', file);
      formData.append('printFacilityId', selectedFacilityId);

      const response = await axios.post('/api/completion-photos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        if (response.data.match) {
          // Perfect match found - show success message
          setMessage(response.data.message);
          event.target.value = ''; // Clear file input
          fetchFacilityData(); // Refresh completion photos
        } else if (response.data.orderItems && response.data.orderItems.length > 0) {
          // Multiple potential matches found - show manual selection
          setPendingPhoto({
            photoId: response.data.photoId,
            orderItems: response.data.orderItems,
            message: response.data.message
          });
          setShowManualMatch(true);
          setMessage('Multiple potential matches found. Please select the correct order.');
        } else {
          // No matches found
          setMessage(response.data.message);
          event.target.value = ''; // Clear file input
          fetchFacilityData(); // Refresh completion photos
        }
      } else {
        setMessage('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading completion photo:', error);
      setMessage(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleManualOrderSelection = async () => {
    if (!selectedMatchOrder) {
      setMessage('Please select an order');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`/api/completion-photos/${pendingPhoto.photoId}/assign-order`, {
        orderItemId: selectedMatchOrder
      });

      if (response.data.success) {
        setMessage('Order assigned successfully!');
        setShowManualMatch(false);
        setPendingPhoto(null);
        setSelectedMatchOrder('');
        fetchFacilityData(); // Refresh completion photos
      } else {
        setMessage('Failed to assign order');
      }
    } catch (error) {
      console.error('Error assigning order:', error);
      setMessage('Failed to assign order');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCompleted = async (orderItemId, completionPhotoId) => {
    try {
      const response = await axios.post(`/api/order-items/${orderItemId}/complete`, {
        completionPhotoId
      });

      if (response.data.success) {
        setMessage('Order item marked as completed successfully');
        fetchFacilityData();
      } else {
        setMessage('Failed to mark as completed');
      }
    } catch (error) {
      console.error('Error marking as completed:', error);
      setMessage('Failed to mark as completed');
    }
  };

  const handleUnmarkCompleted = async (orderItemId) => {
    try {
      const response = await axios.post(`/api/order-items/${orderItemId}/uncomplete`);

      if (response.data.success) {
        setMessage('Order item unmarked as completed successfully');
        fetchFacilityData();
      } else {
        setMessage('Failed to unmark as completed');
      }
    } catch (error) {
      console.error('Error unmarking as completed:', error);
      setMessage('Failed to unmark as completed');
    }
  };

  const handleManualAssignment = async (photo) => {
    try {
      setPhotoToAssign(photo);
      setSelectedOrderItem('');
      
      // Fetch available order items for this facility
      const response = await axios.get(`/api/print-facilities/${selectedFacilityId}/available-order-items`);
      setAvailableOrderItems(response.data);
      setShowManualAssignment(true);
    } catch (error) {
      console.error('Error fetching available order items:', error);
      setMessage('Failed to load available order items');
    }
  };

  const handleAssignPhoto = async () => {
    if (!selectedOrderItem) {
      setMessage('Please select an order item');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`/api/completion-photos/${photoToAssign.id}/assign-order`, {
        orderItemId: selectedOrderItem
      });

      if (response.data.success) {
        setMessage('Photo assigned to order item successfully!');
        setShowManualAssignment(false);
        setPhotoToAssign(null);
        setSelectedOrderItem('');
        fetchFacilityData();
      } else {
        setMessage('Failed to assign photo to order item');
      }
    } catch (error) {
      console.error('Error assigning photo:', error);
      setMessage('Failed to assign photo to order item');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'pending': 'status-pending',
      'matched': 'status-matched',
      'needs_review': 'status-needs-review'
    };
    return <span className={`status ${statusClasses[status] || 'status-pending'}`}>{status}</span>;
  };

  const getConfidenceColor = (score) => {
    if (score >= 0.8) return '#28a745'; // Green
    if (score >= 0.6) return '#ffc107'; // Yellow
    return '#dc3545'; // Red
  };

  return (
    <div className="print-shop-completion">
      <div className="card">
        <h3>Print Shop Completion Tool</h3>
        <p>Upload photos of completed t-shirts and match them to order items</p>
      </div>

      {/* Facility Selection */}
      <div className="card">
        <h4>Select Print Facility</h4>
        <div className="facility-selection">
          <label>Choose a print facility:</label>
          <select
            value={selectedFacilityId}
            onChange={(e) => handleFacilityChange(e.target.value)}
            className="form-control"
          >
            <option value="">Select a facility...</option>
            {facilities.map(facility => (
              <option key={facility.id} value={facility.id}>
                {facility.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Facility Orders Section */}
      {selectedFacilityId && (
        <div className="card">
          <h4>Orders Assigned to This Facility</h4>
          {!Array.isArray(facilityOrders) || facilityOrders.length === 0 ? (
            <p>No orders currently assigned to this facility.</p>
          ) : (
            <div className="facility-orders">
              {facilityOrders.map(order => (
                <div key={order.id} className="facility-order-item">
                  <div className="order-header">
                    <h5>Order #{order.orderNumber}</h5>
                    <span className="order-status">{order.status}</span>
                  </div>
                  <div className="order-details">
                    <p><strong>Customer:</strong> {order.customerName}</p>
                    <p><strong>Total Items:</strong> {order.totalItems}</p>
                    <p><strong>Completed:</strong> {order.completedItems}</p>
                    <p><strong>Pending:</strong> {order.pendingItems}</p>
                    <p><strong>Assigned:</strong> {new Date(order.assignedAt).toLocaleDateString()}</p>
                  </div>
                  
                  {/* Individual Order Items */}
                  <div className="order-items-list">
                    <h6>Order Items:</h6>
                    {Array.isArray(facilityOrderItems) && facilityOrderItems
                      .filter(item => item.orderId === order.id)
                      .map(item => (
                        <div key={item.id} className="order-item-detail">
                          <div className="item-info">
                            <span><strong>{item.color} {item.size}</strong> (Qty: {item.quantity})</span>
                            <span className={`item-status ${item.completionStatus}`}>
                              {item.completionStatus === 'completed' ? '✅ Completed' : '⏳ Pending'}
                            </span>
                          </div>
                          <div className="item-actions">
                            {item.completionStatus !== 'completed' ? (
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => handleMarkCompleted(item.id, null)}
                                disabled={!item.completionPhoto}
                              >
                                Mark as Completed
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => handleUnmarkCompleted(item.id)}
                              >
                                Unmark as Completed
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Section */}
      <div className={`card ${!selectedFacilityId ? 'disabled' : ''}`}>
        <h4>Upload Completion Photo</h4>
        {!selectedFacilityId && (
          <p className="facility-required">Please select a facility first to upload completion photos.</p>
        )}
        <div className="upload-form">
          <div className="form-group">
            <label>Upload Photo of Completed T-Shirt:</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="form-control"
              disabled={uploading || !selectedFacilityId}
            />
            {uploading && <p className="uploading">Uploading and analyzing...</p>}
          </div>
          
          <div className="upload-info">
            <p><strong>How it works:</strong></p>
            <ul>
              <li>Simply upload a photo of the completed t-shirt</li>
              <li>Our AI automatically matches it to the correct order</li>
              <li>No need to specify order numbers or item details</li>
              <li>Get instant confirmation of the match</li>
            </ul>
          </div>

          {message && (
            <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
        </div>
      </div>

      {/* Completion Photos Section */}
      <div className="card">
        <h4>Completion Photos</h4>
        {!selectedFacilityId ? (
          <p>Please select a facility to view completion photos.</p>
        ) : !Array.isArray(completionPhotos) || completionPhotos.length === 0 ? (
          <p>No completion photos uploaded yet for this facility.</p>
        ) : (
          <div className="completion-photos">
            {completionPhotos.map(photo => (
              <div key={photo.id} className="completion-photo-item">
                <div className="photo-comparison">
                  <div className="photo-section">
                    <h5>Completion Photo</h5>
                    <img 
                      src={`/completion-photos/${photo.photoPath}`} 
                      alt="Completed t-shirt" 
                      className="completion-photo"
                    />
                    <p><strong>Uploaded:</strong> {new Date(photo.uploadedAt).toLocaleDateString()}</p>
                  </div>

                  <div className="photo-section">
                    <h5>Original Design</h5>
                    <img 
                      src={`/uploads/${photo.designImage}`} 
                      alt="Original design" 
                      className="design-photo"
                    />
                    <p><strong>Order:</strong> #{photo.orderNumber}</p>
                    <p><strong>Item:</strong> {photo.color} {photo.size} (Qty: {photo.quantity})</p>
                  </div>
                </div>

                <div className="photo-details">
                  <div className="recognition-results">
                    <h6>Recognition Results:</h6>
                    <p><strong>Status:</strong> {getStatusBadge(photo.status)}</p>
                    {photo.confidenceScore && (
                      <p>
                        <strong>Confidence:</strong> 
                        <span style={{ color: getConfidenceColor(photo.confidenceScore) }}>
                          {(photo.confidenceScore * 100).toFixed(1)}%
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="photo-actions">
                    {photo.status === 'matched' && photo.orderItemId && (() => {
                      // Find the corresponding order item to get its current completion status
                      const orderItem = facilityOrderItems.find(item => item.id === photo.orderItemId);
                      const isCompleted = orderItem && orderItem.completionStatus === 'completed';
                      
                      return isCompleted ? (
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleUnmarkCompleted(photo.orderItemId)}
                        >
                          Unmark as Completed
                        </button>
                      ) : (
                        <button
                          className="btn btn-success"
                          onClick={() => handleMarkCompleted(photo.orderItemId, photo.id)}
                        >
                          Mark as Completed
                        </button>
                      );
                    })()}
                    
                    {photo.status === 'needs_review' && (
                      <button
                        className="btn btn-warning"
                        onClick={() => handleMarkCompleted(photo.orderItemId, photo.id)}
                      >
                        Manually Mark Complete
                      </button>
                    )}

                    {/* Manual Assignment for Unmatched Photos */}
                    {photo.status === 'needs_review' && (
                      <button
                        className="btn btn-primary"
                        onClick={() => handleManualAssignment(photo)}
                      >
                        Assign to Order Item
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unmatched Photos Section */}
      {selectedFacilityId && (
        <div className="card">
          <h4>Unmatched Photos</h4>
          {(() => {
            const unmatchedPhotos = completionPhotos.filter(photo => 
              photo.status === 'needs_review' || photo.status === 'pending'
            );
            
            if (unmatchedPhotos.length === 0) {
              return <p>All photos have been matched to orders.</p>;
            }

            return (
              <div className="unmatched-photos">
                <p>These photos need manual assignment to order items:</p>
                {unmatchedPhotos.map(photo => (
                  <div key={photo.id} className="unmatched-photo-item">
                    <div className="photo-preview">
                      <img 
                        src={`/completion-photos/${photo.photoPath}`} 
                        alt="Unmatched photo" 
                        className="small-photo"
                      />
                      <div className="photo-info">
                        <p><strong>Uploaded:</strong> {new Date(photo.uploadedAt).toLocaleDateString()}</p>
                        <p><strong>Status:</strong> {getStatusBadge(photo.status)}</p>
                      </div>
                    </div>
                    
                    <div className="assignment-section">
                      <button
                        className="btn btn-primary"
                        onClick={() => handleManualAssignment(photo)}
                      >
                        Assign to Order Item
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Manual Order Selection Modal */}
      {showManualMatch && pendingPhoto && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Select Correct Order</h4>
            <p>{pendingPhoto.message}</p>
            
            <div className="order-selection">
              <label>Choose the order this completion photo belongs to:</label>
              <select
                value={selectedMatchOrder}
                onChange={(e) => setSelectedMatchOrder(e.target.value)}
                className="form-control"
              >
                <option value="">Select an order...</option>
                {pendingPhoto.orderItems.map((item, index) => (
                  <option key={index} value={item.orderItemId || index}>
                    Order #{item.orderNumber} - {item.color} {item.size} (Qty: {item.quantity})
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={handleManualOrderSelection}
                disabled={!selectedMatchOrder || loading}
              >
                {loading ? 'Assigning...' : 'Assign to Order'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowManualMatch(false);
                  setPendingPhoto(null);
                  setSelectedMatchOrder('');
                  setMessage('Order assignment cancelled');
                }}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Photo Assignment Modal */}
      {showManualAssignment && photoToAssign && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Assign Photo to Order Item</h4>
            <p>Select which order item this completion photo belongs to:</p>
            
            <div className="photo-preview-modal">
              <img 
                src={`/completion-photos/${photoToAssign.photoPath}`} 
                alt="Photo to assign" 
                className="modal-photo"
              />
            </div>
            
            <div className="order-selection">
              <label>Choose the order item:</label>
              <select
                value={selectedOrderItem}
                onChange={(e) => setSelectedOrderItem(e.target.value)}
                className="form-control"
              >
                <option value="">Select an order item...</option>
                {availableOrderItems.map(item => (
                  <option key={item.id} value={item.id}>
                    Order #{item.orderNumber} - {item.color} {item.size} (Qty: {item.quantity})
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={handleAssignPhoto}
                disabled={!selectedOrderItem || loading}
              >
                {loading ? 'Assigning...' : 'Assign Photo'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowManualAssignment(false);
                  setPhotoToAssign(null);
                  setSelectedOrderItem('');
                  setAvailableOrderItems([]);
                }}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintShopCompletion; 