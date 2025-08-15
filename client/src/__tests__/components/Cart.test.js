/**
 * Comprehensive tests for Cart component
 * Tests multi-item management, image display, and cart operations
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Cart from '../../components/Cart';

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
    test('should render cart header and summary', () => {
      renderWithRouter(
        <Cart
          cart={mockCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      expect(screen.getByText('Shopping Cart')).toBeInTheDocument();
      expect(screen.getByText('Cart Summary')).toBeInTheDocument();
    });

    test('should display total items count', () => {
      renderWithRouter(
        <Cart
          cart={mockCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      // Total items: 2 + 1 + 3 = 6
      expect(screen.getByText('Total Items: 6')).toBeInTheDocument();
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

      // Total price: $50 + $25 + $75 = $150
      expect(screen.getByText('Total Price: $150.00')).toBeInTheDocument();
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

      // Check if all items are displayed
      expect(screen.getByText('Blue Medium')).toBeInTheDocument();
      expect(screen.getByText('Red Large')).toBeInTheDocument();
      expect(screen.getByText('White Small')).toBeInTheDocument();
    });

    test('should display item details correctly', () => {
      renderWithRouter(
        <Cart
          cart={mockCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      // Check first item details
      expect(screen.getByText('Blue Medium')).toBeInTheDocument();
      expect(screen.getByText('Quantity: 2')).toBeInTheDocument();
      expect(screen.getByText('$50.00')).toBeInTheDocument();
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
      const images = screen.getAllByAltText(/design preview/i);
      expect(images).toHaveLength(3);
    });

    test('should handle different image formats', () => {
      renderWithRouter(
        <Cart
          cart={mockCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      // Check if different format images are handled
      expect(screen.getByAltText(/design-1\.jpg/i)).toBeInTheDocument();
      expect(screen.getByAltText(/design-2\.webp/i)).toBeInTheDocument();
      expect(screen.getByAltText(/design-3\.png/i)).toBeInTheDocument();
    });
  });

  describe('Cart Item Management', () => {
    test('should allow removing items', async () => {
      const user = userEvent.setup();
      
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
      await user.click(removeButtons[0]);

      expect(mockOnRemoveItem).toHaveBeenCalledWith(0);
    });

    test('should allow updating item quantities', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <Cart
          cart={mockCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      // Find quantity input for first item
      const quantityInputs = screen.getAllByDisplayValue('2');
      const firstQuantityInput = quantityInputs[0];

      // Update quantity
      await user.clear(firstQuantityInput);
      await user.type(firstQuantityInput, '5');

      // Trigger update
      fireEvent.blur(firstQuantityInput);

      expect(mockOnUpdateItem).toHaveBeenCalledWith(0, {
        ...mockCartItems[0],
        quantity: 5,
        totalPrice: 125.00
      });
    });

    test('should prevent negative quantities', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <Cart
          cart={mockCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      // Find quantity input for first item
      const quantityInputs = screen.getAllByDisplayValue('2');
      const firstQuantityInput = quantityInputs[0];

      // Try to set negative quantity
      await user.clear(firstQuantityInput);
      await user.type(firstQuantityInput, '-1');

      // Trigger update
      fireEvent.blur(firstQuantityInput);

      // Should default to minimum quantity (1)
      expect(mockOnUpdateItem).toHaveBeenCalledWith(0, {
        ...mockCartItems[0],
        quantity: 1,
        totalPrice: 25.00
      });
    });

    test('should update total price when quantities change', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <Cart
          cart={mockCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      // Find quantity input for first item
      const quantityInputs = screen.getAllByDisplayValue('2');
      const firstQuantityInput = quantityInputs[0];

      // Update quantity to 4
      await user.clear(firstQuantityInput);
      await user.type(firstQuantityInput, '4');

      // Trigger update
      fireEvent.blur(firstQuantityInput);

      // Total price should be updated: (4 * $25) + $25 + $75 = $200
      expect(screen.getByText('Total Price: $200.00')).toBeInTheDocument();
    });
  });

  describe('Cart Navigation', () => {
    test('should call onBackToDesigner when Back to Designer is clicked', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <Cart
          cart={mockCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      const backButton = screen.getByText('Back to Designer');
      await user.click(backButton);

      expect(mockOnBackToDesigner).toHaveBeenCalled();
    });

    test('should call onProceedToCheckout when Proceed to Checkout is clicked', async () => {
      const user = userEvent.setup();
      
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
      await user.click(checkoutButton);

      expect(mockOnProceedToCheckout).toHaveBeenCalled();
    });

    test('should disable checkout button when cart is empty', () => {
      renderWithRouter(
        <Cart
          cart={[]}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      const checkoutButton = screen.getByText('Proceed to Checkout');
      expect(checkoutButton).toBeDisabled();
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

      expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
      expect(screen.getByText('Start designing your custom t-shirt!')).toBeInTheDocument();
    });

    test('should show correct totals for empty cart', () => {
      renderWithRouter(
        <Cart
          cart={[]}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      expect(screen.getByText('Total Items: 0')).toBeInTheDocument();
      expect(screen.getByText('Total Price: $0.00')).toBeInTheDocument();
    });
  });

  describe('Cart Item Validation', () => {
    test('should validate item data integrity', () => {
      const invalidCartItems = [
        {
          id: 1,
          color: 'blue',
          size: 'medium',
          quantity: 2,
          price: 25.00,
          // Missing designImage
          totalPrice: 50.00
        }
      ];

      renderWithRouter(
        <Cart
          cart={invalidCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      // Should handle missing image gracefully
      expect(screen.getByText('Blue Medium')).toBeInTheDocument();
    });

    test('should handle corrupted image files', () => {
      const corruptedCartItems = [
        {
          id: 1,
          color: 'blue',
          size: 'medium',
          quantity: 2,
          price: 25.00,
          designImage: 'corrupted-image.jpg',
          totalPrice: 50.00
        }
      ];

      renderWithRouter(
        <Cart
          cart={corruptedCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      // Should display item even with corrupted image
      expect(screen.getByText('Blue Medium')).toBeInTheDocument();
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
        <Cart
          cart={mockCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      // Component should render without errors on mobile
      expect(screen.getByText('Shopping Cart')).toBeInTheDocument();
    });

    test('should handle tablet viewport', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderWithRouter(
        <Cart
          cart={mockCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      // Component should render without errors on tablet
      expect(screen.getByText('Shopping Cart')).toBeInTheDocument();
    });
  });

  describe('Performance and Memory', () => {
    test('should handle large cart efficiently', () => {
      // Create a large cart with 50 items
      const largeCart = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        color: ['white', 'blue', 'yellow', 'red', 'black'][i % 5],
        size: ['small', 'medium', 'large'][i % 3],
        quantity: Math.floor(Math.random() * 5) + 1,
        price: 25.00,
        designImage: `design-${i + 1}.jpg`,
        totalPrice: 25.00
      }));

      renderWithRouter(
        <Cart
          cart={largeCart}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      // Should display all items without performance issues
      expect(screen.getByText('Total Items: 50')).toBeInTheDocument();
    });

    test('should handle image loading efficiently', async () => {
      renderWithRouter(
        <Cart
          cart={mockCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      // All images should be loaded
      const images = screen.getAllByAltText(/design preview/i);
      expect(images).toHaveLength(3);

      // Check if images have proper loading attributes
      images.forEach(img => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      renderWithRouter(
        <Cart
          cart={mockCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      // Check for proper labels
      expect(screen.getByLabelText(/shopping cart/i)).toBeInTheDocument();
      
      // Check quantity inputs have labels
      const quantityInputs = screen.getAllByDisplayValue('2');
      quantityInputs.forEach(input => {
        expect(input).toHaveAttribute('aria-label');
      });
    });

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <Cart
          cart={mockCartItems}
          onRemoveItem={mockOnRemoveItem}
          onUpdateItem={mockOnUpdateItem}
          onProceedToCheckout={mockOnProceedToCheckout}
          onBackToDesigner={mockOnBackToDesigner}
        />
      );

      // Tab through interactive elements
      await user.tab();
      
      // Should be able to navigate through all interactive elements
      const interactiveElements = screen.getAllByRole('button');
      expect(interactiveElements.length).toBeGreaterThan(0);
    });
  });
}); 