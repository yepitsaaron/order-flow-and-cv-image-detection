import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import TShirtDesigner from './components/TShirtDesigner';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import OrderConfirmation from './components/OrderConfirmation';
import Admin from './components/Admin';

// AppContent component that handles the routing logic
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [cart, setCart] = useState([]);
  const [orderData, setOrderData] = useState(null);
  const [options, setOptions] = useState({
    colors: ['white', 'blue', 'yellow', 'red', 'black'],
    sizes: ['small', 'medium', 'large'],
    basePrice: 25.00
  });

  // Determine if we're in admin mode based on the current route
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    // Fetch available options from the server
    const fetchOptions = async () => {
      try {
        const response = await axios.get('/api/options');
        setOptions(response.data);
      } catch (error) {
        console.error('Error fetching options:', error);
      }
    };

    fetchOptions();
  }, []);

  const addToCart = (item) => {
    setCart(prevCart => [...prevCart, item]);
  };

  const removeFromCart = (index) => {
    setCart(prevCart => prevCart.filter((_, i) => i !== index));
  };

  const updateCartItem = (index, updatedItem) => {
    setCart(prevCart => 
      prevCart.map((item, i) => i === index ? updatedItem : item)
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const proceedToCheckout = () => {
    if (cart.length > 0) {
      navigate('/checkout');
    }
  };

  const goBackToDesigner = () => {
    navigate('/');
  };

  const goBackToCart = () => {
    navigate('/cart');
  };

  const handleOrderComplete = (orderData) => {
    setOrderData(orderData);
    navigate('/confirmation');
    clearCart();
  };

  const goToAdmin = () => {
    navigate('/admin');
  };

  const goToMainApp = () => {
    navigate('/');
  };

  // Render the main app content based on the current route
  const renderMainContent = () => {
    return (
      <Routes>
        <Route path="/" element={
          <TShirtDesigner
            options={options}
            onAddToCart={addToCart}
            onProceedToCart={() => navigate('/cart')}
          />
        } />
        <Route path="/cart" element={
          <Cart
            cart={cart}
            onRemoveItem={removeFromCart}
            onUpdateItem={updateCartItem}
            onProceedToCheckout={proceedToCheckout}
            onBackToDesigner={goBackToDesigner}
          />
        } />
        <Route path="/checkout" element={
          <Checkout
            cart={cart}
            onBackToCart={goBackToCart}
            onOrderComplete={handleOrderComplete}
          />
        } />
        <Route path="/confirmation" element={
          <OrderConfirmation
            orderData={orderData}
            onNewOrder={() => navigate('/')}
          />
        } />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/facilities" element={<Admin />} />
        <Route path="/admin/orders" element={<Admin />} />
        <Route path="/admin/completion" element={<Admin />} />
        <Route path="/admin/image-tester" element={<Admin />} />
      </Routes>
    );
  };

  return (
    <div className="App">
      <header className="header">
        <div className="container">
          <h1>Custom T-Shirt Designer</h1>
          <p>Create your perfect custom t-shirt with your own design</p>
          <button 
            className="btn btn-secondary"
            onClick={isAdminRoute ? goToMainApp : goToAdmin}
            style={{ marginTop: '1rem' }}
          >
            {isAdminRoute ? 'Back to App' : 'Admin Panel'}
          </button>
        </div>
      </header>

      <div className="container">
        {renderMainContent()}
      </div>
    </div>
  );
}

// Main App component that wraps everything in Router
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App; 