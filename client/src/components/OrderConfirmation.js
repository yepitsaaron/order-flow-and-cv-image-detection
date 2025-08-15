import React from 'react';
import './OrderConfirmation.css';

const OrderConfirmation = ({ orderData, onNewOrder }) => {
  if (!orderData) {
    return (
      <div className="order-confirmation">
        <div className="card">
          <h2>Order Confirmation</h2>
          <p>No order data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="order-confirmation">
      <div className="card success-card">
        <div className="success-icon">✅</div>
        <h2>Order Confirmed!</h2>
        <p>Thank you for your order. We've received your custom t-shirt request and will begin processing it soon.</p>
      </div>

      <div className="card">
        <h3>Order Details</h3>
        <div className="order-details">
          <div className="detail-row">
            <span className="detail-label">Order Number:</span>
            <span className="detail-value">{orderData.orderNumber}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Customer Name:</span>
            <span className="detail-value">{orderData.customerName}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Total Amount:</span>
            <span className="detail-value">${orderData.totalAmount.toFixed(2)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Order Date:</span>
            <span className="detail-value">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>What Happens Next?</h3>
        <div className="next-steps">
          <div className="step-item">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Order Processing</h4>
              <p>We'll review your design and prepare it for printing.</p>
            </div>
          </div>
          
          <div className="step-item">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Printing & Production</h4>
              <p>Our printing partner will create your custom t-shirt with your design.</p>
            </div>
          </div>
          
          <div className="step-item">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Quality Check</h4>
              <p>We'll ensure your t-shirt meets our quality standards.</p>
            </div>
          </div>
          
          <div className="step-item">
            <div className="step-number">4</div>
            <div className="step-content">
              <h4>Shipping</h4>
              <p>Your custom t-shirt will be shipped to your provided address.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Important Information</h3>
        <div className="important-info">
          <p><strong>Production Time:</strong> Custom t-shirts typically take 5-7 business days to produce.</p>
          <p><strong>Shipping:</strong> Standard shipping takes 3-5 business days within the continental US.</p>
          <p><strong>Contact:</strong> If you have any questions, please contact our customer service team.</p>
          <p><strong>PDF Receipt:</strong> A detailed PDF receipt has been generated and stored with your order.</p>
        </div>
      </div>

      <div className="card">
        <div className="confirmation-actions">
          <button className="btn" onClick={onNewOrder}>
            Place Another Order
          </button>
          <p>Ready to create another custom design?</p>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation; 