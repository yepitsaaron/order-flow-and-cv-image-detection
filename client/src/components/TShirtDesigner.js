import React, { useState, useRef } from 'react';
import './TShirtDesigner.css';

const TShirtDesigner = ({ options, onAddToCart, onProceedToCart }) => {
  const [selectedColor, setSelectedColor] = useState('white');
  const [selectedSize, setSelectedSize] = useState('medium');
  const [quantity, setQuantity] = useState(1);
  const [designImage, setDesignImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleColorSelect = (color) => {
    setSelectedColor(color);
  };

  const handleSizeSelect = (size) => {
    setSelectedSize(size);
  };

  const handleQuantityChange = (change) => {
    const newQuantity = Math.max(1, quantity + change);
    setQuantity(newQuantity);
  };

  const handleFileSelect = (file) => {
    if (file && file.type.startsWith('image/')) {
      setDesignImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleAddToCart = () => {
    if (!designImage) {
      alert('Please upload a design image first!');
      return;
    }

    const cartItem = {
      id: Date.now(),
      designImage: designImage,
      color: selectedColor,
      size: selectedSize,
      quantity: quantity,
      price: options.basePrice,
      imagePreview: imagePreview
    };

    onAddToCart(cartItem);
    
    // Reset form
    setDesignImage(null);
    setImagePreview(null);
    setQuantity(1);
    
    alert('Item added to cart!');
  };

  const canAddToCart = designImage && selectedColor && selectedSize && quantity > 0;

  return (
    <div className="tshirt-designer">
      <div className="grid">
        <div className="card">
          <h2>Upload Your Design</h2>
          <p>Upload an image file (JPG, PNG, GIF) for your custom t-shirt design.</p>
          
          <div
            className={`file-upload ${dragActive ? 'dragover' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
          >
            {imagePreview ? (
              <div>
                <img src={imagePreview} alt="Design preview" className="file-preview" />
                <p>Click to change image</p>
              </div>
            ) : (
              <div>
                <p>📁 Drag and drop your design here</p>
                <p>or click to browse files</p>
                <p className="file-hint">Supports: JPG, PNG, GIF (Max: 5MB)</p>
              </div>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        </div>

        <div className="card">
          <h2>Customize Your T-Shirt</h2>
          
          <div className="form-group">
            <label>Select Color:</label>
            <div className="color-options">
              {options.colors.map(color => (
                <div
                  key={color}
                  className={`color-option color-${color} ${selectedColor === color ? 'selected' : ''}`}
                  onClick={() => handleColorSelect(color)}
                  title={color.charAt(0).toUpperCase() + color.slice(1)}
                />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Select Size:</label>
            <div className="size-options">
              {options.sizes.map(size => (
                <div
                  key={size}
                  className={`size-option ${selectedSize === size ? 'selected' : ''}`}
                  onClick={() => handleSizeSelect(size)}
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
                disabled={quantity <= 1}
              >
                -
              </button>
              <span className="quantity-display">{quantity}</span>
              <button
                className="quantity-btn"
                onClick={() => handleQuantityChange(1)}
              >
                +
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Price per shirt: ${options.basePrice.toFixed(2)}</label>
            <label>Total: ${(options.basePrice * quantity).toFixed(2)}</label>
          </div>

          <button
            className="btn"
            onClick={handleAddToCart}
            disabled={!canAddToCart}
          >
            Add to Cart
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ textAlign: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={onProceedToCart}
            style={{ marginRight: '1rem' }}
          >
            View Cart
          </button>
          <p>Design your custom t-shirt and add it to your cart!</p>
        </div>
      </div>
    </div>
  );
};

export default TShirtDesigner; 