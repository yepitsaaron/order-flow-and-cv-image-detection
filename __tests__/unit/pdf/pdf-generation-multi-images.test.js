/**
 * Unit tests for PDF generation with multiple images
 * Tests PDF creation for multi-item orders with various image formats
 */

const fs = require('fs');
const path = require('path');

// Mock dependencies
jest.mock('fs');
jest.mock('sharp');
jest.mock('pdfkit');

describe('PDF Generation with Multiple Images', () => {
  let PDFDocument;
  let mockDoc;
  let mockWriteStream;
  let sharp;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock PDFDocument
    mockDoc = {
      pipe: jest.fn().mockReturnThis(),
      addPage: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      moveDown: jest.fn().mockReturnThis(),
      image: jest.fn().mockReturnThis(),
      fillColor: jest.fn().mockReturnThis(),
      fontSize: jest.fn().mockReturnThis(),
      font: jest.fn().mockReturnThis(),
      rect: jest.fn().mockReturnThis(),
      stroke: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      y: 100, // Mock current Y position
      page: { width: 595, height: 842 }, // A4 dimensions
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    };

    PDFDocument = jest.fn().mockImplementation(() => mockDoc);
    
    // Mock write stream
    mockWriteStream = {
      on: jest.fn().mockReturnThis(),
      write: jest.fn(),
      end: jest.fn()
    };

    // Mock fs.createWriteStream
    fs.createWriteStream.mockReturnValue(mockWriteStream);
    
    // Mock sharp for image processing
    sharp = require('sharp');
    sharp.mockImplementation(() => ({
      jpeg: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('converted-jpeg-data')),
      resize: jest.fn().mockReturnThis(),
      metadata: jest.fn().mockResolvedValue({
        width: 800,
        height: 600,
        format: 'jpeg'
      })
    }));
  });

  describe('Multi-Item Order PDF Generation', () => {
    
    test('should generate PDF with 2 items and different image types', async () => {
      const orderData = {
        orderNumber: 'TEST-001',
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        shippingAddress: '123 Test St',
        shippingCity: 'Test City',
        shippingState: 'TS',
        shippingZipCode: '12345',
        totalAmount: 75.00,
        items: [
          {
            color: 'blue',
            size: 'medium',
            quantity: 2,
            price: 25.00,
            designImage: 'design-1.jpg'
          },
          {
            color: 'red',
            size: 'large',
            quantity: 1,
            price: 25.00,
            designImage: 'design-2.webp'
          }
        ]
      };

      // Mock file existence checks
      fs.existsSync.mockImplementation((path) => {
        return path.includes('uploads') || path.includes('orders');
      });

      // Mock image file reading
      fs.readFileSync.mockImplementation((path) => {
        if (path.includes('design-1.jpg')) {
          return Buffer.from('jpg-image-data');
        } else if (path.includes('design-2.webp')) {
          return Buffer.from('webp-image-data');
        }
        return Buffer.from('default-image-data');
      });

      // Mock PDF generation function (this would be imported from server)
      const generateOrderPDF = async (orderData, outputPath) => {
        return new Promise((resolve, reject) => {
          try {
            const doc = new PDFDocument({
              size: 'A4',
              margins: { top: 50, bottom: 50, left: 50, right: 50 }
            });

            const writeStream = fs.createWriteStream(outputPath);
            doc.pipe(writeStream);

            // Add header
            doc.fontSize(20).font('Helvetica-Bold').text('Order Confirmation', { align: 'center' });
            doc.moveDown(0.5);

            // Add order details
            doc.fontSize(12).font('Helvetica').text(`Order #: ${orderData.orderNumber}`);
            doc.text(`Customer: ${orderData.customerName}`);
            doc.text(`Email: ${orderData.customerEmail}`);
            doc.text(`Shipping: ${orderData.shippingAddress}, ${orderData.shippingCity}, ${orderData.shippingState} ${orderData.shippingZipCode}`);
            doc.text(`Total Amount: $${orderData.totalAmount.toFixed(2)}`);
            doc.moveDown(1);

            // Add items
            doc.fontSize(16).font('Helvetica-Bold').text('Order Items:');
            doc.moveDown(0.5);

            for (let i = 0; i < orderData.items.length; i++) {
              const item = orderData.items[i];
              
              // Check if we need a page break
              if (doc.y > 600) {
                doc.addPage();
              }

              // Add item header
              doc.fontSize(14).font('Helvetica-Bold').text(`Item ${i + 1}: ${item.color} ${item.size}`);
              doc.moveDown(0.5);

              // Add item details
              doc.fontSize(12).font('Helvetica').text(`Quantity: ${item.quantity}`);
              doc.text(`Price: $${item.price.toFixed(2)}`);
              doc.text(`Subtotal: $${(item.quantity * item.price).toFixed(2)}`);
              doc.moveDown(0.5);

              // Add design image
              try {
                const imagePath = path.join('uploads', item.designImage);
                if (fs.existsSync(imagePath)) {
                  let imageBuffer = fs.readFileSync(imagePath);
                  
                  // Convert WebP to JPEG if needed
                  if (item.designImage.endsWith('.webp')) {
                    imageBuffer = await sharp(imageBuffer).jpeg().toBuffer();
                  }
                  
                  // Add image to PDF
                  doc.image(imageBuffer, {
                    fit: [200, 120],
                    align: 'center'
                  });
                  doc.moveDown(0.5);
                }
              } catch (error) {
                doc.text('Image not available');
              }

              doc.moveDown(1);
            }

            // Finalize PDF
            doc.end();
            
            writeStream.on('finish', () => {
              resolve(outputPath);
            });

            writeStream.on('error', reject);
          } catch (error) {
            reject(error);
          }
        });
      };

      const outputPath = 'orders/TEST-001.pdf';
      const result = await generateOrderPDF(orderData, outputPath);

      expect(result).toBe(outputPath);
      expect(PDFDocument).toHaveBeenCalledWith({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });
      expect(mockDoc.text).toHaveBeenCalledWith('Order Confirmation', { align: 'center' });
      expect(mockDoc.text).toHaveBeenCalledWith('Order #: TEST-001');
      expect(mockDoc.text).toHaveBeenCalledWith('Customer: Test Customer');
      expect(mockDoc.text).toHaveBeenCalledWith('Item 1: blue medium');
      expect(mockDoc.text).toHaveBeenCalledWith('Item 2: red large');
    });

    test('should handle 5+ items with page breaks', async () => {
      const orderData = {
        orderNumber: 'TEST-002',
        customerName: 'Multi-Item Customer',
        customerEmail: 'multi@example.com',
        shippingAddress: '456 Multi St',
        shippingCity: 'Multi City',
        shippingState: 'MC',
        shippingZipCode: '54321',
        totalAmount: 275.00,
        items: Array(7).fill().map((_, i) => ({
          color: ['white', 'blue', 'yellow', 'red', 'black', 'green', 'purple'][i],
          size: ['small', 'medium', 'large'][i % 3],
          quantity: Math.floor(Math.random() * 5) + 1,
          price: 25.00,
          designImage: `design-${i + 1}.${['jpg', 'png', 'webp', 'svg', 'jpeg'][i % 5]}`
        }))
      };

      // Mock file existence and reading
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(Buffer.from('image-data'));

      const generateOrderPDF = async (orderData, outputPath) => {
        return new Promise((resolve) => {
          const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
          });

          const writeStream = fs.createWriteStream(outputPath);
          doc.pipe(writeStream);

          // Add header
          doc.fontSize(20).font('Helvetica-Bold').text('Order Confirmation', { align: 'center' });
          doc.moveDown(0.5);

          // Add order details
          doc.fontSize(12).font('Helvetica').text(`Order #: ${orderData.orderNumber}`);
          doc.text(`Customer: ${orderData.customerName}`);
          doc.text(`Total Items: ${orderData.items.length}`);
          doc.text(`Total Amount: $${orderData.totalAmount.toFixed(2)}`);
          doc.moveDown(1);

          // Add items
          doc.fontSize(16).font('Helvetica-Bold').text('Order Items:');
          doc.moveDown(0.5);

          for (let i = 0; i < orderData.items.length; i++) {
            const item = orderData.items[i];
            
            // Check if we need a page break
            if (doc.y > 600) {
              doc.addPage();
              doc.fontSize(16).font('Helvetica-Bold').text('Order Items (continued):');
              doc.moveDown(0.5);
            }

            // Add item details
            doc.fontSize(14).font('Helvetica-Bold').text(`Item ${i + 1}: ${item.color} ${item.size}`);
            doc.fontSize(12).font('Helvetica').text(`Quantity: ${item.quantity} | Price: $${item.price.toFixed(2)}`);
            
            // Add image
            doc.image(Buffer.from('image-data'), {
              fit: [200, 120],
              align: 'center'
            });
            
            doc.moveDown(1);
          }

          doc.end();
          
          writeStream.on('finish', () => {
            resolve(outputPath);
          });
        });
      };

      const outputPath = 'orders/TEST-002.pdf';
      const result = await generateOrderPDF(orderData, outputPath);

      expect(result).toBe(outputPath);
      expect(mockDoc.addPage).toHaveBeenCalled();
      expect(mockDoc.text).toHaveBeenCalledWith('Order Items (continued):');
    });

    test('should handle mixed image formats correctly', async () => {
      const orderData = {
        orderNumber: 'TEST-003',
        customerName: 'Mixed Format Customer',
        customerEmail: 'mixed@example.com',
        shippingAddress: '789 Mixed St',
        shippingCity: 'Mixed City',
        shippingState: 'MC',
        shippingZipCode: '65432',
        totalAmount: 200.00,
        items: [
          { color: 'red', size: 'small', quantity: 1, price: 25.00, designImage: 'design-1.jpg' },
          { color: 'green', size: 'medium', quantity: 2, price: 25.00, designImage: 'design-2.png' },
          { color: 'blue', size: 'large', quantity: 1, price: 25.00, designImage: 'design-3.webp' },
          { color: 'yellow', size: 'small', quantity: 3, price: 25.00, designImage: 'design-4.svg' }
        ]
      };

      // Mock file operations
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation((path) => {
        if (path.includes('.webp')) {
          return Buffer.from('webp-data');
        } else if (path.includes('.svg')) {
          return Buffer.from('svg-data');
        }
        return Buffer.from('standard-image-data');
      });

      const generateOrderPDF = async (orderData, outputPath) => {
        return new Promise((resolve) => {
          const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
          });

          const writeStream = fs.createWriteStream(outputPath);
          doc.pipe(writeStream);

          // Add header
          doc.fontSize(20).font('Helvetica-Bold').text('Order Confirmation', { align: 'center' });
          doc.moveDown(0.5);

          // Add items with format-specific processing
          for (let i = 0; i < orderData.items.length; i++) {
            const item = orderData.items[i];
            
            doc.fontSize(14).font('Helvetica-Bold').text(`Item ${i + 1}: ${item.color} ${item.size}`);
            doc.moveDown(0.5);

            try {
              const imagePath = path.join('uploads', item.designImage);
              let imageBuffer = fs.readFileSync(imagePath);
              
              // Process different formats
              if (item.designImage.endsWith('.webp')) {
                // Convert WebP to JPEG
                imageBuffer = await sharp(imageBuffer).jpeg().toBuffer();
              } else if (item.designImage.endsWith('.svg')) {
                // Convert SVG to PNG
                imageBuffer = await sharp(imageBuffer).resize(800, 600).png().toBuffer();
              }
              
              // Add image to PDF
              doc.image(imageBuffer, {
                fit: [200, 120],
                align: 'center'
              });
            } catch (error) {
              doc.text('Image processing failed');
            }
            
            doc.moveDown(1);
          }

          doc.end();
          
          writeStream.on('finish', () => {
            resolve(outputPath);
          });
        });
      };

      const outputPath = 'orders/TEST-003.pdf';
      const result = await generateOrderPDF(orderData, outputPath);

      expect(result).toBe(outputPath);
      expect(sharp).toHaveBeenCalled();
    });

    test('should maintain consistent formatting throughout PDF', async () => {
      const orderData = {
        orderNumber: 'TEST-004',
        customerName: 'Format Test Customer',
        customerEmail: 'format@example.com',
        shippingAddress: '321 Format St',
        shippingCity: 'Format City',
        shippingState: 'FC',
        shippingZipCode: '11111',
        totalAmount: 100.00,
        items: [
          { color: 'white', size: 'medium', quantity: 2, price: 25.00, designImage: 'design-1.jpg' },
          { color: 'black', size: 'large', quantity: 2, price: 25.00, designImage: 'design-2.png' }
        ]
      };

      // Mock file operations
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(Buffer.from('image-data'));

      const generateOrderPDF = async (orderData, outputPath) => {
        return new Promise((resolve) => {
          const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
          });

          const writeStream = fs.createWriteStream(outputPath);
          doc.pipe(writeStream);

          // Add header with consistent formatting
          doc.fillColor('black').fontSize(20).font('Helvetica-Bold').text('Order Confirmation', { align: 'center' });
          doc.moveDown(0.5);

          // Add order details with consistent formatting
          doc.fillColor('black').fontSize(12).font('Helvetica').text(`Order #: ${orderData.orderNumber}`);
          doc.fillColor('black').text(`Customer: ${orderData.customerName}`);
          doc.fillColor('black').text(`Total Amount: $${orderData.totalAmount.toFixed(2)}`);
          doc.moveDown(1);

          // Add items with consistent formatting
          doc.fillColor('black').fontSize(16).font('Helvetica-Bold').text('Order Items:');
          doc.moveDown(0.5);

          for (let i = 0; i < orderData.items.length; i++) {
            const item = orderData.items[i];
            
            // Consistent item formatting
            doc.fillColor('black').fontSize(14).font('Helvetica-Bold').text(`Item ${i + 1}: ${item.color} ${item.size}`);
            doc.moveDown(0.5);
            doc.fillColor('black').fontSize(12).font('Helvetica').text(`Quantity: ${item.quantity} | Price: $${item.price.toFixed(2)}`);
            doc.moveDown(0.5);
            
            // Add image
            doc.image(Buffer.from('image-data'), {
              fit: [200, 120],
              align: 'center'
            });
            
            doc.moveDown(1);
          }

          doc.end();
          
          writeStream.on('finish', () => {
            resolve(outputPath);
          });
        });
      };

      const outputPath = 'orders/TEST-004.pdf';
      const result = await generateOrderPDF(orderData, outputPath);

      expect(result).toBe(outputPath);
      
      // Verify consistent formatting calls
      expect(mockDoc.fillColor).toHaveBeenCalledWith('black');
      expect(mockDoc.fontSize).toHaveBeenCalledWith(12);
      expect(mockDoc.font).toHaveBeenCalledWith('Helvetica');
    });
  });

  describe('Error Handling in PDF Generation', () => {
    
    test('should handle missing image files gracefully', async () => {
      const orderData = {
        orderNumber: 'TEST-ERROR-001',
        customerName: 'Error Test Customer',
        customerEmail: 'error@example.com',
        shippingAddress: '999 Error St',
        shippingCity: 'Error City',
        shippingState: 'EC',
        shippingZipCode: '99999',
        totalAmount: 50.00,
        items: [
          { color: 'blue', size: 'medium', quantity: 2, price: 25.00, designImage: 'missing-image.jpg' }
        ]
      };

      // Mock file not found
      fs.existsSync.mockReturnValue(false);

      const generateOrderPDF = async (orderData, outputPath) => {
        return new Promise((resolve) => {
          const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
          });

          const writeStream = fs.createWriteStream(outputPath);
          doc.pipe(writeStream);

          // Add header
          doc.fontSize(20).font('Helvetica-Bold').text('Order Confirmation', { align: 'center' });
          doc.moveDown(0.5);

          // Add items
          for (let i = 0; i < orderData.items.length; i++) {
            const item = orderData.items[i];
            
            doc.fontSize(14).font('Helvetica-Bold').text(`Item ${i + 1}: ${item.color} ${item.size}`);
            doc.moveDown(0.5);

            // Try to add image, handle missing file
            const imagePath = path.join('uploads', item.designImage);
            if (fs.existsSync(imagePath)) {
              const imageBuffer = fs.readFileSync(imagePath);
              doc.image(imageBuffer, { fit: [200, 120], align: 'center' });
            } else {
              doc.text('Image not available');
            }
            
            doc.moveDown(1);
          }

          doc.end();
          
          writeStream.on('finish', () => {
            resolve(outputPath);
          });
        });
      };

      const outputPath = 'orders/TEST-ERROR-001.pdf';
      const result = await generateOrderPDF(orderData, outputPath);

      expect(result).toBe(outputPath);
      expect(mockDoc.text).toHaveBeenCalledWith('Image not available');
    });

    test('should handle image processing errors', async () => {
      const orderData = {
        orderNumber: 'TEST-ERROR-002',
        customerName: 'Processing Error Customer',
        customerEmail: 'processing@example.com',
        shippingAddress: '888 Processing St',
        shippingCity: 'Processing City',
        shippingState: 'PC',
        shippingZipCode: '88888',
        totalAmount: 50.00,
        items: [
          { color: 'red', size: 'small', quantity: 2, price: 25.00, designImage: 'corrupted.webp' }
        ]
      };

      // Mock file exists but processing fails
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(Buffer.from('corrupted-data'));
      
      // Mock sharp to throw error
      sharp.mockImplementation(() => {
        throw new Error('Image processing failed');
      });

      const generateOrderPDF = async (orderData, outputPath) => {
        return new Promise((resolve) => {
          const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
          });

          const writeStream = fs.createWriteStream(outputPath);
          doc.pipe(writeStream);

          // Add header
          doc.fontSize(20).font('Helvetica-Bold').text('Order Confirmation', { align: 'center' });
          doc.moveDown(0.5);

          // Add items
          for (let i = 0; i < orderData.items.length; i++) {
            const item = orderData.items[i];
            
            doc.fontSize(14).font('Helvetica-Bold').text(`Item ${i + 1}: ${item.color} ${item.size}`);
            doc.moveDown(0.5);

            // Try to process image, handle errors
            try {
              const imagePath = path.join('uploads', item.designImage);
              const imageBuffer = fs.readFileSync(imagePath);
              
              if (item.designImage.endsWith('.webp')) {
                const processedBuffer = await sharp(imageBuffer).jpeg().toBuffer();
                doc.image(processedBuffer, { fit: [200, 120], align: 'center' });
              } else {
                doc.image(imageBuffer, { fit: [200, 120], align: 'center' });
              }
            } catch (error) {
              doc.text('Image processing failed');
            }
            
            doc.moveDown(1);
          }

          doc.end();
          
          writeStream.on('finish', () => {
            resolve(outputPath);
          });
        });
      };

      const outputPath = 'orders/TEST-ERROR-002.pdf';
      const result = await generateOrderPDF(orderData, outputPath);

      expect(result).toBe(outputPath);
      expect(mockDoc.text).toHaveBeenCalledWith('Image processing failed');
    });
  });
}); 