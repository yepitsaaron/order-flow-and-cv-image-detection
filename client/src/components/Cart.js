import React, { useState } from 'react';
import './Cart.css';

const Cart = ({ cart, onRemoveItem, onUpdateItem, onProceedToCheckout, onBackToDesigner }) => {
  const [editingItem, setEditingItem] = useState(null);

  const handleEditItem = (index) => {
    setEditingItem(index);
  };

  const handleSaveEdit = (index, updatedItem) => {
    onUpdateItem(index, updatedItem);
    setEditingItem(null);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  if (cart.length === 0) {
    return (
      <div className="cart">
        <div className="card">
          <h2>Your Cart</h2>
          <p>Your cart is empty. Start designing your custom t-shirt!</p>
          <button className="btn" onClick={onBackToDesigner}>
            Start Designing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart">
      <div className="card">
        <h2>Your Cart ({cart.length} items)</h2>
        
        {cart.map((item, index) => (
          <div key={item.id} className="cart-item">
            {editingItem === index ? (
              <CartItemEditor
                item={item}
                onSave={(updatedItem) => handleSaveEdit(index, updatedItem)}
                onCancel={handleCancelEdit}
              />
            ) : (
              <CartItemDisplay
                item={item}
                onEdit={() => handleEditItem(index)}
                onRemove={() => onRemoveItem(index)}
              />
            )}
          </div>
        ))}

        <div className="cart-total">
          Total: ${calculateTotal().toFixed(2)}
        </div>

        <div className="cart-actions">
          <button className="btn btn-secondary" onClick={onBackToDesigner}>
            Continue Shopping
          </button>
          <button className="btn" onClick={onProceedToCheckout}>
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

const CartItemDisplay = ({ item, onEdit, onRemove }) => {
  return (
    <div className="cart-item-content">
      <div className="cart-item-image">
        <img src={item.imagePreview} alt="Design preview" />
      </div>
      
      <div className="cart-item-details">
        <h4>Custom T-Shirt</h4>
        <p><strong>Color:</strong> {item.color.charAt(0).toUpperCase() + item.color.slice(1)}</p>
        <p><strong>Size:</strong> {item.size.charAt(0).toUpperCase() + item.size.slice(1)}</p>
        <p><strong>Quantity:</strong> {item.quantity}</p>
        <p><strong>Price:</strong> ${item.price.toFixed(2)} each</p>
        <p><strong>Subtotal:</strong> ${(item.price * item.quantity).toFixed(2)}</p>
      </div>
      
      <div className="cart-item-actions">
        <button className="btn btn-secondary" onClick={onEdit}>
          Edit
        </button>
        <button className="btn btn-danger" onClick={onRemove}>
          Remove
        </button>
      </div>
    </div>
  );
};

const CartItemEditor = ({ item, onSave, onCancel }) => {
  const [editedItem, setEditedItem] = useState({ ...item });

  const handleSave = () => {
    onSave(editedItem);
  };

  const handleQuantityChange = (change) => {
    const newQuantity = Math.max(1, editedItem.quantity + change);
    setEditedItem(prev => ({ ...prev, quantity: newQuantity }));
  };

  return (
    <div className="cart-item-editor">
      <div className="cart-item-image">
        <img src={item.imagePreview} alt="Design preview" />
      </div>
      
      <div className="cart-item-details">
        <h4>Custom T-Shirt</h4>
        
        <div className="form-group">
          <label>Color:</label>
          <div className="color-options">
            {['white', 'blue', 'yellow', 'red', 'black'].map(color => (
              <div
                key={color}
                className={`color-option color-${color} ${editedItem.color === color ? 'selected' : ''}`}
                onClick={() => setEditedItem(prev => ({ ...prev, color }))}
                title={color.charAt(0).toUpperCase() + color.slice(1)}
              />
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Size:</label>
          <div className="size-options">
            {['small', 'medium', 'large'].map(size => (
              <div
                key={size}
                className={`size-option ${editedItem.size === size ? 'selected' : ''}`}
                onClick={() => setEditedItem(prev => ({ ...prev, size }))}
              >
                {size.charAt(0).toUpperCase() + size.slice(1)}
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Quantity:</label>
          <div className="quantity-controls">
            <button
              className="quantity-btn"
              onClick={() => handleQuantityChange(-1)}
              disabled={editedItem.quantity <= 1}
            >
              -
            </button>
            <span className="quantity-display">{editedItem.quantity}</span>
            <button
              className="quantity-btn"
              onClick={() => handleQuantityChange(1)}
            >
              +
            </button>
          </div>
        </div>

        <p><strong>Price:</strong> ${editedItem.price.toFixed(2)} each</p>
        <p><strong>Subtotal:</strong> ${(editedItem.price * editedItem.quantity).toFixed(2)}</p>
      </div>
      
      <div className="cart-item-actions">
        <button className="btn" onClick={handleSave}>
          Save
        </button>
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default Cart; 