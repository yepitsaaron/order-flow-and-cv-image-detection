/**
 * MSW server for API mocking in frontend tests
 */

import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Mock API base URL
const API_BASE = 'http://localhost:3001';

// Mock data
const mockOrders = [
  {
    id: 1,
    orderNumber: 'TEST-001',
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    shippingAddress: '123 Test St',
    shippingCity: 'Test City',
    shippingState: 'TS',
    shippingZipCode: '12345',
    totalAmount: 75.00,
    status: 'processing',
    createdAt: '2024-01-01T00:00:00.000Z',
    items: [
      {
        id: 1,
        color: 'blue',
        size: 'medium',
        quantity: 2,
        price: 25.00,
        designImage: 'test-design-1.jpg'
      },
      {
        id: 2,
        color: 'red',
        size: 'large',
        quantity: 1,
        price: 25.00,
        designImage: 'test-design-2.webp'
      }
    ]
  }
];

const mockPrintFacilities = [
  {
    id: 1,
    name: 'Test Print Facility',
    contactPerson: 'Test Contact',
    email: 'test@facility.com',
    phone: '555-1234',
    address: '123 Test St',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
    isActive: true
  }
];

const mockOptions = {
  colors: ['white', 'blue', 'yellow', 'red', 'black'],
  sizes: ['small', 'medium', 'large'],
  basePrice: 25.00
};

// API handlers
export const handlers = [
  // Health check
  rest.get(`${API_BASE}/api/health`, (req, res, ctx) => {
    return res(ctx.json({ status: 'ok' }));
  }),

  // Get options
  rest.get(`${API_BASE}/api/options`, (req, res, ctx) => {
    return res(ctx.json(mockOptions));
  }),

  // Create order
  rest.post(`${API_BASE}/api/orders`, (req, res, ctx) => {
    // Mock successful order creation
    const newOrder = {
      id: Date.now(),
      orderNumber: `TEST-${Date.now()}`,
      orderId: Date.now(),
      totalAmount: 75.00,
      message: 'Order created successfully'
    };
    
    return res(ctx.status(201), ctx.json(newOrder));
  }),

  // Get orders
  rest.get(`${API_BASE}/api/orders`, (req, res, ctx) => {
    return res(ctx.json(mockOrders));
  }),

  // Get print facilities
  rest.get(`${API_BASE}/api/print-facilities`, (req, res, ctx) => {
    return res(ctx.json(mockPrintFacilities));
  }),

  // Assign order to facility
  rest.post(`${API_BASE}/api/orders/:orderId/assign-facility`, (req, res, ctx) => {
    return res(ctx.json({ 
      message: 'Order assigned successfully',
      orderId: req.params.orderId,
      printFacilityId: req.body.printFacilityId
    }));
  }),

  // Unassign order from facility
  rest.post(`${API_BASE}/api/orders/:orderId/unassign-facility`, (req, res, ctx) => {
    return res(ctx.json({ 
      message: 'Order unassigned successfully',
      orderId: req.params.orderId
    }));
  }),

  // Regenerate PDF
  rest.post(`${API_BASE}/api/orders/:orderId/regenerate-pdf`, (req, res, ctx) => {
    return res(ctx.json({ 
      message: 'PDF regenerated successfully',
      orderId: req.params.orderId
    }));
  }),

  // Update order status
  rest.put(`${API_BASE}/api/orders/:orderId/status`, (req, res, ctx) => {
    return res(ctx.json({ 
      message: 'Order status updated successfully',
      orderId: req.params.orderId,
      status: req.body.status
    }));
  }),

  // Upload completion photo
  rest.post(`${API_BASE}/api/completion-photos`, (req, res, ctx) => {
    return res(ctx.json({ 
      message: 'Photo uploaded successfully',
      photoId: Date.now(),
      status: 'pending'
    }));
  }),

  // Get completion photos
  rest.get(`${API_BASE}/api/print-facilities/:facilityId/completion-photos`, (req, res, ctx) => {
    return res(ctx.json([]));
  }),

  // Mark order item as completed
  rest.post(`${API_BASE}/api/order-items/:itemId/complete`, (req, res, ctx) => {
    return res(ctx.json({ 
      message: 'Order item marked as completed',
      itemId: req.params.itemId
    }));
  }),

  // Video detection snapshot
  rest.post(`${API_BASE}/api/video-detection/snapshot`, (req, res, ctx) => {
    return res(ctx.json({ 
      success: true,
      snapshotId: Date.now(),
      message: 'Snapshot processed successfully',
      orderStatus: 'printing'
    }));
  }),

  // Get video snapshots
  rest.get(`${API_BASE}/api/print-facilities/:facilityId/video-snapshots`, (req, res, ctx) => {
    return res(ctx.json([]));
  }),

  // Catch-all handler for unmatched requests
  rest.all('*', (req, res, ctx) => {
    console.warn(`Unhandled ${req.method} request to ${req.url}`);
    return res(ctx.status(404), ctx.json({ error: 'Not found' }));
  })
];

// Setup server
export const server = setupServer(...handlers); 