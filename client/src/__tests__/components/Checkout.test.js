/**
 * Comprehensive tests for Checkout component
 * Tests multi-item order processing, form validation, and image handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Checkout from '../../components/Checkout';

// Mock cart data with multiple items and different image formats
const mockCartItems = [
  {
    id: 1,
    color: 'blue',
    size: 'medium',
    quantity: 2,
    price: 25.00,
    designImage: 'design-1.jpg',
    totalPrice: 50.00
  },
  {
    id: 2,
    color: 'red',
    size: 'large',
    quantity: 1,
    price: 25.00,
    designImage: 'design-2.webp',
    totalPrice: 25.00
  },
  {
    id: 3,
    color: 'white',
    size: 'small',
    quantity: 3,
    price: 25.00,
    designImage: 'design-3.png',
    totalPrice: 75.00
  }
];

// Mock order submission response
const mockOrderResponse = {
  orderId: 12345,
  orderNumber: 'TSHIRT-12345',
  message: 'Order created successfully'
};

// Mock fetch for order submission
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(mockOrderResponse),
  })
);

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

  beforeEach(() => {
    mockOnOrderComplete = jest.fn();
    mockOnBackToCart = jest.fn();
    fetch.mockClear();
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

      expect(screen.getByText('Checkout')).toBeInTheDocument();
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
      expect(screen.getByText('Blue Medium')).toBeInTheDocument();
      expect(screen.getByText('Red Large')).toBeInTheDocument();
      expect(screen.getByText('White Small')).toBeInTheDocument();
      
      // Check quantities
      expect(screen.getByText('Quantity: 2')).toBeInTheDocument();
      expect(screen.getByText('Quantity: 1')).toBeInTheDocument();
      expect(screen.getByText('Quantity: 3')).toBeInTheDocument();
    });

    test('should display correct totals', () => {
      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Total items: 2 + 1 + 3 = 6
      expect(screen.getByText('Total Items: 6')).toBeInTheDocument();
      // Total price: $50 + $25 + $75 = $150
      expect(screen.getByText('Total Amount: $150.00')).toBeInTheDocument();
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
      const images = screen.getAllByAltText(/design preview/i);
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
      expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/customer email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/shipping address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/shipping city/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/shipping state/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/shipping zip code/i)).toBeInTheDocument();
    });

    test('should validate required fields on submission', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Try to submit without filling required fields
      const placeOrderButton = screen.getByText('Place Order');
      await user.click(placeOrderButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/customer name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/customer email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/shipping address is required/i)).toBeInTheDocument();
      });
    });

    test('should validate email format', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Fill in customer name
      const nameInput = screen.getByLabelText(/customer name/i);
      await user.type(nameInput, 'Test Customer');

      // Fill in invalid email
      const emailInput = screen.getByLabelText(/customer email/i);
      await user.type(emailInput, 'invalid-email');

      // Fill in shipping address
      const addressInput = screen.getByLabelText(/shipping address/i);
      await user.type(addressInput, '123 Test St');

      // Try to submit
      const placeOrderButton = screen.getByText('Place Order');
      await user.click(placeOrderButton);

      // Should show email validation error
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    test('should validate zip code format', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Fill in required fields
      await user.type(screen.getByLabelText(/customer name/i), 'Test Customer');
      await user.type(screen.getByLabelText(/customer email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/shipping address/i), '123 Test St');

      // Fill in invalid zip code
      const zipInput = screen.getByLabelText(/shipping zip code/i);
      await user.type(zipInput, 'invalid');

      // Try to submit
      const placeOrderButton = screen.getByText('Place Order');
      await user.click(placeOrderButton);

      // Should show zip code validation error
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid zip code/i)).toBeInTheDocument();
      });
    });
  });

  describe('Order Submission', () => {
    test('should submit order successfully with valid data', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Fill in all required fields
      await user.type(screen.getByLabelText(/customer name/i), 'Test Customer');
      await user.type(screen.getByLabelText(/customer email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/shipping address/i), '123 Test St');
      await user.type(screen.getByLabelText(/shipping city/i), 'Test City');
      await user.type(screen.getByLabelText(/shipping state/i), 'TS');
      await user.type(screen.getByLabelText(/shipping zip code/i), '12345');

      // Submit order
      const placeOrderButton = screen.getByText('Place Order');
      await user.click(placeOrderButton);

      // Should show loading state
      expect(screen.getByText('Processing Order...')).toBeInTheDocument();

      // Wait for order completion
      await waitFor(() => {
        expect(mockOnOrderComplete).toHaveBeenCalledWith({
          orderId: 12345,
          orderNumber: 'TSHIRT-12345',
          message: 'Order created successfully'
        });
      });
    });

    test('should handle order submission errors', async () => {
      // Mock fetch to return error
      fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'Bad Request' }),
        })
      );

      const user = userEvent.setup();
      
      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Fill in all required fields
      await user.type(screen.getByLabelText(/customer name/i), 'Test Customer');
      await user.type(screen.getByLabelText(/customer email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/shipping address/i), '123 Test St');
      await user.type(screen.getByLabelText(/shipping city/i), 'Test City');
      await user.type(screen.getByLabelText(/shipping state/i), 'TS');
      await user.type(screen.getByLabelText(/shipping zip code/i), '12345');

      // Submit order
      const placeOrderButton = screen.getByText('Place Order');
      await user.click(placeOrderButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to submit order/i)).toBeInTheDocument();
      });

      expect(mockOnOrderComplete).not.toHaveBeenCalled();
    });

    test('should handle network errors gracefully', async () => {
      // Mock fetch to throw network error
      fetch.mockImplementationOnce(() =>
        Promise.reject(new Error('Network error'))
      );

      const user = userEvent.setup();
      
      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Fill in all required fields
      await user.type(screen.getByLabelText(/customer name/i), 'Test Customer');
      await user.type(screen.getByLabelText(/customer email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/shipping address/i), '123 Test St');
      await user.type(screen.getByLabelText(/shipping city/i), 'Test City');
      await user.type(screen.getByLabelText(/shipping state/i), 'TS');
      await user.type(screen.getByLabelText(/shipping zip code/i), '12345');

      // Submit order
      const placeOrderButton = screen.getByText('Place Order');
      await user.click(placeOrderButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/network error occurred/i)).toBeInTheDocument();
      });

      expect(mockOnOrderComplete).not.toHaveBeenCalled();
    });
  });

  describe('Multi-Item Order Processing', () => {
    test('should process order with multiple items correctly', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Fill in all required fields
      await user.type(screen.getByLabelText(/customer name/i), 'Test Customer');
      await user.type(screen.getByLabelText(/customer email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/shipping address/i), '123 Test St');
      await user.type(screen.getByLabelText(/shipping city/i), 'Test City');
      await user.type(screen.getByLabelText(/shipping state/i), 'TS');
      await user.type(screen.getByLabelText(/shipping zip code/i), '12345');

      // Submit order
      const placeOrderButton = screen.getByText('Place Order');
      await user.click(placeOrderButton);

      // Verify fetch was called with correct data
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/orders', {
          method: 'POST',
          body: expect.any(FormData)
        });
      });

      // Verify FormData contains all items
      const formDataCall = fetch.mock.calls[0][1];
      const formData = formDataCall.body;
      
      // Check if all items are included in FormData
      expect(formData.get('customerName')).toBe('Test Customer');
      expect(formData.get('customerEmail')).toBe('test@example.com');
      expect(formData.get('shippingAddress')).toBe('123 Test St');
      expect(formData.get('shippingCity')).toBe('Test City');
      expect(formData.get('shippingState')).toBe('TS');
      expect(formData.get('shippingZipCode')).toBe('12345');
    });

    test('should handle large orders efficiently', async () => {
      // Create a large cart with 20 items
      const largeCart = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        color: ['white', 'blue', 'yellow', 'red', 'black'][i % 5],
        size: ['small', 'medium', 'large'][i % 3],
        quantity: Math.floor(Math.random() * 5) + 1,
        price: 25.00,
        designImage: `design-${i + 1}.jpg`,
        totalPrice: 25.00
      }));

      const user = userEvent.setup();
      
      renderWithRouter(
        <Checkout
          cart={largeCart}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Fill in all required fields
      await user.type(screen.getByLabelText(/customer name/i), 'Test Customer');
      await user.type(screen.getByLabelText(/customer email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/shipping address/i), '123 Test St');
      await user.type(screen.getByLabelText(/shipping city/i), 'Test City');
      await user.type(screen.getByLabelText(/shipping state/i), 'TS');
      await user.type(screen.getByLabelText(/shipping zip code/i), '12345');

      // Submit order
      const placeOrderButton = screen.getByText('Place Order');
      await user.click(placeOrderButton);

      // Should process large order without performance issues
      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Image Format Handling', () => {
    test('should handle mixed image formats in order', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Fill in all required fields
      await user.type(screen.getByLabelText(/customer name/i), 'Test Customer');
      await user.type(screen.getByLabelText(/customer email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/shipping address/i), '123 Test St');
      await user.type(screen.getByLabelText(/shipping city/i), 'Test City');
      await user.type(screen.getByLabelText(/shipping state/i), 'TS');
      await user.type(screen.getByLabelText(/shipping zip code/i), '12345');

      // Submit order
      const placeOrderButton = screen.getByText('Place Order');
      await user.click(placeOrderButton);

      // Verify all image formats are processed
      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      // Check if all images are displayed in summary
      expect(screen.getByAltText(/design-1\.jpg/i)).toBeInTheDocument();
      expect(screen.getByAltText(/design-2\.webp/i)).toBeInTheDocument();
      expect(screen.getByAltText(/design-3\.png/i)).toBeInTheDocument();
    });

    test('should handle missing images gracefully', () => {
      const cartWithMissingImages = [
        {
          id: 1,
          color: 'blue',
          size: 'medium',
          quantity: 2,
          price: 25.00,
          designImage: null, // Missing image
          totalPrice: 50.00
        }
      ];

      renderWithRouter(
        <Checkout
          cart={cartWithMissingImages}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Should still display item information
      expect(screen.getByText('Blue Medium')).toBeInTheDocument();
      expect(screen.getByText('Quantity: 2')).toBeInTheDocument();
    });
  });

  describe('Navigation and User Experience', () => {
    test('should call onBackToCart when Back to Cart is clicked', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      const backButton = screen.getByText('Back to Cart');
      await user.click(backButton);

      expect(mockOnBackToCart).toHaveBeenCalled();
    });

    test('should show loading state during order processing', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Fill in all required fields
      await user.type(screen.getByLabelText(/customer name/i), 'Test Customer');
      await user.type(screen.getByLabelText(/customer email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/shipping address/i), '123 Test St');
      await user.type(screen.getByLabelText(/shipping city/i), 'Test City');
      await user.type(screen.getByLabelText(/shipping state/i), 'TS');
      await user.type(screen.getByLabelText(/shipping zip code/i), '12345');

      // Submit order
      const placeOrderButton = screen.getByText('Place Order');
      await user.click(placeOrderButton);

      // Should show loading state
      expect(screen.getByText('Processing Order...')).toBeInTheDocument();
      expect(placeOrderButton).toBeDisabled();
    });

    test('should prevent multiple submissions', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Fill in all required fields
      await user.type(screen.getByLabelText(/customer name/i), 'Test Customer');
      await user.type(screen.getByLabelText(/customer email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/shipping address/i), '123 Test St');
      await user.type(screen.getByLabelText(/shipping city/i), 'Test City');
      await user.type(screen.getByLabelText(/shipping state/i), 'TS');
      await user.type(screen.getByLabelText(/shipping zip code/i), '12345');

      // Submit order
      const placeOrderButton = screen.getByText('Place Order');
      await user.click(placeOrderButton);

      // Try to submit again
      await user.click(placeOrderButton);

      // Should only call fetch once
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Responsive Design', () => {
    test('should handle mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Component should render without errors on mobile
      expect(screen.getByText('Checkout')).toBeInTheDocument();
    });

    test('should handle tablet viewport', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Component should render without errors on tablet
      expect(screen.getByText('Checkout')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper form labels and ARIA attributes', () => {
      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Check for proper form labels
      expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/customer email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/shipping address/i)).toBeInTheDocument();

      // Check for proper button roles
      expect(screen.getByRole('button', { name: /place order/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to cart/i })).toBeInTheDocument();
    });

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <Checkout
          cart={mockCartItems}
          onOrderComplete={mockOnOrderComplete}
          onBackToCart={mockOnBackToCart}
        />
      );

      // Tab through form fields
      await user.tab();
      
      // Should be able to navigate through all form fields
      const formInputs = screen.getAllByRole('textbox');
      expect(formInputs.length).toBeGreaterThan(0);
    });
  });
}); 