/**
 * Integration tests for multi-item order creation
 * Tests various scenarios with different image types and order complexities
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Mock dependencies before importing server
jest.mock('multer');
jest.mock('sharp');

describe('Multi-Item Order Creation Integration Tests', () => {
  let app;
  let server;
  let testDb;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.PORT = 3002;
    
    // Mock sharp for image processing
    const sharp = require('sharp');
    sharp.mockImplementation(() => ({
      jpeg: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('mocked-jpeg-data')),
      resize: jest.fn().mockReturnThis(),
      toFile: jest.fn().mockResolvedValue({})
    }));

    // Mock multer for file uploads
    const multer = require('multer');
    multer.mockReturnValue({
      single: jest.fn().mockReturnValue((req, res, next) => {
        // Mock file upload middleware
        req.file = req.file || null;
        next();
      }),
      array: jest.fn().mockReturnValue((req, res, next) => {
        // Mock multiple file upload middleware
        req.files = req.files || [];
        next();
      })
    });

    // Import server after mocking
    const serverModule = require('../../../server');
    app = serverModule;
    
    // Start test server
    server = app.listen(3002);
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(async () => {
    // Reset database state before each test
    if (app.locals && app.locals.db) {
      await app.locals.db.run('DELETE FROM completion_photos');
      await app.locals.db.run('DELETE FROM order_items');
      await app.locals.db.run('DELETE FROM orders');
      await app.locals.db.run('DELETE FROM print_facilities');
    }
  });

  describe('POST /api/orders - Multi-Item Order Creation', () => {
    
    test('should create order with 2 items and different image types', async () => {
      const orderData = {
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        shippingAddress: '123 Test St',
        shippingCity: 'Test City',
        shippingState: 'TS',
        shippingZipCode: '12345',
        items: [
          {
            color: 'blue',
            size: 'medium',
            quantity: 2,
            price: 25.00,
            designImage: 'test-design-1.jpg'
          },
          {
            color: 'red',
            size: 'large',
            quantity: 1,
            price: 25.00,
            designImage: 'test-design-2.webp'
          }
        ]
      };

      // Mock file uploads
      const mockFiles = [
        {
          fieldname: 'designImage',
          originalname: 'test-design-1.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: Buffer.alloc(1024),
          size: 1024,
          filename: 'test-design-1.jpg'
        },
        {
          fieldname: 'designImage',
          originalname: 'test-design-2.webp',
          encoding: '7bit',
          mimetype: 'image/webp',
          buffer: Buffer.alloc(1024),
          size: 1024,
          filename: 'test-design-2.webp'
        }
      ];

      const response = await request(app)
        .post('/api/orders')
        .field('customerName', orderData.customerName)
        .field('customerEmail', orderData.customerEmail)
        .field('shippingAddress', orderData.shippingAddress)
        .field('shippingCity', orderData.shippingCity)
        .field('shippingState', orderData.shippingState)
        .field('shippingZipCode', orderData.shippingZipCode)
        .field('items', JSON.stringify(orderData.items))
        .attach('designImage', Buffer.alloc(1024), 'test-design-1.jpg')
        .attach('designImage', Buffer.alloc(1024), 'test-design-2.webp');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('orderId');
      expect(response.body).toHaveProperty('orderNumber');
      expect(response.body).toHaveProperty('totalAmount');
      expect(response.body.totalAmount).toBe(75.00); // 2 * 25 + 1 * 25

      // Verify order was created in database
      const order = await app.locals.db.get(
        'SELECT * FROM orders WHERE orderNumber = ?',
        [response.body.orderNumber]
      );
      expect(order).toBeTruthy();
      expect(order.customerName).toBe(orderData.customerName);
      expect(order.totalAmount).toBe(75.00);

      // Verify order items were created
      const orderItems = await app.locals.db.all(
        'SELECT * FROM order_items WHERE orderId = ?',
        [order.id]
      );
      expect(orderItems).toHaveLength(2);
      expect(orderItems[0].color).toBe('blue');
      expect(orderItems[0].size).toBe('medium');
      expect(orderItems[0].quantity).toBe(2);
      expect(orderItems[1].color).toBe('red');
      expect(orderItems[1].size).toBe('large');
      expect(orderItems[1].quantity).toBe(1);
    });

    test('should create order with 5 items and mixed image formats', async () => {
      const orderData = {
        customerName: 'Multi-Item Customer',
        customerEmail: 'multi@example.com',
        shippingAddress: '456 Multi St',
        shippingCity: 'Multi City',
        shippingState: 'MC',
        shippingZipCode: '54321',
        items: [
          { color: 'white', size: 'small', quantity: 1, price: 25.00, designImage: 'design-1.jpg' },
          { color: 'blue', size: 'medium', quantity: 3, price: 25.00, designImage: 'design-2.png' },
          { color: 'yellow', size: 'large', quantity: 2, price: 25.00, designImage: 'design-3.webp' },
          { color: 'red', size: 'small', quantity: 1, price: 25.00, designImage: 'design-4.svg' },
          { color: 'black', size: 'medium', quantity: 4, price: 25.00, designImage: 'design-5.jpeg' }
        ]
      };

      const response = await request(app)
        .post('/api/orders')
        .field('customerName', orderData.customerName)
        .field('customerEmail', orderData.customerEmail)
        .field('shippingAddress', orderData.shippingAddress)
        .field('shippingCity', orderData.shippingCity)
        .field('shippingState', orderData.shippingState)
        .field('shippingZipCode', orderData.shippingZipCode)
        .field('items', JSON.stringify(orderData.items))
        .attach('designImage', Buffer.alloc(1024), 'design-1.jpg')
        .attach('designImage', Buffer.alloc(1024), 'design-2.png')
        .attach('designImage', Buffer.alloc(1024), 'design-3.webp')
        .attach('designImage', Buffer.alloc(1024), 'design-4.svg')
        .attach('designImage', Buffer.alloc(1024), 'design-5.jpeg');

      expect(response.status).toBe(201);
      expect(response.body.totalAmount).toBe(275.00); // 11 items * 25.00

      // Verify all 5 items were created
      const order = await app.locals.db.get(
        'SELECT * FROM orders WHERE orderNumber = ?',
        [response.body.orderNumber]
      );
      const orderItems = await app.locals.db.all(
        'SELECT * FROM order_items WHERE orderId = ? ORDER BY id',
        [order.id]
      );
      
      expect(orderItems).toHaveLength(5);
      expect(orderItems[0].designImage).toBe('design-1.jpg');
      expect(orderItems[1].designImage).toBe('design-2.png');
      expect(orderItems[2].designImage).toBe('design-3.webp');
      expect(orderItems[3].designImage).toBe('design-4.svg');
      expect(orderItems[4].designImage).toBe('design-5.jpeg');
    });

    test('should handle same design with different colors and sizes', async () => {
      const orderData = {
        customerName: 'Same Design Customer',
        customerEmail: 'samedesign@example.com',
        shippingAddress: '789 Same St',
        shippingCity: 'Same City',
        shippingState: 'SC',
        shippingZipCode: '98765',
        items: [
          { color: 'white', size: 'small', quantity: 2, price: 25.00, designImage: 'same-design.jpg' },
          { color: 'white', size: 'medium', quantity: 3, price: 25.00, designImage: 'same-design.jpg' },
          { color: 'blue', size: 'small', quantity: 1, price: 25.00, designImage: 'same-design.jpg' },
          { color: 'blue', size: 'large', quantity: 2, price: 25.00, designImage: 'same-design.jpg' }
        ]
      };

      const response = await request(app)
        .post('/api/orders')
        .field('customerName', orderData.customerName)
        .field('customerEmail', orderData.customerEmail)
        .field('shippingAddress', orderData.shippingAddress)
        .field('shippingCity', orderData.shippingCity)
        .field('shippingState', orderData.shippingState)
        .field('shippingZipCode', orderData.shippingZipCode)
        .field('items', JSON.stringify(orderData.items))
        .attach('designImage', Buffer.alloc(1024), 'same-design.jpg');

      expect(response.status).toBe(201);
      expect(response.body.totalAmount).toBe(200.00); // 8 items * 25.00

      // Verify all items use the same design image
      const orderItems = await app.locals.db.all(
        'SELECT * FROM order_items WHERE orderId = ? ORDER BY id',
        [response.body.orderId]
      );
      
      expect(orderItems).toHaveLength(4);
      orderItems.forEach(item => {
        expect(item.designImage).toBe('same-design.jpg');
      });
    });

    test('should validate required fields for multi-item orders', async () => {
      // Test missing customer information
      const invalidOrderData = {
        items: [
          { color: 'blue', size: 'medium', quantity: 1, price: 25.00, designImage: 'test.jpg' }
        ]
      };

      const response = await request(app)
        .post('/api/orders')
        .field('items', JSON.stringify(invalidOrderData.items))
        .attach('designImage', Buffer.alloc(1024), 'test.jpg');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required');
    });

    test('should handle large quantities in multi-item orders', async () => {
      const orderData = {
        customerName: 'Bulk Order Customer',
        customerEmail: 'bulk@example.com',
        shippingAddress: '999 Bulk St',
        shippingCity: 'Bulk City',
        shippingState: 'BC',
        shippingZipCode: '11111',
        items: [
          { color: 'white', size: 'medium', quantity: 50, price: 25.00, designImage: 'bulk-design.jpg' },
          { color: 'blue', size: 'large', quantity: 25, price: 25.00, designImage: 'bulk-design.jpg' }
        ]
      };

      const response = await request(app)
        .post('/api/orders')
        .field('customerName', orderData.customerName)
        .field('customerEmail', orderData.customerEmail)
        .field('shippingAddress', orderData.shippingAddress)
        .field('shippingCity', orderData.shippingCity)
        .field('shippingState', orderData.shippingState)
        .field('shippingZipCode', orderData.shippingZipCode)
        .field('items', JSON.stringify(orderData.items))
        .attach('designImage', Buffer.alloc(1024), 'bulk-design.jpg');

      expect(response.status).toBe(201);
      expect(response.body.totalAmount).toBe(1875.00); // 75 items * 25.00

      // Verify quantities were stored correctly
      const orderItems = await app.locals.db.all(
        'SELECT * FROM order_items WHERE orderId = ? ORDER BY id',
        [response.body.orderId]
      );
      
      expect(orderItems).toHaveLength(2);
      expect(orderItems[0].quantity).toBe(50);
      expect(orderItems[1].quantity).toBe(25);
    });

    test('should handle mixed image formats in same order', async () => {
      const orderData = {
        customerName: 'Mixed Format Customer',
        customerEmail: 'mixed@example.com',
        shippingAddress: '321 Mixed St',
        shippingCity: 'Mixed City',
        shippingState: 'MC',
        shippingZipCode: '65432',
        items: [
          { color: 'red', size: 'small', quantity: 1, price: 25.00, designImage: 'design-1.jpg' },
          { color: 'green', size: 'medium', quantity: 2, price: 25.00, designImage: 'design-2.png' },
          { color: 'blue', size: 'large', quantity: 1, price: 25.00, designImage: 'design-3.webp' },
          { color: 'yellow', size: 'small', quantity: 3, price: 25.00, designImage: 'design-4.svg' }
        ]
      };

      const response = await request(app)
        .post('/api/orders')
        .field('customerName', orderData.customerName)
        .field('customerEmail', orderData.customerEmail)
        .field('shippingAddress', orderData.shippingAddress)
        .field('shippingCity', orderData.shippingCity)
        .field('shippingState', orderData.shippingState)
        .field('shippingZipCode', orderData.shippingZipCode)
        .field('items', JSON.stringify(orderData.items))
        .attach('designImage', Buffer.alloc(1024), 'design-1.jpg')
        .attach('designImage', Buffer.alloc(1024), 'design-2.png')
        .attach('designImage', Buffer.alloc(1024), 'design-3.webp')
        .attach('designImage', Buffer.alloc(1024), 'design-4.svg');

      expect(response.status).toBe(201);
      expect(response.body.totalAmount).toBe(175.00); // 7 items * 25.00

      // Verify all image formats were accepted
      const orderItems = await app.locals.db.all(
        'SELECT * FROM order_items WHERE orderId = ? ORDER BY id',
        [response.body.orderId]
      );
      
      expect(orderItems).toHaveLength(4);
      const imageFormats = orderItems.map(item => 
        path.extname(item.designImage).toLowerCase()
      );
      expect(imageFormats).toContain('.jpg');
      expect(imageFormats).toContain('.png');
      expect(imageFormats).toContain('.webp');
      expect(imageFormats).toContain('.svg');
    });
  });

  describe('Error Handling for Multi-Item Orders', () => {
    
    test('should reject order with no items', async () => {
      const orderData = {
        customerName: 'No Items Customer',
        customerEmail: 'noitems@example.com',
        shippingAddress: '123 No Items St',
        shippingCity: 'No Items City',
        shippingState: 'NI',
        shippingZipCode: '00000',
        items: []
      };

      const response = await request(app)
        .post('/api/orders')
        .field('customerName', orderData.customerName)
        .field('customerEmail', orderData.customerEmail)
        .field('shippingAddress', orderData.shippingAddress)
        .field('shippingCity', orderData.shippingCity)
        .field('shippingState', orderData.shippingState)
        .field('shippingZipCode', orderData.shippingZipCode)
        .field('items', JSON.stringify(orderData.items));

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('At least one item is required');
    });

    test('should reject order with invalid item data', async () => {
      const orderData = {
        customerName: 'Invalid Items Customer',
        customerEmail: 'invalid@example.com',
        shippingAddress: '123 Invalid St',
        shippingCity: 'Invalid City',
        shippingState: 'IC',
        shippingZipCode: '99999',
        items: [
          { color: 'blue', size: 'medium', quantity: 0, price: 25.00, designImage: 'test.jpg' }
        ]
      };

      const response = await request(app)
        .post('/api/orders')
        .field('customerName', orderData.customerName)
        .field('customerEmail', orderData.customerEmail)
        .field('shippingAddress', orderData.shippingAddress)
        .field('shippingCity', orderData.shippingCity)
        .field('shippingState', orderData.shippingState)
        .field('shippingZipCode', orderData.shippingZipCode)
        .field('items', JSON.stringify(orderData.items))
        .attach('designImage', Buffer.alloc(1024), 'test.jpg');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should handle missing image files gracefully', async () => {
      const orderData = {
        customerName: 'Missing Image Customer',
        customerEmail: 'missing@example.com',
        shippingAddress: '123 Missing St',
        shippingCity: 'Missing City',
        shippingState: 'MC',
        shippingZipCode: '88888',
        items: [
          { color: 'blue', size: 'medium', quantity: 1, price: 25.00, designImage: 'missing.jpg' }
        ]
      };

      const response = await request(app)
        .post('/api/orders')
        .field('customerName', orderData.customerName)
        .field('customerEmail', orderData.customerEmail)
        .field('shippingAddress', orderData.shippingAddress)
        .field('shippingCity', orderData.shippingCity)
        .field('shippingState', orderData.shippingState)
        .field('shippingZipCode', orderData.shippingZipCode)
        .field('items', JSON.stringify(orderData.items));
        // Note: No image attached

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
}); 