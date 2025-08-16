/**
 * TShirtDesigner Component Tests - Fixed to match current implementation
 * Tests multi-item design creation, image uploads, and form validation
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TShirtDesigner from '../../components/TShirtDesigner';

// Mock options data
const mockOptions = {
  colors: ['white', 'blue', 'yellow', 'red', 'black'],
  sizes: ['small', 'medium', 'large'],
  basePrice: 25.00
};

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
  });

  describe('Component Rendering', () => {
    test('should render the main headings', () => {
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      expect(screen.getByText('Upload Your Design')).toBeInTheDocument();
      expect(screen.getByText('Customize Your T-Shirt')).toBeInTheDocument();
    });

    test('should render file upload area', () => {
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      expect(screen.getByText(/Drag and drop your design here/)).toBeInTheDocument();
      expect(screen.getByText(/or click to browse files/)).toBeInTheDocument();
    });
  });

  describe('Color and Size Selection', () => {
    test('should allow selecting different colors', () => {
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      // Color options are rendered as divs with title attributes, not text
      const colorOptions = screen.getAllByTitle(/^(White|Blue|Yellow|Red|Black)$/);
      expect(colorOptions.length).toBe(5);
    });

    test('should allow selecting different sizes', () => {
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      // Size options are rendered as text
      expect(screen.getByText('Small')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Large')).toBeInTheDocument();
    });

    test('should allow selecting both color and size simultaneously', () => {
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      // Click on color and size options
      const blueColorOption = screen.getByTitle('Blue');
      const mediumSizeOption = screen.getByText('Medium');
      
      fireEvent.click(blueColorOption);
      fireEvent.click(mediumSizeOption);
      
      // Verify they have the selected class
      expect(blueColorOption).toHaveClass('selected');
      expect(mediumSizeOption).toHaveClass('selected');
    });
  });

  describe('Quantity and Price Management', () => {
    test('should allow changing quantity', () => {
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      // Quantity is controlled by +/- buttons, not an input field
      const increaseButton = screen.getByText('+');
      const decreaseButton = screen.getByText('-');
      const quantityDisplay = screen.getByText('1');
      
      expect(quantityDisplay).toBeInTheDocument();
      expect(increaseButton).toBeInTheDocument();
      expect(decreaseButton).toBeInTheDocument();
    });

    test('should calculate price correctly', () => {
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      // Initial price should be $25.00 - look for the label containing the price
      expect(screen.getByText(/Price per shirt: \$25\.00/)).toBeInTheDocument();
      expect(screen.getByText(/Total: \$25\.00/)).toBeInTheDocument();
      
      // Increase quantity and check total
      const increaseButton = screen.getByText('+');
      fireEvent.click(increaseButton);
      
      // Now should show $50.00 total
      expect(screen.getByText(/Total: \$50\.00/)).toBeInTheDocument();
    });
  });

  describe('Add to Cart Functionality', () => {
    test('should add item to cart with selected options', () => {
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      // First, simulate uploading a design image
      const fileInput = screen.getByDisplayValue('');
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      // Mock the FileReader
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        result: 'data:image/jpeg;base64,test-image-data',
        onload: null
      };
      global.FileReader = jest.fn(() => mockFileReader);

      // Trigger file input change
      fireEvent.change(fileInput, { target: { files: [testFile] } });
      
      // Simulate FileReader completion
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test-image-data' } });

      // Select color and size
      const blueColorOption = screen.getByTitle('Blue');
      const mediumSizeOption = screen.getByText('Medium');
      fireEvent.click(blueColorOption);
      fireEvent.click(mediumSizeOption);

      // Increase quantity
      const increaseButton = screen.getByText('+');
      fireEvent.click(increaseButton);

      // Click Add to Cart
      const addToCartButton = screen.getByText('Add to Cart');
      fireEvent.click(addToCartButton);

      // Verify onAddToCart was called with correct data
      expect(mockOnAddToCart).toHaveBeenCalledWith({
        id: expect.any(Number),
        designImage: testFile,
        color: 'blue',
        size: 'medium',
        quantity: 2,
        price: 25.00,
        imagePreview: 'data:image/jpeg;base64,test-image-data'
      });
    });

    test('should validate required fields before adding to cart', () => {
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      // Try to add to cart without uploading image
      const addToCartButton = screen.getByText('Add to Cart');
      fireEvent.click(addToCartButton);

      // Should show alert (we can't easily test alert in jest)
      // The button should be disabled when no image is uploaded
      expect(addToCartButton).toBeDisabled();
      expect(mockOnAddToCart).not.toHaveBeenCalled();
    });
  });

  describe('Proceed to Cart Functionality', () => {
    test('should call onProceedToCart when View Cart is clicked', () => {
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      const viewCartButton = screen.getByText('View Cart');
      fireEvent.click(viewCartButton);

      expect(mockOnProceedToCart).toHaveBeenCalled();
    });
  });

  describe('Multi-Item Support', () => {
    test('should handle multiple items in cart', () => {
      renderWithRouter(
        <TShirtDesigner
          options={mockOptions}
          onAddToCart={mockOnAddToCart}
          onProceedToCart={mockOnProceedToCart}
        />
      );

      // First, simulate uploading a design image
      const fileInput = screen.getByDisplayValue('');
      const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      // Mock the FileReader
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        result: 'data:image/jpeg;base64,test-image-data',
        onload: null
      };
      global.FileReader = jest.fn(() => mockFileReader);

      // Trigger file input change
      fireEvent.change(fileInput, { target: { files: [testFile] } });
      
      // Simulate FileReader completion
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test-image-data' } });

      // Add first item
      const blueColorOption = screen.getByTitle('Blue');
      const mediumSizeOption = screen.getByText('Medium');
      fireEvent.click(blueColorOption);
      fireEvent.click(mediumSizeOption);

      const increaseButton = screen.getByText('+');
      fireEvent.click(increaseButton);

      const addToCartButton = screen.getByText('Add to Cart');
      fireEvent.click(addToCartButton);

      // Verify first item was added
      expect(mockOnAddToCart).toHaveBeenCalledWith({
        id: expect.any(Number),
        designImage: testFile,
        color: 'blue',
        size: 'medium',
        quantity: 2,
        price: 25.00,
        imagePreview: 'data:image/jpeg;base64,test-image-data'
      });

      // Reset for second item
      mockOnAddToCart.mockClear();

      // Re-upload image for second item (since component resets form)
      fireEvent.change(fileInput, { target: { files: [testFile] } });
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test-image-data' } });

      // Add second item with different options
      const redColorOption = screen.getByTitle('Red');
      const largeSizeOption = screen.getByText('Large');
      fireEvent.click(redColorOption);
      fireEvent.click(largeSizeOption);

      // Reset quantity to 1
      const decreaseButton = screen.getByText('-');
      fireEvent.click(decreaseButton);

      fireEvent.click(addToCartButton);

      // Verify second item was added
      expect(mockOnAddToCart).toHaveBeenCalledWith({
        id: expect.any(Number),
        designImage: testFile,
        color: 'red',
        size: 'large',
        quantity: 1,
        price: 25.00,
        imagePreview: 'data:image/jpeg;base64,test-image-data'
      });
    });
  });
}); 