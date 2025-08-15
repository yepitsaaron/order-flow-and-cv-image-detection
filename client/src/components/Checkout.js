import React, { useState } from 'react';
import axios from 'axios';
import './Checkout.css';

const Checkout = ({ cart, onBackToCart, onOrderComplete }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const validateForm = () => {
    const requiredFields = ['customerName', 'email', 'address', 'city', 'state', 'zipCode'];
    for (const field of requiredFields) {
      if (!formData[field].trim()) {
        setError(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare form data for submission
      const formDataToSend = new FormData();
      
      // Add customer information
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });

      // Add cart items - each item has its own design image
      cart.forEach((item, index) => {
        // Handle design image - could be a File object or filename string
        if (item.designImage instanceof File) {
          // If it's a new file upload, append it to the form data
          formDataToSend.append(`designImages`, item.designImage);
          formDataToSend.append(`items[${index}][designImage]`, item.designImage.name);
        } else {
          // If it's an existing image filename, just append the filename
          formDataToSend.append(`items[${index}][designImage]`, item.designImage);
        }
        
        formDataToSend.append(`items[${index}][color]`, item.color);
        formDataToSend.append(`items[${index}][size]`, item.size);
        formDataToSend.append(`items[${index}][quantity]`, item.quantity);
        formDataToSend.append(`items[${index}][price]`, item.price);
      });

      console.log('Submitting order with form data:', {
        customerInfo: formData,
        cartItems: cart,
        formDataEntries: Array.from(formDataToSend.entries())
      });

      const response = await axios.post('/api/orders', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        onOrderComplete({
          orderId: response.data.orderId,
          orderNumber: response.data.orderNumber,
          customerName: formData.customerName,
          totalAmount: calculateTotal()
        });
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      setError(error.response?.data?.error || 'Failed to submit order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="checkout">
      <div className="grid">
        <div className="card">
          <h2>Shipping Information</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="customerName">Full Name *</label>
                <input
                  type="text"
                  id="customerName"
                  name="customerName"
                  className="form-control"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
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
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number (Optional)</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                className="form-control"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="address">Street Address *</label>
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

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="checkout-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onBackToCart}
                disabled={isSubmitting}
              >
                Back to Cart
              </button>
              <button
                type="submit"
                className="btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'Place Order'}
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <h2>Order Summary</h2>
          
          {cart.map((item, index) => (
            <div key={item.id} className="order-summary-item">
              <div className="order-item-image">
                <img src={item.imagePreview} alt="Design preview" />
              </div>
              
              <div className="order-item-details">
                <h4>Custom T-Shirt</h4>
                <p><strong>Color:</strong> {item.color.charAt(0).toUpperCase() + item.color.slice(1)}</p>
                <p><strong>Size:</strong> {item.size.charAt(0).toUpperCase() + item.size.slice(1)}</p>
                <p><strong>Quantity:</strong> {item.quantity}</p>
                <p><strong>Price:</strong> ${item.price.toFixed(2)} each</p>
                <p><strong>Subtotal:</strong> ${(item.price * item.quantity).toFixed(2)}</p>
              </div>
            </div>
          ))}

          <div className="order-total">
            <h3>Total: ${calculateTotal().toFixed(2)}</h3>
            <p className="shipping-note">* Shipping information will be used to deliver your custom t-shirt</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout; 