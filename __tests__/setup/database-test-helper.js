/**
 * Database test helper for in-memory SQLite testing
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseTestHelper {
  constructor() {
    this.db = null;
    this.dbPath = ':memory:'; // Use in-memory database for tests
  }

  /**
   * Initialize test database with schema
   */
  async initializeTestDatabase() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Enable foreign keys
        this.db.run('PRAGMA foreign_keys = ON', (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Create test schema
          this.createTestSchema()
            .then(resolve)
            .catch(reject);
        });
      });
    });
  }

  /**
   * Create test database schema
   */
  async createTestSchema() {
    const schemaQueries = [
      // Orders table
      `CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orderNumber TEXT UNIQUE NOT NULL,
        customerName TEXT NOT NULL,
        customerEmail TEXT NOT NULL,
        shippingAddress TEXT NOT NULL,
        shippingCity TEXT NOT NULL,
        shippingState TEXT NOT NULL,
        shippingZipCode TEXT NOT NULL,
        totalAmount REAL NOT NULL,
        status TEXT DEFAULT 'processing',
        printFacilityId INTEGER,
        assignedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Order items table
      `CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orderId INTEGER NOT NULL,
        color TEXT NOT NULL,
        size TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        designImage TEXT NOT NULL,
        completionStatus TEXT DEFAULT 'pending',
        completionPhoto TEXT,
        completedAt DATETIME,
        FOREIGN KEY (orderId) REFERENCES orders (id)
      )`,

      // Print facilities table
      `CREATE TABLE IF NOT EXISTS print_facilities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contactPerson TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        zipCode TEXT NOT NULL,
        isActive BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Completion photos table
      `CREATE TABLE IF NOT EXISTS completion_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orderItemId INTEGER,
        photoPath TEXT NOT NULL,
        uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        matchedOrderItemId INTEGER,
        confidenceScore REAL,
        status TEXT DEFAULT 'pending'
      )`
    ];

    for (const query of schemaQueries) {
      await this.runQuery(query);
    }
  }

  /**
   * Run a database query
   */
  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Get a single row from database
   */
  getRow(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Get multiple rows from database
   */
  getRows(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Seed test data
   */
  async seedTestData() {
    // Create test print facility
    const facilityResult = await this.runQuery(
      `INSERT INTO print_facilities (name, contactPerson, email, phone, address, city, state, zipCode) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Test Print Facility', 'Test Contact', 'test@facility.com', '555-1234', '123 Test St', 'Test City', 'TS', '12345']
    );

    // Create test order
    const orderResult = await this.runQuery(
      `INSERT INTO orders (orderNumber, customerName, customerEmail, shippingAddress, shippingCity, shippingState, shippingZipCode, totalAmount) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['TEST-001', 'Test Customer', 'test@example.com', '123 Test St', 'Test City', 'TS', '12345', 75.00]
    );

    // Create test order items
    await this.runQuery(
      `INSERT INTO order_items (orderId, color, size, quantity, price, designImage) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orderResult.lastID, 'blue', 'medium', 2, 25.00, 'test-design-1.jpg']
    );

    await this.runQuery(
      `INSERT INTO order_items (orderId, color, size, quantity, price, designImage) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orderResult.lastID, 'red', 'large', 1, 25.00, 'test-design-2.webp']
    );

    return {
      facilityId: facilityResult.lastID,
      orderId: orderResult.lastID
    };
  }

  /**
   * Clean up test database
   */
  async cleanup() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing test database:', err);
          }
          this.db = null;
          resolve();
        });
      });
    }
  }

  /**
   * Reset database to clean state
   */
  async reset() {
    if (this.db) {
      const tables = ['completion_photos', 'order_items', 'orders', 'print_facilities'];
      for (const table of tables) {
        await this.runQuery(`DELETE FROM ${table}`);
      }
    }
  }
}

module.exports = DatabaseTestHelper; 