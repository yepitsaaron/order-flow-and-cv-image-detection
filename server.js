const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

// ============================================================================
// STATUS ENUMS - Centralized status management for consistency
// ============================================================================

// Order statuses - main order lifecycle
const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing', 
  PRINTING: 'printing',
  ASSIGNED: 'assigned',
  COMPLETED: 'completed',
  SHIPPED: 'shipped',
  CANCELLED: 'cancelled'
};

// Order item completion statuses
const COMPLETION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed'
};

// Completion photo statuses
const PHOTO_STATUS = {
  PENDING: 'pending',
  MATCHED: 'matched',
  NEEDS_REVIEW: 'needs_review'
};

// Validation arrays for easy checking
const VALID_ORDER_STATUSES = Object.values(ORDER_STATUS);
const VALID_COMPLETION_STATUSES = Object.values(COMPLETION_STATUS);
const VALID_PHOTO_STATUSES = Object.values(PHOTO_STATUS);

// Helper function to validate status values
function validateStatus(status, validStatuses, statusType) {
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid ${statusType} status: ${status}. Valid values: ${validStatuses.join(', ')}`);
  }
  return status;
}

// ============================================================================
// END STATUS ENUMS
// ============================================================================

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('client/build'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Configure multer for completion photos (separate from design uploads)
const completionPhotoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'completion-photos/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-completion-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const completionPhotoUpload = multer({ 
  storage: completionPhotoStorage,
  fileFilter: function (req, file, cb) {
    // Accept all common image formats including WebP
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'image/bmp', 'image/tiff', 'image/svg+xml'
    ];
    
    // Also check file extension for cases where MIME type detection fails
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimeTypes.includes(file.mimetype) || 
        file.mimetype.startsWith('image/') || 
        allowedExtensions.includes(fileExtension) ||
        file.mimetype === 'application/octet-stream') { // Accept octet-stream as fallback
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed. Only image files are accepted.`), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for completion photos
  }
});

// Sharp helper functions for image processing
async function resizeImageWithSharp(imagePath, size) {
  try {
    // Use Sharp for consistent image processing across all functions
    const imageBuffer = await sharp(imagePath)
      .resize(size, size)
      .grayscale()
      .raw()
      .toBuffer();
    
    return imageBuffer;
  } catch (error) {
    console.error('Error in resizeImageWithSharp:', error);
    throw error;
  }
}

async function convertWebPToJPEG(imageBuffer) {
  try {
    // Use Sharp for WebP to JPEG conversion
    const jpegBuffer = await sharp(imageBuffer)
      .jpeg({ quality: 90 })
      .toBuffer();
    
    return jpegBuffer;
  } catch (error) {
    console.error('Error in convertWebPToJPEG:', error);
    // If conversion fails, return original buffer
    return imageBuffer;
  }
}

// Database setup
const db = new sqlite3.Database('orders.db');

db.serialize(() => {
  // Create orders table with new schema
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    orderNumber TEXT UNIQUE,
    customerName TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zipCode TEXT NOT NULL,
    country TEXT NOT NULL,
    totalAmount REAL NOT NULL,
    status TEXT DEFAULT '${ORDER_STATUS.PENDING}' CHECK (status IN ('${VALID_ORDER_STATUSES.join("', '")}')),
    printFacilityId TEXT,
    assignedAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

         db.run(`CREATE TABLE IF NOT EXISTS order_items (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         orderId TEXT NOT NULL,
         designImage TEXT NOT NULL,
         color TEXT NOT NULL,
         size TEXT NOT NULL,
         quantity INTEGER NOT NULL,
         price REAL NOT NULL,
         completionStatus TEXT DEFAULT '${COMPLETION_STATUS.PENDING}' CHECK (completionStatus IN ('${VALID_COMPLETION_STATUSES.join("', '")}')),
         completionPhoto TEXT,
         completedAt DATETIME,
         FOREIGN KEY (orderId) REFERENCES orders (id)
       )`);

       // Add completionStatus column if it doesn't exist (for existing databases)
       db.run(`ALTER TABLE order_items ADD COLUMN completionStatus TEXT DEFAULT 'pending'`, (err) => {
         if (err && !err.message.includes('duplicate column name')) {
           console.error('Error adding completionStatus column:', err);
         }
       });
       db.run(`ALTER TABLE order_items ADD COLUMN completionPhoto TEXT`, (err) => {
         if (err && !err.message.includes('duplicate column name')) {
           console.error('Error adding completionPhoto column:', err);
         }
       });
       db.run(`ALTER TABLE order_items ADD COLUMN completedAt DATETIME`, (err) => {
         if (err && !err.message.includes('duplicate column name')) {
           console.error('Error adding completedAt column:', err);
         }
       });

         db.run(`CREATE TABLE IF NOT EXISTS completion_photos (
         id TEXT PRIMARY KEY,
         orderItemId INTEGER,
         photoPath TEXT NOT NULL,
         uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
         matchedOrderItemId INTEGER,
         confidenceScore REAL,
         status TEXT DEFAULT '${PHOTO_STATUS.PENDING}' CHECK (status IN ('${VALID_PHOTO_STATUSES.join("', '")}')),
         FOREIGN KEY (orderItemId) REFERENCES order_items (id),
         FOREIGN KEY (matchedOrderItemId) REFERENCES order_items (id)
       )`);

       // Add columns if they don't exist (for existing databases)
       db.run(`ALTER TABLE completion_photos ADD COLUMN matchedOrderItemId INTEGER`, (err) => {
         if (err && !err.message.includes('duplicate column name')) {
           console.error('Error adding matchedOrderItemId column:', err);
         }
       });
       db.run(`ALTER TABLE completion_photos ADD COLUMN confidenceScore REAL`, (err) => {
         if (err && !err.message.includes('duplicate column name')) {
           console.error('Error adding confidenceScore column:', err);
         }
       });
       db.run(`ALTER TABLE completion_photos ADD COLUMN printFacilityId TEXT`, (err) => {
         if (err && !err.message.includes('duplicate column name')) {
           console.error('Error adding printFacilityId column:', err);
         }
       });

  db.run(`CREATE TABLE IF NOT EXISTS print_facilities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contactPerson TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zipCode TEXT NOT NULL,
    country TEXT NOT NULL,
    isActive BOOLEAN DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Get available colors and sizes
app.get('/api/options', (req, res) => {
  const options = {
    colors: ['white', 'blue', 'yellow', 'red', 'black'],
    sizes: ['small', 'medium', 'large'],
    basePrice: 25.00
  };
  res.json(options);
});

// Create order
app.post('/api/orders', upload.array('designImages', 10), (req, res) => {
  try {
    console.log('Received request body:', req.body);
    console.log('Received file:', req.file);
    
    const {
      customerName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      country
    } = req.body;

    // Parse items from the form data with their design images
    let items = [];
    
    console.log('Raw request body keys:', Object.keys(req.body));
    console.log('Uploaded files:', req.files);
    
    // Check if items is already an array (new format) or needs parsing (old format)
    if (req.body.items && Array.isArray(req.body.items)) {
      // New format: items is already an array
      console.log('Using new format - items array:', req.body.items);
      
      items = req.body.items.map((item, index) => {
        // Check if this item has an uploaded file
        let designImage = item.designImage;
        
        // If we have uploaded files, map them to the correct items
        if (req.files && req.files[index]) {
          designImage = req.files[index].filename;
        }
        
        return {
          designImage: designImage,
          color: item.color,
          size: item.size,
          quantity: parseInt(item.quantity),
          price: parseFloat(item.price)
        };
      });
    } else {
      // Old format: parse flattened form fields
      console.log('Using old format - parsing flattened fields');
      let index = 0;
      
      while (req.body['items[' + index + '][color]'] !== undefined) {
        console.log(`Processing item ${index}:`, {
          designImage: req.body['items[' + index + '][designImage]'],
          color: req.body['items[' + index + '][color]'],
          size: req.body['items[' + index + '][size]'],
          quantity: req.body['items[' + index + '][quantity]'],
          price: req.body['items[' + index + '][price]']
        });
        
        // Check if this item has an uploaded file or is referencing an existing image
        let designImage = req.body['items[' + index + '][designImage]'];
        
        // If it's a File object (new upload), use the uploaded file
        if (req.files && req.files[index]) {
          designImage = req.files[index].filename;
        }
        
        items.push({
          designImage: designImage,
          color: req.body['items[' + index + '][color]'],
          size: req.body['items[' + index + '][size]'],
          quantity: parseInt(req.body['items[' + index + '][quantity]']),
          price: parseFloat(req.body['items[' + index + '][price]'])
        });
        index++;
      }
    }
    
    console.log('Processed items:', items);

    if (items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    const orderId = uuidv4();
    const orderNumber = 'TSHIRT-' + Date.now().toString().slice(-8);
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Insert order with initial status "processing"
    db.run(
      `INSERT INTO orders (id, orderNumber, customerName, email, phone, address, city, state, zipCode, country, totalAmount, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processing')`,
      [orderId, orderNumber, customerName, email, phone, address, city, state, zipCode, country, totalAmount],
      function(err) {
        if (err) {
          console.error('Error inserting order:', err);
          return res.status(500).json({ error: 'Failed to create order' });
        }

        // Insert order items
        const stmt = db.prepare(`INSERT INTO order_items (orderId, designImage, color, size, quantity, price) VALUES (?, ?, ?, ?, ?, ?)`);
        
        items.forEach(item => {
          stmt.run([orderId, item.designImage, item.color, item.size, item.quantity, item.price]);
        });
        
        stmt.finalize((err) => {
          if (err) {
            console.error('Error inserting order items:', err);
            return res.status(500).json({ error: 'Failed to create order items' });
          }

          res.json({ 
            success: true, 
            orderId, 
            orderNumber,
            message: 'Order created successfully. PDF will be generated when assigned to a print facility.' 
          });
        });
      }
    );

  } catch (error) {
    console.error('Error creating order:', error);
    if (error.message === 'MulterError: Unexpected field') {
      res.status(400).json({ error: 'Invalid form data format. Please try again.' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Get order by ID
app.get('/api/orders/:orderId', (req, res) => {
  const { orderId } = req.params;
  
  db.get(`SELECT * FROM orders WHERE id = ?`, [orderId], (err, order) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    db.all(`SELECT * FROM order_items WHERE orderId = ?`, [orderId], (err, items) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({ order, items });
    });
  });
});

// Get all orders
app.get('/api/orders', (req, res) => {
  db.all(`SELECT o.*, pf.name as printFacilityName 
          FROM orders o 
          LEFT JOIN print_facilities pf ON o.printFacilityId = pf.id 
          ORDER BY o.createdAt DESC`, (err, orders) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // For each order, get all order items with their design images
    const ordersWithItems = orders.map(order => {
      return new Promise((resolve) => {
        db.all(`SELECT designImage, color, size, quantity, price FROM order_items WHERE orderId = ?`, [order.id], (err, items) => {
          if (err || !items || items.length === 0) {
            resolve({ ...order, orderItems: [], designImages: [] });
          } else {
            const designImages = items.map(item => item.designImage);
            resolve({ 
              ...order, 
              orderItems: items,
              designImages: designImages,
              // Keep the first design image for backward compatibility
              designImage: items[0]?.designImage || null
            });
          }
        });
      });
    });
    
    Promise.all(ordersWithItems).then(completedOrders => {
      res.json(completedOrders);
    });
  });
});

// Print Facility Management Endpoints

// Create new print facility
app.post('/api/print-facilities', (req, res) => {
  try {
    const {
      name,
      contactPerson,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      country
    } = req.body;

    const facilityId = uuidv4();

    db.run(
      `INSERT INTO print_facilities (id, name, contactPerson, email, phone, address, city, state, zipCode, country) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [facilityId, name, contactPerson, email, phone, address, city, state, zipCode, country],
      function(err) {
        if (err) {
          console.error('Error inserting print facility:', err);
          return res.status(500).json({ error: 'Failed to create print facility' });
        }

        res.json({ 
          success: true, 
          facilityId,
          message: 'Print facility created successfully' 
        });
      }
    );

  } catch (error) {
    console.error('Error creating print facility:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all print facilities
app.get('/api/print-facilities', (req, res) => {
  db.all(`SELECT * FROM print_facilities ORDER BY name`, (err, facilities) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(facilities);
  });
});



// Get print facility by ID - MOVED TO END to avoid intercepting specific routes

// Update print facility
app.put('/api/print-facilities/:facilityId', (req, res) => {
  try {
    const { facilityId } = req.params;
    const {
      name,
      contactPerson,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      country,
      isActive
    } = req.body;

    db.run(
      `UPDATE print_facilities 
       SET name = ?, contactPerson = ?, email = ?, phone = ?, address = ?, city = ?, state = ?, zipCode = ?, country = ?, isActive = ?
       WHERE id = ?`,
      [name, contactPerson, email, phone, address, city, state, zipCode, country, isActive ? 1 : 0, facilityId],
      function(err) {
        if (err) {
          console.error('Error updating print facility:', err);
          return res.status(500).json({ error: 'Failed to update print facility' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Print facility not found' });
        }

        res.json({ 
          success: true,
          message: 'Print facility updated successfully' 
        });
      }
    );

  } catch (error) {
    console.error('Error updating print facility:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete print facility
app.delete('/api/print-facilities/:facilityId', (req, res) => {
  try {
    const { facilityId } = req.params;

    // Check if facility has assigned orders
    db.get(`SELECT COUNT(*) as count FROM orders WHERE printFacilityId = ?`, [facilityId], (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (result.count > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete print facility with assigned orders. Please reassign orders first.' 
        });
      }

      db.run(`DELETE FROM print_facilities WHERE id = ?`, [facilityId], function(err) {
        if (err) {
          console.error('Error deleting print facility:', err);
          return res.status(500).json({ error: 'Failed to delete print facility' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Print facility not found' });
        }

        res.json({ 
          success: true,
          message: 'Print facility deleted successfully' 
        });
      });
    });

  } catch (error) {
    console.error('Error deleting print facility:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get orders assigned to a specific print facility
app.get('/api/print-facilities/:facilityId/orders', (req, res) => {
  try {
    const { facilityId } = req.params;
    
    const query = `
      SELECT o.*, 
             COUNT(oi.id) as totalItems,
             COUNT(CASE WHEN oi.completionStatus = ? THEN 1 END) as completedItems,
             COUNT(CASE WHEN oi.completionStatus = ? THEN 1 END) as pendingItems
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.orderId
      WHERE o.printFacilityId = ? AND o.status IN (?, ?)
      GROUP BY o.id
      ORDER BY o.assignedAt DESC
    `;

    db.all(query, [facilityId, ORDER_STATUS.PRINTING, ORDER_STATUS.ASSIGNED, COMPLETION_STATUS.COMPLETED, COMPLETION_STATUS.PENDING], (err, orders) => {
      if (err) {
        console.error('Error fetching orders for facility:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(orders);
    });

  } catch (error) {
    console.error('Error fetching orders for facility:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get order items assigned to a specific print facility
app.get('/api/print-facilities/:facilityId/order-items', (req, res) => {
  try {
    const { facilityId } = req.params;
    
    const query = `
      SELECT oi.*, o.orderNumber, o.customerName, o.status as orderStatus
      FROM order_items oi
      JOIN orders o ON oi.orderId = o.id
      WHERE o.printFacilityId = ? AND o.status IN (?, ?)
      ORDER BY o.assignedAt DESC, oi.id
    `;

    db.all(query, [facilityId, ORDER_STATUS.PRINTING, ORDER_STATUS.ASSIGNED], (err, orderItems) => {
      if (err) {
        console.error('Error fetching order items for facility:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json(orderItems);
    });

  } catch (error) {
    console.error('Error fetching order items for facility:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign order to print facility
app.post('/api/orders/:orderId/assign-facility', (req, res) => {
  try {
    const { orderId } = req.params;
    const { printFacilityId } = req.body;

    if (!printFacilityId) {
      return res.status(400).json({ error: 'Print facility ID is required' });
    }

    // Verify print facility exists
    db.get(`SELECT id FROM print_facilities WHERE id = ? AND isActive = 1`, [printFacilityId], (err, facility) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!facility) {
        return res.status(404).json({ error: 'Print facility not found or inactive' });
      }

      // Update order with facility assignment and change status to "printing"
      db.run(
        `UPDATE orders SET printFacilityId = ?, assignedAt = CURRENT_TIMESTAMP, status = ? WHERE id = ?`,
                  [printFacilityId, ORDER_STATUS.PRINTING, orderId],
        function(err) {
          if (err) {
            console.error('Error assigning facility to order:', err);
            return res.status(500).json({ error: 'Failed to assign facility to order' });
          }

          if (this.changes === 0) {
            return res.status(404).json({ error: 'Order not found' });
          }

          // Get order details and items for PDF generation
          db.get(`SELECT orderNumber, customerName, email, phone, address, city, state, zipCode, country FROM orders WHERE id = ?`, [orderId], (err, order) => {
            if (err) {
              console.error('Error getting order details for PDF:', err);
              return res.json({ 
                success: true,
                message: 'Order assigned to print facility successfully, but PDF generation failed' 
              });
            }

            // Get order items
            db.all(`SELECT designImage, color, size, quantity, price FROM order_items WHERE orderId = ?`, [orderId], (err, items) => {
              if (err || !items || items.length === 0) {
                console.error('Error getting order items for PDF:', err);
                return res.json({ 
                  success: true,
                  message: 'Order assigned to print facility successfully, but PDF generation failed' 
                });
              }

              // Generate PDF now that facility is assigned
              generateOrderPDF(orderId, order.orderNumber, {
                customerName: order.customerName,
                email: order.email,
                phone: order.phone,
                address: order.address,
                city: order.city,
                state: order.state,
                zipCode: order.zipCode,
                country: order.country
              }, items).then(() => {
                res.json({ 
                  success: true,
                  message: 'Order assigned to print facility successfully and PDF generated' 
                });
              }).catch((pdfError) => {
                console.error('Error generating PDF:', pdfError);
                res.json({ 
                  success: true,
                  message: 'Order assigned to print facility successfully, but PDF generation failed' 
                });
              });
            });
          });
        }
      );
    });

  } catch (error) {
    console.error('Error assigning facility to order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Regenerate PDF for an order
app.post('/api/orders/:orderId/regenerate-pdf', (req, res) => {
  try {
    const { orderId } = req.params;

    // Check if order exists and has a facility assigned
    db.get(`SELECT o.*, pf.name as facilityName FROM orders o 
            LEFT JOIN print_facilities pf ON o.printFacilityId = pf.id 
            WHERE o.id = ?`, [orderId], (err, order) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      if (!order.printFacilityId) {
        return res.status(400).json({ error: 'Order must be assigned to a print facility to regenerate PDF' });
      }

      // Get order items
      db.all(`SELECT designImage, color, size, quantity, price FROM order_items WHERE orderId = ?`, [orderId], (err, items) => {
        if (err || !items || items.length === 0) {
          return res.status(400).json({ error: 'No items found for this order' });
        }

        // Generate new PDF
        generateOrderPDF(orderId, order.orderNumber, {
          customerName: order.customerName,
          email: order.email,
          phone: order.phone,
          address: order.address,
          city: order.city,
          state: order.state,
          zipCode: order.zipCode,
          country: order.country
        }, items).then(() => {
          res.json({ 
            success: true,
            message: `PDF regenerated successfully for order ${order.orderNumber}` 
          });
        }).catch((pdfError) => {
          console.error('Error regenerating PDF:', pdfError);
          res.status(500).json({ error: 'Failed to regenerate PDF' });
        });
      });
    });

  } catch (error) {
    console.error('Error regenerating PDF:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order status
app.put('/api/orders/:orderId/status', (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = VALID_ORDER_STATUSES;
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
    }

    db.run(
      `UPDATE orders SET status = ? WHERE id = ?`,
      [status, orderId],
      function(err) {
        if (err) {
          console.error('Error updating order status:', err);
          return res.status(500).json({ error: 'Failed to update order status' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Order not found' });
        }

        res.json({ 
          success: true,
          message: `Order status updated to ${status} successfully` 
        });
      }
    );

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unassign order from print facility
app.post('/api/orders/:orderId/unassign-facility', (req, res) => {
  try {
    const { orderId } = req.params;

    db.run(
      `UPDATE orders SET printFacilityId = NULL, assignedAt = NULL, status = ? WHERE id = ?`,
              [ORDER_STATUS.PROCESSING, orderId],
      function(err) {
        if (err) {
          console.error('Error unassigning facility from order:', err);
          return res.status(500).json({ error: 'Failed to unassign facility from order' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Order not found' });
        }

        // Get order number to remove PDF file
        db.get(`SELECT orderNumber FROM orders WHERE id = ?`, [orderId], (err, order) => {
          if (err || !order) {
            console.error('Error getting order number for PDF removal:', err);
            return res.json({ 
              success: true,
              message: 'Order unassigned from print facility successfully' 
            });
          }

          // Remove PDF file if it exists
          const pdfPath = `orders/${order.orderNumber}.pdf`;
          if (fs.existsSync(pdfPath)) {
            try {
              fs.unlinkSync(pdfPath);
              console.log(`PDF removed for unassigned order: ${order.orderNumber}`);
            } catch (unlinkError) {
              console.error('Error removing PDF file:', unlinkError);
            }
          }

          res.json({ 
            success: true,
            message: 'Order unassigned from print facility successfully and PDF removed' 
          });
        });
      }
    );

  } catch (error) {
    console.error('Error unassigning facility from order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Find the best image match among all pending order items
async function findBestImageMatch(completionPhotoPath, orderItems) {
  try {
    console.log(`Finding best image match for completion photo: ${completionPhotoPath}`);
    
    // Load completion photo
    const completionPhotoBuffer = fs.readFileSync(path.join(__dirname, 'completion-photos', completionPhotoPath));
    
    // Convert completion photo to comparison format using Sharp
    const comparisonSize = 100; // Small size for faster processing
    
    const completionPhotoResized = await resizeImageWithSharp(completionPhotoBuffer, comparisonSize);
    
    let bestMatch = null;
    let bestSimilarity = 0;
    
    // Compare with each order item's design image
    for (const orderItem of orderItems) {
      try {
        const designImageBuffer = fs.readFileSync(path.join(__dirname, 'uploads', orderItem.designImage));
        
        const designImageResized = await resizeImageWithSharp(designImageBuffer, comparisonSize);
        
        // Calculate similarity score using Sharp-based processing
        const similarity = await calculateImageSimilarity(completionPhotoResized, designImageResized);
        
        console.log(`Order #${orderItem.orderNumber} - ${orderItem.color} ${orderItem.size}: ${(similarity * 100).toFixed(1)}%`);
        
        // Update best match if this score is higher
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = {
            orderItemId: orderItem.orderItemId,
            orderNumber: orderItem.orderNumber,
            color: orderItem.color,
            size: orderItem.size,
            quantity: orderItem.quantity,
            confidence: similarity
          };
        }
      } catch (error) {
        console.error(`Error processing design image ${orderItem.designImage}:`, error);
        continue; // Skip this item and continue with others
      }
    }
    
    console.log(`Best match found: ${bestMatch ? `Order #${bestMatch.orderNumber} (${(bestMatch.confidence * 100).toFixed(1)}%)` : 'None'}`);
    
    // Return best match only if confidence is above threshold
    // Increased threshold to prevent false matches on new orders
    return bestMatch && bestMatch.confidence > 0.8 ? bestMatch : null;
    
  } catch (error) {
    console.error('Error in findBestImageMatch:', error);
    throw error;
  }
}

// Image recognition function for matching completion photos to design images (legacy - kept for compatibility)
async function performImageRecognition(completionPhotoPath, designImagePath, orderItemId, photoId) {
  try {
    console.log(`Performing image recognition for completion photo: ${completionPhotoPath}`);
    
    // Load both images
    const completionPhotoBuffer = fs.readFileSync(path.join(__dirname, 'completion-photos', completionPhotoPath));
    const designImageBuffer = fs.readFileSync(path.join(__dirname, 'uploads', designImagePath));
    
    // Convert both images to the same format and size for comparison
    const comparisonSize = 100; // Small size for faster processing
    
    const completionPhotoResized = await resizeImageWithSharp(completionPhotoBuffer, comparisonSize);
    const designImageResized = await resizeImageWithSharp(designImageBuffer, comparisonSize);
    
    // Calculate basic image similarity (pixel-by-pixel comparison)
    const similarity = calculateImageSimilarity(completionPhotoResized, designImageResized);
    
    console.log(`Image similarity score: ${similarity}`);
    
    // Update completion photo with recognition results
    const confidenceScore = similarity;
    const matchedOrderItemId = similarity > 0.8 ? orderItemId : null; // 80% threshold for consistency
    const status = similarity > 0.8 ? PHOTO_STATUS.MATCHED : PHOTO_STATUS.NEEDS_REVIEW;
    
    db.run(`UPDATE completion_photos SET matchedOrderItemId = ?, confidenceScore = ?, status = ? WHERE id = ?`, 
      [matchedOrderItemId, confidenceScore, status, photoId], (err) => {
      if (err) {
        console.error('Error updating completion photo recognition results:', err);
      } else {
        console.log(`Image recognition completed for photo ${photoId}: ${status} (confidence: ${confidenceScore})`);
      }
    });
    
  } catch (error) {
    console.error('Error in image recognition:', error);
    
    // Mark as needs review if recognition fails
    db.run(`UPDATE completion_photos SET status = ? WHERE id = ?`, [PHOTO_STATUS.NEEDS_REVIEW, photoId], (err) => {
      if (err) {
        console.error('Error updating completion photo status after recognition failure:', err);
      }
    });
  }
}

// Calculate image similarity using Sharp-based processing
async function calculateImageSimilarity(image1Buffer, image2Buffer) {
  try {
    // Ensure we have valid buffers
    if (!image1Buffer || !image2Buffer) {
      console.warn('Invalid image buffers, falling back to pixel comparison');
      return calculateImageSimilarityFallback(image1Buffer, image2Buffer);
    }
    
    // For Sharp buffers, we expect raw pixel data
    // The buffers should already be processed (resized, grayscale, raw)
    const totalPixels = image1Buffer.length;
    
    if (image1Buffer.length !== image2Buffer.length) {
      console.warn('Image buffer size mismatch, falling back to pixel comparison');
      return calculateImageSimilarityFallback(image1Buffer, image2Buffer);
    }
    
    // Calculate pixel similarity using the processed buffers
    let similarPixels = 0;
    let totalDifference = 0;
    
    for (let i = 0; i < totalPixels; i++) {
      const diff = Math.abs(image1Buffer[i] - image2Buffer[i]);
      totalDifference += diff;
      
      // Consider pixels similar if difference is small (within 30 grayscale levels)
      if (diff < 30) {
        similarPixels++;
      }
    }
    
    // Calculate similarity score based on pixel similarity and average difference
    const pixelSimilarity = similarPixels / totalPixels;
    const averageDifference = totalDifference / totalPixels;
    const differenceSimilarity = Math.max(0, 1 - (averageDifference / 255));
    
    // Combine both metrics for final score
    const similarityScore = (pixelSimilarity * 0.7) + (differenceSimilarity * 0.3);
    
    console.log(`Sharp-based similarity calculation - Pixel similarity: ${(pixelSimilarity * 100).toFixed(2)}%, Average difference: ${averageDifference.toFixed(2)}`);
    
    return Math.min(similarityScore, 1.0); // Normalize to 0-1 range
    
  } catch (error) {
    console.error('Error in Sharp image similarity calculation:', error);
    console.log('Falling back to pixel comparison');
    return calculateImageSimilarityFallback(image1Buffer, image2Buffer);
  }
}

// Fallback pixel comparison function (original implementation)
function calculateImageSimilarityFallback(image1Buffer, image2Buffer) {
  try {
    const pixels1 = new Uint8Array(image1Buffer);
    const pixels2 = new Uint8Array(image2Buffer);
    
    if (pixels1.length !== pixels2.length) {
      return 0;
    }
    
    let matchingPixels = 0;
    const totalPixels = pixels1.length;
    
    for (let i = 0; i < totalPixels; i++) {
      // Allow for some tolerance in pixel values
      if (Math.abs(pixels1[i] - pixels2[i]) < 10) {
        matchingPixels++;
      }
    }
    
    return matchingPixels / totalPixels;
    
  } catch (error) {
    console.error('Error in fallback image similarity calculation:', error);
    return 0;
  }
}

// Generate PDF function
async function generateOrderPDF(orderId, orderNumber, customerInfo, items) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50
    }
  });
  
  const pdfPath = `orders/${orderNumber}.pdf`;
  
  // Create orders directory if it doesn't exist
  if (!fs.existsSync('orders')) {
    fs.mkdirSync('orders', { recursive: true });
  }
  
  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);

  // Set default font and color
  doc.font('Helvetica');
  doc.fillColor('black');

  // Header
  doc.fillColor('black').fontSize(24).text('Custom T-Shirt Order', { align: 'center' });
  doc.moveDown(0.5);
  
  doc.fillColor('black').fontSize(16).text(`Order Number: ${orderNumber}`);
  doc.fillColor('black').fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`);
  doc.moveDown(1);

  // Customer Information
  doc.fillColor('black').fontSize(14).text('Customer Information:', { underline: true });
  doc.moveDown(0.5);
  doc.fillColor('black').fontSize(12).text(`Name: ${customerInfo.customerName}`);
  doc.fillColor('black').fontSize(12).text(`Email: ${customerInfo.email}`);
  if (customerInfo.phone) doc.fillColor('black').fontSize(12).text(`Phone: ${customerInfo.phone}`);
  doc.fillColor('black').fontSize(12).text(`Address: ${customerInfo.address}`);
  doc.fillColor('black').fontSize(12).text(`${customerInfo.city}, ${customerInfo.state} ${customerInfo.zipCode}`);
  doc.fillColor('black').fontSize(12).text(`Country: ${customerInfo.country}`);
  doc.moveDown(1);

  // Order Details Header
  doc.fillColor('black').fontSize(14).text('Order Details:', { underline: true });
  doc.moveDown(0.5);
  
  // List all items with their own design images
  let total = 0;
  
  // Use for...of loop for async operations
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    
    // Check if we need a page break before adding this item
    if (doc.y > 600) {
      doc.addPage();
    }
    
    // Item header
    doc.fillColor('black').fontSize(12).text(`Item ${index + 1}:`, { underline: true });
    doc.moveDown(0.5);
    
    // Design image section
    doc.fillColor('black').fontSize(10).text(`Design Image:`, { underline: true });
    doc.moveDown(0.5);
    
    try {
      const imagePath = path.join(__dirname, 'uploads', item.designImage);
      if (fs.existsSync(imagePath)) {
        let imageBuffer = fs.readFileSync(imagePath);
        
        // Check if it's a WebP image and convert to JPEG if needed
        if (item.designImage.toLowerCase().endsWith('.webp')) {
          try {
            console.log(`Converting WebP image: ${item.designImage}`);
            imageBuffer = await convertWebPToJPEG(imageBuffer);
            console.log(`Successfully converted WebP to JPEG: ${item.designImage}`);
          } catch (conversionError) {
            console.error('Error converting WebP image:', conversionError);
            doc.fillColor('black').fontSize(10).text(`Error converting image: ${item.designImage}`);
            doc.moveDown(0.5);
            // Skip image display for this item but continue with other details
          }
        }
        
        // Calculate image dimensions to fit within PDF margins
        const maxWidth = 200;
        const maxHeight = 120;
        
        // Add image with proper scaling and positioning
        doc.image(imageBuffer, {
          fit: [maxWidth, maxHeight],
          align: 'center'
        });
        
        doc.moveDown(0.5);
        doc.fillColor('black').fontSize(10).text(`Design: ${item.designImage}`, { align: 'center' });
        doc.moveDown(0.5);
      } else {
        doc.fillColor('black').fontSize(10).text(`Image file not found: ${item.designImage}`);
        doc.moveDown(0.5);
      }
    } catch (error) {
      console.error('Error adding image to PDF:', error);
      doc.fillColor('black').fontSize(10).text(`Error loading image: ${item.designImage}`);
      doc.moveDown(0.5);
    }
    
    // Item details - ensure consistent formatting
    doc.fillColor('black').fontSize(12).text(`Color: ${item.color.charAt(0).toUpperCase() + item.color.slice(1)}`);
    doc.fillColor('black').fontSize(12).text(`Size: ${item.size.charAt(0).toUpperCase() + item.size.slice(1)}`);
    doc.fillColor('black').fontSize(12).text(`Quantity: ${item.quantity}`);
    doc.fillColor('black').fontSize(12).text(`Price: $${item.price.toFixed(2)} each`);
    doc.fillColor('black').fontSize(12).text(`Subtotal: $${itemTotal.toFixed(2)}`);
    
    doc.moveDown(0.5);
    
    // Add separator between items (but not after the last item)
    if (index < items.length - 1) {
      doc.rect(50, doc.y, 500, 1).fill('#e0e0e0');
      doc.moveDown(1);
    }
  }

  // Total amount
  doc.moveDown(0.5);
  doc.fillColor('black').fontSize(14).text(`Total Amount: $${total.toFixed(2)}`, { align: 'right' });
  doc.moveDown(1);
  
  // Print facility information
  doc.fillColor('black').fontSize(14).text('Print Facility Assignment:', { underline: true });
  doc.moveDown(0.5);
  
  // Get print facility info for this order
  db.get(`SELECT pf.name, pf.contactPerson, pf.email, pf.phone, pf.address, pf.city, pf.state, pf.zipCode, pf.country, o.assignedAt
          FROM orders o 
          LEFT JOIN print_facilities pf ON o.printFacilityId = pf.id 
          WHERE o.id = ?`, [orderId], (err, facilityInfo) => {
    if (err) {
      console.error('Error getting facility info for PDF:', err);
      doc.fillColor('black').fontSize(12).text('Print facility information not available');
    } else if (facilityInfo.name) {
      doc.fillColor('black').fontSize(12).text(`Facility: ${facilityInfo.name}`);
      doc.fillColor('black').fontSize(12).text(`Contact: ${facilityInfo.contactPerson}`);
      doc.fillColor('black').fontSize(12).text(`Email: ${facilityInfo.email}`);
      if (facilityInfo.phone) doc.fillColor('black').fontSize(12).text(`Phone: ${facilityInfo.phone}`);
      doc.fillColor('black').fontSize(12).text(`Address: ${facilityInfo.address}`);
      doc.fillColor('black').fontSize(12).text(`${facilityInfo.city}, ${facilityInfo.state} ${facilityInfo.zipCode}`);
      doc.fillColor('black').fontSize(12).text(`Country: ${facilityInfo.country}`);
      if (facilityInfo.assignedAt) {
        doc.fillColor('black').fontSize(12).text(`Assigned: ${new Date(facilityInfo.assignedAt).toLocaleDateString()}`);
      }
    } else {
      doc.fillColor('black').fontSize(12).text('No print facility assigned yet');
    }
    
    doc.moveDown(0.5);
    doc.fillColor('black').fontSize(12).text('Note: This order will be processed by our printing partner. You will receive updates on the status of your order.');

    doc.end();
    
    writeStream.on('finish', () => {
      console.log(`PDF generated for order ${orderNumber}: ${pdfPath}`);
    });
  });
}

// Serve uploaded images
app.use('/uploads', express.static('uploads'));

// Serve generated PDFs
app.use('/orders', express.static('orders'));

// Upload completion photo and attempt automatic image recognition matching - MOVED TO END to avoid intercepting specific routes

// Get completion photos for a print facility
app.get('/api/print-facilities/:facilityId/completion-photos', (req, res) => {
  try {
    const { facilityId } = req.params;

    // Get all completion photos for orders assigned to this facility
    // Only show completion photos that are either:
    // 1. Already matched to orders assigned to this facility, OR
    // 2. Pending photos that were uploaded to this facility
    const query = `
      SELECT cp.id, cp.photoPath, cp.uploadedAt, cp.status, cp.confidenceScore,
             cp.orderItemId, cp.matchedOrderItemId, cp.printFacilityId,
             COALESCE(oi.designImage, '') as designImage,
             COALESCE(oi.color, '') as color,
             COALESCE(oi.size, '') as size,
             COALESCE(oi.quantity, 0) as quantity,
             COALESCE(oi.completionStatus, ?) as completionStatus,
             COALESCE(o.orderNumber, '') as orderNumber,
             COALESCE(o.customerName, '') as customerName,
             COALESCE(oi.orderId, '') as orderId
      FROM completion_photos cp
      LEFT JOIN order_items oi ON cp.orderItemId = oi.id
      LEFT JOIN orders o ON oi.orderId = o.id
      WHERE (
        -- Photos that are already matched to orders assigned to this facility
        (o.printFacilityId = ? AND cp.orderItemId IS NOT NULL)
        OR
        -- Pending photos that were uploaded to this facility
        (cp.status IN (?, ?) AND cp.printFacilityId = ?)
      )
      ORDER BY cp.uploadedAt DESC
    `;

    db.all(query, [facilityId, PHOTO_STATUS.PENDING, PHOTO_STATUS.NEEDS_REVIEW, facilityId, COMPLETION_STATUS.PENDING], (err, photos) => {
      if (err) {
        console.error('Error fetching completion photos:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(photos);
    });

  } catch (error) {
    console.error('Error fetching completion photos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manually assign completion photo to a specific order item
app.post('/api/completion-photos/:photoId/assign-order', (req, res) => {
  try {
    const { photoId } = req.params;
    const { orderItemId } = req.body;

    if (!orderItemId) {
      return res.status(400).json({ error: 'Order item ID is required' });
    }

    // Get the order item details
    db.get(`SELECT oi.*, o.orderNumber, o.customerName, o.printFacilityId FROM order_items oi JOIN orders o ON oi.orderId = o.id WHERE oi.id = ?`, 
      [orderItemId], (err, orderItem) => {
      if (err) {
        console.error('Error fetching order item:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (!orderItem) {
        return res.status(404).json({ error: 'Order item not found' });
      }

      // Update completion photo with the assigned order item
      db.run(`UPDATE completion_photos SET orderItemId = ?, matchedOrderItemId = ?, status = ?, confidenceScore = 1.0 WHERE id = ?`, 
                  [orderItemId, orderItemId, PHOTO_STATUS.MATCHED, photoId], function(err) {
        if (err) {
          console.error('Error updating completion photo:', err);
          return res.status(500).json({ error: 'Failed to assign order' });
        }

        res.json({ 
          success: true,
          message: `Completion photo assigned to Order #${orderItem.orderNumber} - ${orderItem.color} ${orderItem.size}`,
                      assignedOrder: {
              orderNumber: orderItem.orderNumber,
              color: orderItem.color,
              size: orderItem.size,
              quantity: orderItem.quantity
            }
        });
      });
    });

  } catch (error) {
    console.error('Error assigning completion photo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available order items for manual photo assignment
app.get('/api/print-facilities/:facilityId/available-order-items', (req, res) => {
  try {
    const { facilityId } = req.params;
    
    // Get order items that don't have completion photos yet
    const query = `
      SELECT oi.id, oi.color, oi.size, oi.quantity, oi.designImage,
             o.orderNumber, o.customerName
      FROM order_items oi
      JOIN orders o ON oi.orderId = o.id
              LEFT JOIN completion_photos cp ON oi.id = cp.orderItemId AND cp.status = ?
      WHERE o.printFacilityId = ? AND o.status IN (?, ?)
        AND oi.completionStatus = ? AND cp.id IS NULL
      ORDER BY o.assignedAt DESC, oi.id
    `;

    db.all(query, [PHOTO_STATUS.MATCHED, facilityId, ORDER_STATUS.PRINTING, ORDER_STATUS.ASSIGNED, COMPLETION_STATUS.PENDING], (err, orderItems) => {
      if (err) {
        console.error('Error fetching available order items:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(orderItems);
    });

  } catch (error) {
    console.error('Error fetching available order items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark order item as completed
app.post('/api/order-items/:itemId/complete', (req, res) => {
  try {
    const { itemId } = req.params;
    const { completionPhotoId } = req.body;

    if (!completionPhotoId) {
      return res.status(400).json({ error: 'Completion photo ID is required' });
    }

    // Update order item completion status
    db.run(`UPDATE order_items SET completionStatus = ?, completedAt = CURRENT_TIMESTAMP WHERE id = ?`, 
      [COMPLETION_STATUS.COMPLETED, itemId], function(err) {
      if (err) {
        console.error('Error updating order item completion:', err);
        return res.status(500).json({ error: 'Failed to update completion status' });
      }

      // Update completion photo status
      db.run(`UPDATE completion_photos SET status = ? WHERE id = ?`, [PHOTO_STATUS.MATCHED, completionPhotoId], (err) => {
        if (err) {
          console.error('Error updating completion photo status:', err);
        }
      });

      res.json({ 
        success: true,
        message: 'Order item marked as completed successfully' 
      });
    });

  } catch (error) {
    console.error('Error completing order item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unmark order item as completed
app.post('/api/order-items/:itemId/uncomplete', (req, res) => {
  try {
    const { itemId } = req.params;

    // Update order item completion status back to pending
    db.run(`UPDATE order_items SET completionStatus = ?, completedAt = NULL WHERE id = ?`, 
      [COMPLETION_STATUS.PENDING, itemId], function(err) {
      if (err) {
        console.error('Error updating order item completion:', err);
        return res.status(500).json({ error: 'Failed to update completion status' });
      }

      res.json({ 
        success: true,
        message: 'Order item unmarked as completed successfully' 
      });
    });

  } catch (error) {
    console.error('Error uncompleting order item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unmatch a completion photo from its order item
app.post('/api/completion-photos/:photoId/unmatch', (req, res) => {
  console.log(`Unmatch request received for photo ID: ${req.params.photoId}`);
  try {
    const { photoId } = req.params;

    // First, get the current photo details to update the order item
    db.get(`SELECT orderItemId, printFacilityId FROM completion_photos WHERE id = ?`, [photoId], (err, photo) => {
      if (err) {
        console.error('Error fetching completion photo:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!photo) {
        return res.status(404).json({ error: 'Completion photo not found' });
      }

      if (!photo.orderItemId) {
        return res.status(400).json({ error: 'Photo is not matched to any order item' });
      }

      // Start a transaction to ensure data consistency
      db.serialize(() => {
        // Begin transaction
        db.run('BEGIN TRANSACTION');

        // Update the completion photo to remove the match
        db.run(`UPDATE completion_photos SET orderItemId = NULL, matchedOrderItemId = NULL, status = ? WHERE id = ?`, 
          [PHOTO_STATUS.NEEDS_REVIEW, photoId], function(err) {
          if (err) {
            console.error('Error updating completion photo:', err);
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to unmatch completion photo' });
          }

          // Update the order item to mark it as not completed
          db.run(`UPDATE order_items SET completionStatus = ?, completedAt = NULL, completionPhoto = NULL WHERE id = ?`, 
            [COMPLETION_STATUS.PENDING, photo.orderItemId], function(err) {
            if (err) {
              console.error('Error updating order item:', err);
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to update order item status' });
            }

            // Check if we need to update the order status
            db.get(`SELECT o.id, o.orderNumber, COUNT(oi.id) as totalItems, 
                           SUM(CASE WHEN oi.completionStatus = ? THEN 1 ELSE 0 END) as completedItems
                    FROM orders o
                    JOIN order_items oi ON o.id = oi.orderId
                    WHERE oi.id = ?
                    GROUP BY o.id`, [COMPLETION_STATUS.COMPLETED, photo.orderItemId], (err, orderSummary) => {
              if (err) {
                console.error('Error checking order completion status:', err);
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to check order completion' });
              }

              if (orderSummary) {
                const allCompleted = orderSummary.completedItems === 0; // Since we just uncompleted one
                const newOrderStatus = allCompleted ? ORDER_STATUS.PRINTING : ORDER_STATUS.PRINTING;

                // Update order status
                db.run(`UPDATE orders SET status = ? WHERE id = ?`, [newOrderStatus, orderSummary.id], function(err) {
                  if (err) {
                    console.error('Error updating order status:', err);
                    // Don't rollback for this error, the main operation succeeded
                  }

                  // Commit transaction
                  db.run('COMMIT', function(err) {
                    if (err) {
                      console.error('Error committing transaction:', err);
                      return res.status(500).json({ error: 'Failed to commit changes' });
                    }

                    res.json({ 
                      success: true,
                      message: 'Completion photo unmatched successfully',
                      orderStatus: newOrderStatus,
                      orderNumber: orderSummary.orderNumber
                    });
                  });
                });
              } else {
                // Commit transaction
                db.run('COMMIT', function(err) {
                  if (err) {
                    console.error('Error committing transaction:', err);
                    return res.status(500).json({ error: 'Failed to commit changes' });
                  }

                  res.json({ 
                    success: true,
                    message: 'Completion photo unmatched successfully'
                  });
                });
              }
            });
          });
        });
      });
    });

  } catch (error) {
    console.error('Error unmatching completion photo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Video detection snapshot - automatically mark t-shirt as printed
app.post('/api/video-detection/snapshot', completionPhotoUpload.single('snapshot'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No snapshot uploaded' });
    }

    const { printFacilityId, detectedColor, confidence, orderItemId } = req.body;
    
    if (!printFacilityId || !orderItemId) {
      return res.status(400).json({ error: 'Print Facility ID and Order Item ID are required' });
    }

    // Generate unique ID for the snapshot
    const snapshotId = uuidv4();
    const snapshotPath = req.file.filename;

    // Store the snapshot with printFacilityId and proper linking
    db.run(`INSERT INTO completion_photos (id, orderItemId, photoPath, status, confidenceScore, printFacilityId, matchedOrderItemId) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
      [snapshotId, orderItemId, snapshotPath, PHOTO_STATUS.MATCHED, confidence || 1.0, printFacilityId, orderItemId], function(err) {
      if (err) {
        console.error('Error storing snapshot:', err);
        return res.status(500).json({ error: 'Failed to store snapshot' });
      }

      // Update the order item to "completed" status (consistent with our new system)
      db.run(`UPDATE order_items SET completionStatus = ?, completedAt = CURRENT_TIMESTAMP, completionPhoto = ? WHERE id = ?`, 
        [COMPLETION_STATUS.COMPLETED, snapshotPath, orderItemId], function(err) {
        if (err) {
          console.error('Error updating order item to completed:', err);
          return res.status(500).json({ error: 'Failed to update order item status' });
        }

        // Check if all order items in this order are now completed
        db.get(`SELECT o.id, o.orderNumber, COUNT(oi.id) as totalItems, 
                       SUM(CASE WHEN oi.completionStatus = ? THEN 1 ELSE 0 END) as completedItems
                FROM orders o
                JOIN order_items oi ON o.id = oi.orderId
                WHERE oi.id = ?
                GROUP BY o.id`, [COMPLETION_STATUS.COMPLETED, orderItemId], (err, orderSummary) => {
          if (err) {
            console.error('Error checking order completion status:', err);
            return res.status(500).json({ error: 'Failed to check order completion' });
          }

          if (orderSummary) {
            const allCompleted = orderSummary.totalItems === orderSummary.completedItems;
            const newOrderStatus = allCompleted ? ORDER_STATUS.COMPLETED : ORDER_STATUS.PRINTING;

            // Update order status
            db.run(`UPDATE orders SET status = ? WHERE id = ?`, [newOrderStatus, orderSummary.id], function(err) {
              if (err) {
                console.error('Error updating order status:', err);
              }

              res.json({ 
                success: true, 
                snapshotId,
                message: `T-shirt marked as completed. Order status: ${newOrderStatus}`,
                orderStatus: newOrderStatus,
                orderNumber: orderSummary.orderNumber,
                completedItems: orderSummary.completedItems,
                totalItems: orderSummary.totalItems,
                allCompleted: allCompleted
              });
            });
          } else {
            res.json({ 
              success: true, 
              snapshotId,
              message: 'T-shirt marked as completed successfully'
            });
          }
        });
      });
    });

  } catch (error) {
    console.error('Error processing video detection snapshot:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get video detection snapshots for a facility
app.get('/api/print-facilities/:facilityId/video-snapshots', (req, res) => {
  try {
    const { facilityId } = req.params;

    const query = `
      SELECT cp.id, cp.photoPath, cp.uploadedAt, cp.confidenceScore,
             oi.id as orderItemId, oi.color, oi.size, oi.quantity,
             o.orderNumber, o.customerName, o.status as orderStatus
      FROM completion_photos cp
      JOIN order_items oi ON cp.orderItemId = oi.id
      JOIN orders o ON oi.orderId = o.id
      WHERE cp.printFacilityId = ? AND cp.status = ?
      ORDER BY cp.uploadedAt DESC
    `;

    db.all(query, [facilityId, PHOTO_STATUS.MATCHED], (err, snapshots) => {
      if (err) {
        console.error('Error fetching video snapshots:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json(snapshots);
    });

  } catch (error) {
    console.error('Error fetching video snapshots:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test route to verify server is working
app.get('/api/test-unmatch', (req, res) => {
  res.json({ message: 'Unmatch test route is working' });
});

// Get print facility by ID - moved here to avoid intercepting specific routes
app.get('/api/print-facilities/:facilityId', (req, res) => {
  const { facilityId } = req.params;
  
  db.get(`SELECT * FROM print_facilities WHERE id = ?`, [facilityId], (err, facility) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!facility) {
      return res.status(404).json({ error: 'Print facility not found' });
    }
    res.json(facility);
  });
});

// Upload completion photo and attempt automatic image recognition matching - moved here to avoid intercepting specific routes
app.post('/api/completion-photos', completionPhotoUpload.single('completionPhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No completion photo uploaded' });
    }

    const { printFacilityId } = req.body;
    
    if (!printFacilityId) {
      return res.status(400).json({ error: 'Print Facility ID is required' });
    }

    // Generate unique ID for completion photo
    const photoId = uuidv4();
    const photoPath = req.file.filename;

    // Store completion photo record with temporary orderItemId (will be updated after recognition)
    db.run(`INSERT INTO completion_photos (id, orderItemId, photoPath, status, printFacilityId) VALUES (?, ?, ?, ?, ?)`, 
              [photoId, null, photoPath, PHOTO_STATUS.PENDING, printFacilityId], function(err) {
      if (err) {
        console.error('Error storing completion photo:', err);
        return res.status(500).json({ error: 'Failed to store completion photo' });
      }

      // Get order items assigned to this print facility that don't have completion photos yet
      const query = `
        SELECT oi.id as orderItemId, oi.designImage, oi.color, oi.size, oi.quantity, 
               o.orderNumber, o.customerName, o.id as orderId
        FROM order_items oi
        JOIN orders o ON oi.orderId = o.id
        LEFT JOIN completion_photos cp ON oi.id = cp.orderItemId AND cp.status = ?
        WHERE o.printFacilityId = ? 
          AND o.status = ? 
          AND oi.completionStatus = ?
          AND cp.id IS NULL
        ORDER BY o.assignedAt DESC
      `;

      db.all(query, [PHOTO_STATUS.MATCHED, printFacilityId, ORDER_STATUS.PRINTING, COMPLETION_STATUS.PENDING], async (err, orderItems) => {
        if (err) {
          console.error('Error fetching order items for recognition:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (orderItems.length === 0) {
          // No pending orders found - save as unmatched photo
          db.run(`UPDATE completion_photos SET status = ? WHERE id = ?`, [PHOTO_STATUS.NEEDS_REVIEW, photoId]);
          return res.json({ 
            success: true, 
            photoId,
            message: 'Completion photo uploaded successfully as unmatched. No pending orders found for this facility.',
            unmatched: true,
            photoId: photoId
          });
        }

        // Log what order items are being considered for matching
        console.log(`Photo matching against ${orderItems.length} order items:`);
        orderItems.forEach(item => {
          console.log(`  - Order #${item.orderNumber}: ${item.color} ${item.size} (ID: ${item.orderItemId})`);
        });

        // Attempt image recognition against all pending order items
        try {
          const bestMatch = await findBestImageMatch(photoPath, orderItems);
          
          if (bestMatch) {
            // Update completion photo with the best match
            db.run(`UPDATE completion_photos SET orderItemId = ?, matchedOrderItemId = ?, confidenceScore = ?, status = ? WHERE id = ?`, 
              [bestMatch.orderItemId, bestMatch.orderItemId, bestMatch.confidence, PHOTO_STATUS.MATCHED, photoId], (err) => {
              if (err) {
                console.error('Error updating completion photo with match:', err);
              }
            });

            res.json({ 
              success: true, 
              photoId,
              message: `Completion photo matched to Order #${bestMatch.orderNumber} - ${bestMatch.color} ${bestMatch.size} (Confidence: ${(bestMatch.confidence * 100).toFixed(1)}%)`,
              match: bestMatch
            });
          } else {
            // No good match found - save as unmatched photo for later manual assignment
            db.run(`UPDATE completion_photos SET status = ? WHERE id = ?`, [PHOTO_STATUS.NEEDS_REVIEW, photoId]);
            res.json({ 
              success: true, 
              photoId,
              message: 'Completion photo uploaded successfully as unmatched. You can manually assign it to an order item later.',
              unmatched: true,
              photoId: photoId
            });
          }
        } catch (recognitionError) {
          console.error('Image recognition error:', recognitionError);
          db.run(`UPDATE completion_photos SET status = ? WHERE id = ?`, [PHOTO_STATUS.NEEDS_REVIEW, photoId]);
          res.json({ 
            success: true, 
            photoId,
            message: 'Completion photo uploaded successfully as unmatched. Image recognition failed, but you can manually assign it later.',
            unmatched: true,
            photoId: photoId
          });
        }
      });
    });

  } catch (error) {
    console.error('Error uploading completion photo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Simple image similarity function for testing (without threshold restrictions)
async function compareImagesDirectly(photo1Path, photo2Path) {
  try {
    const sharp = require('sharp');
    
    // Load and preprocess both images using Sharp for proper processing
    const image1 = await sharp(photo1Path)
      .resize(200, 200) // Medium size for good balance of speed and accuracy
      .grayscale()
      .raw()
      .toBuffer();
    
    const image2 = await sharp(photo2Path)
      .resize(200, 200) // Same size for comparison
      .grayscale()
      .raw()
      .toBuffer();
    
    // Calculate basic pixel similarity
    let totalPixels = image1.length;
    let similarPixels = 0;
    let totalDifference = 0;
    
    for (let i = 0; i < image1.length; i++) {
      const diff = Math.abs(image1[i] - image2[i]);
      totalDifference += diff;
      
      // Consider pixels similar if difference is small (within 30 grayscale levels)
      if (diff < 30) {
        similarPixels++;
      }
    }
    
    // Calculate similarity score based on pixel similarity and average difference
    const pixelSimilarity = similarPixels / totalPixels;
    const averageDifference = totalDifference / totalPixels;
    const differenceSimilarity = Math.max(0, 1 - (averageDifference / 255));
    
    // Combine both metrics for final score
    const similarityScore = (pixelSimilarity * 0.7) + (differenceSimilarity * 0.3);
    
    console.log(`Image comparison completed - Pixel similarity: ${(pixelSimilarity * 100).toFixed(2)}%, Average difference: ${averageDifference.toFixed(2)}`);
    
    return Math.min(similarityScore, 1.0); // Normalize to 0-1 range
    
  } catch (error) {
    console.error('Error in direct image comparison:', error);
    throw error;
  }
}

// Test image similarity between two photos
app.post('/api/test-image-similarity', completionPhotoUpload.fields([
  { name: 'photo1', maxCount: 1 },
  { name: 'photo2', maxCount: 1 }
]), async (req, res) => {
  console.log('Image similarity test request received');
  console.log('Files:', req.files);
  try {
    if (!req.files || !req.files.photo1 || !req.files.photo2) {
      return res.status(400).json({ error: 'Both photos are required' });
    }

    const photo1Path = req.files.photo1[0].path; // Use full path instead of just filename
    const photo2Path = req.files.photo2[0].path; // Use full path instead of just filename

    // Create a mock order item for the second photo to test against
    const mockOrderItem = {
      id: 'test-item',
      designImage: photo2Path,
      color: 'Test',
      size: 'Test',
      quantity: 1,
      orderNumber: 'TEST-001',
      customerName: 'Test Customer'
    };

    // Use the direct comparison function to get similarity score without threshold restrictions
    try {
      const similarityScore = await compareImagesDirectly(photo1Path, photo2Path);
      
      res.json({
        success: true,
        similarityScore: similarityScore,
        message: 'Similarity test completed successfully'
      });
    } catch (recognitionError) {
      console.error('Image recognition error:', recognitionError);
      res.status(500).json({ error: 'Image recognition failed' });
    }

  } catch (error) {
    console.error('Error testing image similarity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve completion photos - moved here to avoid intercepting API routes
app.use('/completion-photos', express.static('completion-photos'));

// Catch all handler for React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 