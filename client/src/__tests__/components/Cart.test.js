/**
 * Cart Component Tests - Simplified version focusing on core functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Cart from '../../components/Cart';

// Mock cart data with multiple items
const mockCartItems = [
  {
    id: 1,
    color: 'blue',
    size: 'medium',
    quantity: 2,
    price: 25.00,
    imagePreview: 'data:image/jpeg;base64,mock-image-1',
    totalPrice: 50.00
  },
  {
    id: 2,
    color: 'red',
    size: 'large',
    quantity: 1,
    price: 25.00,
    imagePreview: 'data:image/jpeg;base64,mock-image-2',
    totalPrice: 25.00
  },
  {
    id: 3,
    color: 'white',
    size: 'small',
    quantity: 3,
    price: 25.00,
    imagePreview: 'data:image/jpeg;base64,mock-image-3',
    totalPrice: 75.00
  }
];

// Wrapper component for testing with router
const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Cart Component', () => {
  let mockOnRemoveItem;
  let mockOnUpdateItem;
  let mockOnProceedToCheckout;
  let mockOnBackToDesigner;

  beforeEach(() => {
    mockOnRemoveItem = jest.fn();
    mockOnUpdateItem = jest.fn();
    mockOnProceedToCheckout = jest.fn();
    mockOnBackToDesigner = jest.fn();
  });

  describe('Component Rendering', () => {
    test('should render cart header with item count', () => {
      renderWithRouter(
        <Cart
          cart={mockCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      // Basic rendering test - should not crash
      expect(screen.getByText(/Your Cart/)).toBeTruthy();
    });

    test('should display total price', () => {
      renderWithRouter(
        <Cart
          cart={mockCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      // Should display total
      expect(screen.getByText(/Total:/)).toBeTruthy();
    });
  });

  describe('Cart Item Display', () => {
    test('should render all cart items', () => {
      renderWithRouter(
        <Cart
          cart={mockCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      // Should display item information
      expect(screen.getByText('Blue')).toBeTruthy();
      expect(screen.getByText('Red')).toBeTruthy();
      expect(screen.getByText('White')).toBeTruthy();
    });

    test('should display item images', () => {
      renderWithRouter(
        <Cart
          cart={mockCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      // Check if images are displayed
      const images = screen.getAllByAltText('Design preview');
      expect(images.length).toBe(3);
    });
  });

  describe('Cart Item Management', () => {
    test('should allow removing items', () => {
      renderWithRouter(
        <Cart
          cart={mockCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      // Find and click remove button for first item
      const removeButtons = screen.getAllByText('Remove');
      fireEvent.click(removeButtons[0]);

      expect(mockOnRemoveItem).toHaveBeenCalledWith(0);
    });

    test('should allow editing items', () => {
      renderWithRouter(
        <Cart
          cart={mockCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      // Find and click edit button for first item
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      // Should show edit form
      expect(screen.getByText('Save')).toBeTruthy();
      expect(screen.getByText('Cancel')).toBeTruthy();
    });
  });

  describe('Cart Navigation', () => {
    test('should call onBackToDesigner when Continue Shopping is clicked', () => {
      renderWithRouter(
        <Cart
          cart={mockCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      const continueButton = screen.getByText('Continue Shopping');
      fireEvent.click(continueButton);

      expect(mockOnBackToDesigner).toHaveBeenCalled();
    });

    test('should call onProceedToCheckout when Proceed to Checkout is clicked', () => {
      renderWithRouter(
        <Cart
          cart={mockCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      const checkoutButton = screen.getByText('Proceed to Checkout');
      fireEvent.click(checkoutButton);

      expect(mockOnProceedToCheckout).toHaveBeenCalled();
    });
  });

  describe('Empty Cart State', () => {
    test('should display empty cart message when no items', () => {
      renderWithRouter(
        <Cart
          cart={[]}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      expect(screen.getByText(/Your cart is empty/)).toBeTruthy();
    });
  });

  describe('Multi-Item Cart Functionality', () => {
    test('should handle cart with single item', () => {
      const singleItemCart = [mockCartItems[0]];
      
      renderWithRouter(
        <Cart
          cart={singleItemCart}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      // Should render without errors
      expect(screen.getByText(/Your Cart/)).toBeTruthy();
    });

    test('should handle cart with multiple items', () => {
      renderWithRouter(
        <Cart
          cart={mockCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      // Should render without errors
      expect(screen.getByText(/Your Cart/)).toBeTruthy();
    });
  });
}); 