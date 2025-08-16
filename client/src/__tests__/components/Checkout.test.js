/**
 * Checkout Component Tests - Fixed to match current implementation
 * Tests multi-item order processing, form validation, and order submission
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Checkout from '../../components/Checkout';

// Mock axios at the module level
jest.mock('axios', () => ({
  post: jest.fn()
}));

// Mock cart data with multiple items
const mockCartItems = [
  {
    id: 1,
    color: 'blue',
    size: 'medium',
    quantity: 2,
    price: 25.00,
    imagePreview: 'data:image/jpeg;base64,mock-image-1',
    designImage: 'mock-image-1.jpg'
  },
  {
    id: 2,
    color: 'red',
    size: 'large',
    quantity: 1,
    price: 25.00,
    imagePreview: 'data:image/jpeg;base64,mock-image-2',
    designImage: 'mock-image-2.jpg'
  },
  {
    id: 3,
    color: 'white',
    size: 'small',
    quantity: 3,
    price: 25.00,
    imagePreview: 'data:image/jpeg;base64,mock-image-3',
    designImage: 'mock-image-3.jpg'
  }
];

// Mock order submission response
const mockOrderResponse = {
  data: {
    success: true,
    orderId: 12345,
    orderNumber: 'TSHIRT-12345'
  }
};

// Wrapper component for testing with router
const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Checkout Component', () => {
  let mockOnOrderComplete;
  let mockOnBackToCart;
  let mockAxios;

  beforeEach(() => {
    mockOnOrderComplete = jest.fn();
    mockOnBackToCart = jest.fn();
    
    // Get the mocked axios module
    mockAxios = require('axios');
    mockAxios.post.mockClear();
  });

  describe('Component Rendering', () => {
    test('should render checkout header and form', () => {
      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      expect(screen.getByText('Shipping Information')).toBeInTheDocument();
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
    });

    test('should display order summary with all items', () => {
      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Check if all items are displayed in summary
      expect(screen.getByText('Blue')).toBeInTheDocument();
      expect(screen.getByText('Red')).toBeInTheDocument();
      expect(screen.getByText('White')).toBeInTheDocument();
      
      // Check quantities - look for the specific quantity values
      // Since the text is split across elements, we'll check for the numbers
      expect(screen.getByText('2')).toBeInTheDocument(); // Quantity 2
      expect(screen.getByText('1')).toBeInTheDocument(); // Quantity 1  
      expect(screen.getByText('3')).toBeInTheDocument(); // Quantity 3
    });

    test('should display correct totals', () => {
      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Total price: $50 + $25 + $75 = $150
      expect(screen.getByText('Total: $150.00')).toBeInTheDocument();
    });

    test('should display item images in summary', () => {
      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Check if all images are displayed
      const images = screen.getAllByAltText('Design preview');
      expect(images).toHaveLength(3);
    });
  });

  describe('Form Fields and Validation', () => {
    test('should render all required form fields', () => {
      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Check for all required form fields
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/state\/province/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/zip\/postal code/i)).toBeInTheDocument();
    });

    test('should validate required fields on submission', async () => {
      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Try to submit without filling required fields
      const placeOrderButton = screen.getByText('Place Order');
      fireEvent.click(placeOrderButton);

      // Should show validation error - the component shows the first missing field
      await waitFor(() => {
        expect(screen.getByText(/please fill in the customer name/i)).toBeInTheDocument();
      });
    });

    test('should validate email format', async () => {
      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Fill in customer name
      const nameInput = screen.getByLabelText(/full name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Customer' } });

      // Fill in invalid email
      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      // Fill in shipping address
      const addressInput = screen.getByLabelText(/street address/i);
      fireEvent.change(addressInput, { target: { value: '123 Test St' } });

      // Fill in other required fields to avoid validation errors
      fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Test City' } });
      fireEvent.change(screen.getByLabelText(/state\/province/i), { target: { value: 'TS' } });
      fireEvent.change(screen.getByLabelText(/zip\/postal code/i), { target: { value: '12345' } });

      // Try to submit
      const placeOrderButton = screen.getByText('Place Order');
      fireEvent.click(placeOrderButton);

      // Should show email validation error
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });
  });

  describe('Order Submission', () => {
    test('should submit order successfully with valid data', async () => {
      mockAxios.post.mockResolvedValueOnce(mockOrderResponse);

      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Fill in all required fields
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test Customer' } });
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/street address/i), { target: { value: '123 Test St' } });
      fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Test City' } });
      fireEvent.change(screen.getByLabelText(/state\/province/i), { target: { value: 'TS' } });
      fireEvent.change(screen.getByLabelText(/zip\/postal code/i), { target: { value: '12345' } });

      // Submit order
      const placeOrderButton = screen.getByText('Place Order');
      fireEvent.click(placeOrderButton);

      // Should show loading state
      expect(screen.getByText('Processing...')).toBeInTheDocument();

      // Wait for order completion
      await waitFor(() => {
        expect(mockOnOrderComplete).toHaveBeenCalledWith({
          orderId: 12345,
          orderNumber: 'TSHIRT-12345',
          customerName: 'Test Customer',
          totalAmount: 150
        });
      });
    });

    test('should handle order submission errors', async () => {
      // Mock axios to return error
      mockAxios.post.mockRejectedValueOnce({
        response: {
          data: { error: 'Bad Request' }
        }
      });

      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Fill in all required fields
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test Customer' } });
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/street address/i), { target: { value: '123 Test St' } });
      fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Test City' } });
      fireEvent.change(screen.getByLabelText(/state\/province/i), { target: { value: 'TS' } });
      fireEvent.change(screen.getByLabelText(/zip\/postal code/i), { target: { value: '12345' } });

      // Submit order
      const placeOrderButton = screen.getByText('Place Order');
      fireEvent.click(placeOrderButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Bad Request')).toBeInTheDocument();
      });

      expect(mockOnOrderComplete).not.toHaveBeenCalled();
    });
  });

  describe('Multi-Item Order Processing', () => {
    test('should process order with multiple items correctly', async () => {
      mockAxios.post.mockResolvedValueOnce(mockOrderResponse);

      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Fill in all required fields
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test Customer' } });
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/street address/i), { target: { value: '123 Test St' } });
      fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Test City' } });
      fireEvent.change(screen.getByLabelText(/state\/province/i), { target: { value: 'TS' } });
      fireEvent.change(screen.getByLabelText(/zip\/postal code/i), { target: { value: '12345' } });

      // Submit order
      const placeOrderButton = screen.getByText('Place Order');
      fireEvent.click(placeOrderButton);

      // Verify axios was called with correct data
      await waitFor(() => {
        expect(mockAxios.post).toHaveBeenCalledWith('/api/orders', expect.any(FormData), {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      });
    });

    test('should handle large orders efficiently', async () => {
      // Create a large cart with 20 items
      const largeCart = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        color: ['white', 'blue', 'yellow', 'red', 'black'][i % 5],
        size: ['small', 'medium', 'large'][i % 3],
        quantity: Math.floor(Math.random() * 5) + 1,
        price: 25.00,
        imagePreview: `data:image/jpeg;base64,mock-image-${i + 1}`,
        designImage: `mock-image-${i + 1}.jpg`
      }));

      mockAxios.post.mockResolvedValueOnce(mockOrderResponse);

      renderWithRouter(
        <Checkout
          cart={largeCart}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Fill in all required fields
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test Customer' } });
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/street address/i), { target: { value: '123 Test St' } });
      fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Test City' } });
      fireEvent.change(screen.getByLabelText(/state\/province/i), { target: { value: 'TS' } });
      fireEvent.change(screen.getByLabelText(/zip\/postal code/i), { target: { value: '12345' } });

      // Submit order
      const placeOrderButton = screen.getByText('Place Order');
      fireEvent.click(placeOrderButton);

      // Should process large order without performance issues
      await waitFor(() => {
        expect(mockAxios.post).toHaveBeenCalled();
      });
    });
  });

  describe('Navigation and User Experience', () => {
    test('should call onBackToCart when Back to Cart is clicked', () => {
      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      const backButton = screen.getByText('Back to Cart');
      fireEvent.click(backButton);

      expect(mockOnBackToCart).toHaveBeenCalled();
    });

    test('should show loading state during order processing', async () => {
      mockAxios.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Fill in all required fields
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test Customer' } });
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/street address/i), { target: { value: '123 Test St' } });
      fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Test City' } });
      fireEvent.change(screen.getByLabelText(/state\/province/i), { target: { value: 'TS' } });
      fireEvent.change(screen.getByLabelText(/zip\/postal code/i), { target: { value: '12345' } });

      // Submit order
      const placeOrderButton = screen.getByText('Place Order');
      fireEvent.click(placeOrderButton);

      // Should show loading state
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(placeOrderButton).toBeDisabled();
    });
  });
}); 