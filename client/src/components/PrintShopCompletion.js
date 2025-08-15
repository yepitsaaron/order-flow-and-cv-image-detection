import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './PrintShopCompletion.css';

const PrintShopCompletion = ({ facilities }) => {
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [completionPhotos, setCompletionPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [showManualMatch, setShowManualMatch] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [selectedMatchOrder, setSelectedMatchOrder] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchCompletionPhotos = useCallback(async () => {
    if (!selectedFacilityId) {
      setCompletionPhotos([]);
      return;
    }

    try {
      const response = await axios.get(`/api/print-facilities/${selectedFacilityId}/completion-photos`);
      setCompletionPhotos(response.data);
    } catch (error) {
      console.error('Error fetching completion photos:', error);
      setMessage('Error loading completion photos for this facility');
    }
  }, [selectedFacilityId]);

  useEffect(() => {
    if (selectedFacilityId) {
      fetchCompletionPhotos();
    } else {
      setCompletionPhotos([]);
    }
  }, [selectedFacilityId, fetchCompletionPhotos]);

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
          fetchCompletionPhotos(); // Refresh completion photos
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
          fetchCompletionPhotos(); // Refresh completion photos
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
        fetchCompletionPhotos(); // Refresh completion photos
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
        fetchCompletionPhotos();
      } else {
        setMessage('Failed to mark as completed');
      }
    } catch (error) {
      console.error('Error marking as completed:', error);
      setMessage('Failed to mark as completed');
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
        ) : completionPhotos.length === 0 ? (
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
                    {photo.status === 'matched' && photo.completionStatus !== 'completed' && (
                      <button
                        className="btn btn-success"
                        onClick={() => handleMarkCompleted(photo.orderItemId, photo.id)}
                      >
                        Mark as Completed
                      </button>
                    )}
                    
                    {photo.status === 'needs_review' && (
                      <button
                        className="btn btn-warning"
                        onClick={() => handleMarkCompleted(photo.orderItemId, photo.id)}
                      >
                        Manually Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
    </div>
  );
};

export default PrintShopCompletion; 