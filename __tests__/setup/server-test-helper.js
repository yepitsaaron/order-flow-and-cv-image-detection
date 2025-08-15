/**
 * Server test helper for testing Express app
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');

class ServerTestHelper {
  constructor() {
    this.app = null;
    this.server = null;
    this.originalDbPath = null;
  }

  /**
   * Initialize test server with mocked dependencies
   */
  async initializeTestServer() {
    // Mock the database path to use in-memory database
    this.originalDbPath = process.env.DB_PATH;
    process.env.DB_PATH = ':memory:';
    
    // Mock file system operations
    this.mockFileSystem();
    
    // Mock multer for file uploads
    this.mockMulter();
    
    // Import the server (this will use the mocked dependencies)
    const serverModule = require('../../server');
    
    // Get the Express app
    this.app = serverModule.app || serverModule;
    
    return this.app;
  }

  /**
   * Mock file system operations for testing
   */
  mockFileSystem() {
    // Mock fs.existsSync
    const originalExistsSync = fs.existsSync;
    fs.existsSync = jest.fn((path) => {
      if (path.includes('uploads') || path.includes('orders') || path.includes('completion-photos')) {
        return true; // Always return true for test directories
      }
      return originalExistsSync(path);
    });

    // Mock fs.mkdirSync
    const originalMkdirSync = fs.mkdirSync;
    fs.mkdirSync = jest.fn((path, options) => {
      // Silently create directories for tests
      return originalMkdirSync(path, options);
    });

    // Mock fs.writeFileSync
    const originalWriteFileSync = fs.writeFileSync;
    fs.writeFileSync = jest.fn((path, data, options) => {
      // Silently write files for tests
      return originalWriteFileSync(path, data, options);
    });
  }

  /**
   * Mock multer for file upload testing
   */
  mockMulter() {
    // Mock multer middleware
    jest.mock('multer', () => {
      return jest.fn().mockImplementation(() => {
        return {
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
        };
      });
    });
  }

  /**
   * Create test request with supertest
   */
  request() {
    if (!this.app) {
      throw new Error('Test server not initialized. Call initializeTestServer() first.');
    }
    return request(this.app);
  }

  /**
   * Mock file upload for testing
   */
  mockFileUpload(fieldName, fileName, fileType = 'image/jpeg', fileSize = 1024) {
    return {
      fieldname: fieldName,
      originalname: fileName,
      encoding: '7bit',
      mimetype: fileType,
      buffer: Buffer.alloc(fileSize),
      size: fileSize,
      filename: fileName
    };
  }

  /**
   * Mock multiple file uploads for testing
   */
  mockMultipleFileUploads(fieldName, fileNames, fileTypes = ['image/jpeg'], fileSizes = [1024]) {
    return fileNames.map((fileName, index) => ({
      fieldname: fieldName,
      originalname: fileName,
      encoding: '7bit',
      mimetype: fileTypes[index % fileTypes.length],
      buffer: Buffer.alloc(fileSizes[index % fileSizes.length]),
      size: fileSizes[index % fileSizes.length],
      filename: fileName
    }));
  }

  /**
   * Create test order data
   */
  createTestOrderData(itemCount = 1, imageTypes = ['jpg']) {
    const items = [];
    for (let i = 0; i < itemCount; i++) {
      items.push({
        color: ['white', 'blue', 'yellow', 'red', 'black'][i % 5],
        size: ['small', 'medium', 'large'][i % 3],
        quantity: Math.floor(Math.random() * 5) + 1,
        price: 25.00,
        designImage: `test-design-${i + 1}.${imageTypes[i % imageTypes.length]}`
      });
    }

    return {
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      shippingAddress: '123 Test St',
      shippingCity: 'Test City',
      shippingState: 'TS',
      shippingZipCode: '12345',
      items: items
    };
  }

  /**
   * Clean up test server
   */
  async cleanup() {
    // Restore original environment variables
    if (this.originalDbPath !== null) {
      process.env.DB_PATH = this.originalDbPath;
    }

    // Close server if running
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
    }

    // Clear mocks
    jest.clearAllMocks();
    jest.resetModules();
  }

  /**
   * Reset test environment
   */
  async reset() {
    // Reset any test state
    if (this.app && this.app.locals && this.app.locals.db) {
      // Reset database if available
      try {
        await this.app.locals.db.run('DELETE FROM completion_photos');
        await this.app.locals.db.run('DELETE FROM order_items');
        await this.app.locals.db.run('DELETE FROM orders');
        await this.app.locals.db.run('DELETE FROM print_facilities');
      } catch (error) {
        // Ignore errors during reset
      }
    }
  }
}

module.exports = ServerTestHelper; 