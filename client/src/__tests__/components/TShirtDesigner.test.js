/**
 * Comprehensive tests for TShirtDesigner component
 * Tests multi-item order creation, image uploads, and various image formats
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import TShirtDesigner from '../../components/TShirtDesigner';

// Mock the options API response
const mockOptions = {
  colors: ['white', 'blue', 'yellow', 'red', 'black'],
  sizes: ['small', 'medium', 'large'],
  basePrice: 25.00
};

// Mock fetch for options API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(mockOptions),
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

describe('TShirtDesigner Component', () => {
  let mockOnAddToCart;
  let mockOnProceedToCart;

  beforeEach(() => {
    mockOnAddToCart = jest.fn();
    mockOnProceedToCart = jest.fn();
    fetch.mockClear();
  });

  describe('Component Rendering', () => {
    test('should render the main heading and description', () => {
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      expect(screen.getByText('Design Your Custom T-Shirt')).toBeInTheDocument();
      expect(screen.getByText(/Upload your design image/)).toBeInTheDocument();
    });

    test('should render color selection options', () => {
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      mockOptions.colors.forEach(color => {
        expect(screen.getByText(color.charAt(0).toUpperCase() + color.slice(1))).toBeInTheDocument();
      });
    });

    test('should render size selection options', () => {
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      mockOptions.colors.forEach(size => {
        expect(screen.getByText(size.charAt(0).toUpperCase() + size.slice(1))).toBeInTheDocument();
      });
    });

    test('should render file upload area', () => {
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      expect(screen.getByText('Upload Design Image')).toBeInTheDocument();
      expect(screen.getByText(/Drag and drop your image here/)).toBeInTheDocument();
    });
  });

  describe('Color and Size Selection', () => {
    test('should allow selecting different colors', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      // Select blue color
      const blueColorButton = screen.getByText('Blue');
      await user.click(blueColorButton);
      expect(blueColorButton).toHaveClass('selected');

      // Select red color
      const redColorButton = screen.getByText('Red');
      await user.click(redColorButton);
      expect(redColorButton).toHaveClass('selected');
      expect(blueColorButton).not.toHaveClass('selected');
    });

    test('should allow selecting different sizes', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      // Select medium size
      const mediumSizeButton = screen.getByText('Medium');
      await user.click(mediumSizeButton);
      expect(mediumSizeButton).toHaveClass('selected');

      // Select large size
      const largeSizeButton = screen.getByText('Large');
      await user.click(largeSizeButton);
      expect(largeSizeButton).toHaveClass('selected');
      expect(mediumSizeButton).not.toHaveClass('selected');
    });

    test('should allow selecting both color and size simultaneously', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      // Select blue color and medium size
      const blueColorButton = screen.getByText('Blue');
      const mediumSizeButton = screen.getByText('Medium');
      
      await user.click(blueColorButton);
      await user.click(mediumSizeButton);
      
      expect(blueColorButton).toHaveClass('selected');
      expect(mediumSizeButton).toHaveClass('selected');
    });
  });

  describe('Image Upload and Preview', () => {
    test('should handle JPEG image upload', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      const fileInput = screen.getByLabelText(/upload design image/i);
      const jpegFile = global.testUtils.generateTestImageFile('design.jpg', 'image/jpeg');

      await user.upload(fileInput, jpegFile);

      // Check if image preview is shown
      await waitFor(() => {
        expect(screen.getByAltText('Design Preview')).toBeInTheDocument();
      });
    });

    test('should handle PNG image upload', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      const fileInput = screen.getByLabelText(/upload design image/i);
      const pngFile = global.testUtils.generateTestImageFile('design.png', 'image/png');

      await user.upload(fileInput, pngFile);

      await waitFor(() => {
        expect(screen.getByAltText('Design Preview')).toBeInTheDocument();
      });
    });

    test('should handle WebP image upload', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      const fileInput = screen.getByLabelText(/upload design image/i);
      const webpFile = global.testUtils.generateTestImageFile('design.webp', 'image/webp');

      await user.upload(fileInput, webpFile);

      await waitFor(() => {
        expect(screen.getByAltText('Design Preview')).toBeInTheDocument();
      });
    });

    test('should handle SVG image upload', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      const fileInput = screen.getByLabelText(/upload design image/i);
      const svgFile = global.testUtils.generateTestImageFile('design.svg', 'image/svg+xml');

      await user.upload(fileInput, svgFile);

      await waitFor(() => {
        expect(screen.getByAltText('Design Preview')).toBeInTheDocument();
      });
    });

    test('should reject unsupported image formats', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      const fileInput = screen.getByLabelText(/upload design image/i);
      const unsupportedFile = global.testUtils.generateTestImageFile('design.bmp', 'image/bmp');

      await user.upload(fileInput, unsupportedFile);

      // Should show error message for unsupported format
      await waitFor(() => {
        expect(screen.getByText(/unsupported file format/i)).toBeInTheDocument();
      });
    });

    test('should handle file size validation', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      const fileInput = screen.getByLabelText(/upload design image/i);
      // Create a file that's too large (over 10MB)
      const largeFile = global.testUtils.generateTestImageFile('large-design.jpg', 'image/jpeg', 11 * 1024 * 1024);

      await user.upload(fileInput, largeFile);

      // Should show error message for file too large
      await waitFor(() => {
        expect(screen.getByText(/file size too large/i)).toBeInTheDocument();
      });
    });
  });

  describe('Quantity and Price Management', () => {
    test('should allow changing quantity', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      const quantityInput = screen.getByLabelText(/quantity/i);
      const initialValue = quantityInput.value;

      // Increase quantity
      await user.clear(quantityInput);
      await user.type(quantityInput, '3');
      
      expect(quantityInput.value).toBe('3');
    });

    test('should calculate price correctly', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      const quantityInput = screen.getByLabelText(/quantity/i);
      
      // Set quantity to 2
      await user.clear(quantityInput);
      await user.type(quantityInput, '2');
      
      // Price should be 2 * $25.00 = $50.00
      expect(screen.getByText('$50.00')).toBeInTheDocument();
    });

    test('should prevent negative quantities', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      const quantityInput = screen.getByLabelText(/quantity/i);
      
      // Try to set negative quantity
      await user.clear(quantityInput);
      await user.type(quantityInput, '-1');
      
      // Should default to minimum quantity (1)
      expect(quantityInput.value).toBe('1');
    });
  });

  describe('Add to Cart Functionality', () => {
    test('should add single item to cart', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      // Select color and size
      const blueColorButton = screen.getByText('Blue');
      const mediumSizeButton = screen.getByText('Medium');
      await user.click(blueColorButton);
      await user.click(mediumSizeButton);

      // Upload image
      const fileInput = screen.getByLabelText(/upload design image/i);
      const imageFile = global.testUtils.generateTestImageFile('design.jpg', 'image/jpeg');
      await user.upload(fileInput, imageFile);

      // Set quantity
      const quantityInput = screen.getByLabelText(/quantity/i);
      await user.clear(quantityInput);
      await user.type(quantityInput, '2');

      // Click Add to Cart
      const addToCartButton = screen.getByText('Add to Cart');
      await user.click(addToCartButton);

      // Verify onAddToCart was called with correct data
      expect(mockOnAddToCart).toHaveBeenCalledWith({
        color: 'blue',
        size: 'medium',
        quantity: 2,
        price: 25.00,
        designImage: imageFile,
        totalPrice: 50.00
      });
    });

    test('should validate required fields before adding to cart', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      // Try to add to cart without selecting color
      const addToCartButton = screen.getByText('Add to Cart');
      await user.click(addToCartButton);

      // Should show validation error
      expect(screen.getByText(/please select a color/i)).toBeInTheDocument();
      expect(mockOnAddToCart).not.toHaveBeenCalled();
    });

    test('should validate image upload before adding to cart', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      // Select color and size
      const blueColorButton = screen.getByText('Blue');
      const mediumSizeButton = screen.getByText('Medium');
      await user.click(blueColorButton);
      await user.click(mediumSizeButton);

      // Try to add to cart without uploading image
      const addToCartButton = screen.getByText('Add to Cart');
      await user.click(addToCartButton);

      // Should show validation error
      expect(screen.getByText(/please upload a design image/i)).toBeInTheDocument();
      expect(mockOnAddToCart).not.toHaveBeenCalled();
    });
  });

  describe('Proceed to Cart Functionality', () => {
    test('should call onProceedToCart when Proceed to Cart is clicked', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      const proceedToCartButton = screen.getByText('Proceed to Cart');
      await user.click(proceedToCartButton);

      expect(mockOnProceedToCart).toHaveBeenCalled();
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
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      // Component should render without errors on mobile
      expect(screen.getByText('Design Your Custom T-Shirt')).toBeInTheDocument();
    });

    test('should handle tablet viewport', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      // Component should render without errors on tablet
      expect(screen.getByText('Design Your Custom T-Shirt')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      // Mock API failure
      fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
      );

      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      // Component should still render with default options
      expect(screen.getByText('Design Your Custom T-Shirt')).toBeInTheDocument();
    });

    test('should handle file upload errors', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      const fileInput = screen.getByLabelText(/upload design image/i);
      
      // Create a corrupted file (empty buffer)
      const corruptedFile = new File([], 'corrupted.jpg', { type: 'image/jpeg' });
      
      await user.upload(fileInput, corruptedFile);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/error processing image/i)).toBeInTheDocument();
      });
    });
  });
}); 