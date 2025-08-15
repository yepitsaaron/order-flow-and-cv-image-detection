# Custom T-Shirt Ordering Application

A lightweight e-commerce application that allows users to order custom t-shirts with their own designs. Users can select colors, sizes, upload designs, and complete the checkout process. The application generates PDF receipts and stores order information in a database for processing by a third-party printing service.

## Features

- **Custom T-Shirt Design**: Upload personal design images (JPG, PNG, GIF)
- **Multiple Options**: Choose from 5 colors (white, blue, yellow, red, black) and 3 sizes (small, medium, large)
- **Shopping Cart**: Add multiple items, edit quantities, and manage cart contents
- **Checkout Process**: Complete shipping information and place orders
- **Order Management**: Store orders in SQLite database with unique order numbers
- **PDF Generation**: Automatically generate detailed PDF receipts with embedded design images
- **Print Facility Management**: Admin interface to create, edit, and manage print facilities
- **Order Assignment**: Manually assign orders to specific print facilities
- **Responsive Design**: Modern, mobile-friendly user interface
- **File Upload**: Drag-and-drop image upload with preview
- **Professional Navigation**: Proper URL routing with browser history support
- **Admin ID Visibility**: Clear display of order and facility IDs for easy reference
- **Real-time Video Detection**: Computer vision system for continuous t-shirt monitoring (see `stream-detection/` folder)

## Technology Stack

### Backend
- **Node.js** with **Express.js** framework
- **SQLite3** database for data persistence
- **Multer** for file upload handling
- **PDFKit** for PDF generation
- **CORS** enabled for cross-origin requests

### Frontend
- **React.js** with functional components and hooks
- **CSS3** with modern styling and responsive design
- **Axios** for HTTP requests

## Project Structure

```
ai-image-order-reconciliation/
├── server.js                 # Main Express server
├── package.json             # Backend dependencies
├── orders.db               # SQLite database (created automatically)
├── uploads/                # Uploaded design images
├── orders/                 # Generated PDF receipts
├── client/                 # React frontend
│   ├── package.json       # Frontend dependencies
│   ├── public/            # Static files
│   └── src/               # React source code
│       ├── components/    # React components
│       ├── App.js         # Main application component
│       ├── index.js       # React entry point
│       └── index.css      # Global styles
├── stream-detection/       # Real-time video computer vision system
│   ├── video_streaming_app.py  # Main OpenCV application
│   ├── config.py              # Configuration settings
│   ├── requirements.txt       # Python dependencies
│   ├── start-video-detector.sh # Automated startup script
│   └── README.md             # Quick start guide
└── README.md              # This file
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Quick Start

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd ai-image-order-reconciliation
   npm install
   cd client && npm install && cd ..
   ```

2. **Start the application:**
   ```bash
   # Production mode (serves built frontend)
   npm start
   
   # Development mode (runs both frontend and backend)
   ./dev.sh
   
   # Or use the startup script
   ./start.sh
   ```

3. **Access the application:**
   - Frontend: http://localhost:3001
   - API: http://localhost:3001/api/*

### Backend Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

   The server will start on `http://localhost:3001`

### Frontend Setup

1. **Navigate to client directory:**
   ```bash
   cd client
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

   The React app will start on `http://localhost:3000`

### Complete Setup (One Command)

From the root directory, you can run:
```bash
npm run install-client && npm run build
```

This will install frontend dependencies and build the production version.

## Usage

### 1. Design Your T-Shirt
- Upload a design image by dragging and dropping or clicking to browse
- Select your preferred color from the available options
- Choose your size (small, medium, or large)
- Set the quantity
- Click "Add to Cart"

**Note**: The application has been tested and verified to work correctly. Orders are successfully stored in the database and PDF receipts are generated automatically.

### 2. Admin Management (Print Facilities)

#### Access Admin Panel
- Click the "Show Admin" button in the header to access the admin interface
- The admin panel has two main tabs: Print Facilities and Order Management

#### Manage Print Facilities
- **Create**: Add new print facilities with contact information and addresses
- **Edit**: Modify existing facility details
- **Delete**: Remove facilities (only if no orders are assigned)
- **Status**: Mark facilities as active or inactive

#### Assign Orders to Facilities
- View all orders with their current facility assignments
- Assign orders to specific print facilities
- Unassign orders from facilities
- Track assignment dates and facility status

### 3. Manage Your Cart
- View all items in your cart
- Edit colors, sizes, or quantities
- Remove items you don't want
- Continue shopping or proceed to checkout

### 4. Checkout
- Fill in your shipping information
- Review your order summary
- Submit your order

### 5. Order Confirmation
- Receive confirmation with order number
- View next steps and important information
- PDF receipt is automatically generated and stored

## API Endpoints

### GET `/api/health`
Health check endpoint to verify server status.

### GET `/api/options`
Returns available t-shirt colors, sizes, and base price.

### POST `/api/orders`
Creates a new order with design image and customer information.

**Request Body (multipart/form-data):**
- `designImage`: Image file
- `customerName`: Customer's full name
- `email`: Customer's email address
- `phone`: Customer's phone number (optional)
- `address`: Street address
- `city`: City
- `state`: State/province
- `zipCode`: ZIP/postal code
- `country`: Country
- `items[]`: Array of order items with color, size, quantity, and price

### GET `/api/orders/:orderId`
Retrieves order details by order ID.

### GET `/api/orders`
Retrieves all orders with print facility information (for admin purposes).

### Print Facility Management

#### POST `/api/print-facilities`
Creates a new print facility.

**Request Body:**
- `name`: Facility name
- `contactPerson`: Primary contact person
- `email`: Contact email
- `phone`: Contact phone (optional)
- `address`: Street address
- `city`: City
- `state`: State/province
- `zipCode`: ZIP/postal code
- `country`: Country
- `isActive`: Boolean for facility status

#### GET `/api/print-facilities`
Retrieves all print facilities.

#### GET `/api/print-facilities/:facilityId`
Retrieves a specific print facility by ID.

#### PUT `/api/print-facilities/:facilityId`
Updates an existing print facility.

#### DELETE `/api/print-facilities/:facilityId`
Deletes a print facility (only if no orders are assigned).

#### POST `/api/orders/:orderId/assign-facility`
Assigns an order to a print facility.

**Request Body:**
- `printFacilityId`: ID of the facility to assign

#### POST `/api/orders/:orderId/unassign-facility`
Unassigns an order from its current print facility.

## Database Schema

### Orders Table
- `id`: Unique identifier (UUID)
- `orderNumber`: Human-readable order number
- `customerName`: Customer's full name
- `email`: Customer's email
- `phone`: Customer's phone number
- `address`: Street address
- `city`: City
- `state`: State/province
- `zipCode`: ZIP/postal code
- `country`: Country
- `totalAmount`: Total order amount
- `status`: Order status (default: 'pending')
- `printFacilityId`: Reference to assigned print facility (optional)
- `assignedAt`: Timestamp when facility was assigned (optional)
- `createdAt`: Timestamp of order creation

### Print Facilities Table
- `id`: Unique identifier (UUID)
- `name`: Facility name
- `contactPerson`: Primary contact person
- `email`: Contact email
- `phone`: Contact phone number
- `address`: Street address
- `city`: City
- `state`: State/province
- `zipCode`: ZIP/postal code
- `country`: Country
- `isActive`: Boolean for facility status
- `createdAt`: Timestamp of facility creation

### Order Items Table
- `id`: Auto-incrementing identifier
- `orderId`: Foreign key to orders table
- `designImage`: Filename of uploaded design
- `color`: Selected t-shirt color
- `size`: Selected t-shirt size
- `quantity`: Number of t-shirts
- `price`: Price per t-shirt

## File Storage

- **Design Images**: Stored in `uploads/` directory with unique filenames
- **PDF Receipts**: Generated in `orders/` directory with order number as filename
- **Database**: SQLite file (`orders.db`) created automatically

## PDF Receipt Contents

Each generated PDF includes:
- Order number and date
- Customer information
- Order details (color, size, quantity, price)
- **Embedded design image** (viewable directly in the PDF)
- Total amount
- Processing information

**Note**: The design image is embedded directly into the PDF, making it easy to view the custom design without needing to access separate image files.

## Real-Time Video Detection System

The application includes a sophisticated computer vision system for real-time t-shirt detection and order matching. This system is located in the `stream-detection/` folder and provides:

### Features
- **Continuous Video Monitoring**: Real-time camera stream processing
- **Automatic T-Shirt Detection**: Computer vision algorithms identify t-shirt objects
- **Color Recognition**: Detects 6 colors (white, black, red, blue, yellow, green)
- **Design Feature Extraction**: SIFT-based logo and design analysis
- **Intelligent Order Matching**: AI-powered matching to pending orders
- **Automatic Snapshot Capture**: Saves images when t-shirts are detected
- **Order Status Updates**: Automatically marks items as "printed" and updates order status
- **Facility Integration**: Works with existing print facility management

### Automated Workflow
1. **Detection**: Computer vision identifies t-shirt objects in real-time
2. **Matching**: AI algorithm matches detected t-shirts to pending orders
3. **Snapshot**: Automatic capture and storage of detection images
4. **Status Update**: Order items marked as "printed"
5. **Order Completion**: Order status updated to "Press Complete" when all items printed

### Quick Start
```bash
cd stream-detection
chmod +x start-video-detector.sh
./start-video-detector.sh YOUR_FACILITY_ID
```

### Requirements
- Python 3.8+
- OpenCV 4.12.0+
- Webcam or iPhone camera
- Print facility ID

For detailed documentation, see `stream-detection/README.md` and related files.

## React App Usability Features

### **Professional Navigation**
- **URL Routing**: Clean, intuitive URLs for all application sections
- **Browser History**: Full support for back/forward navigation
- **Deep Linking**: Direct access to specific admin panel sections
- **Bookmark Support**: Users can bookmark any page for quick access

### **Admin Interface Improvements**
- **Order ID Display**: Prominently shown for easy reference and copying
- **Facility ID Display**: Clearly visible in facility management
- **Route-based Tabs**: Admin sections accessible via direct URLs
- **Consistent Layout**: Professional appearance across all admin functions

### **User Experience Enhancements**
- **Intuitive Navigation**: Standard web app navigation patterns
- **Mobile Responsiveness**: Optimized for all device sizes
- **Visual Hierarchy**: Clear organization of information and actions
- **Accessibility**: Improved keyboard and screen reader support

## Development
```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
cd client && npm start
```

### Building for Production
```bash
npm run build
```

### Environment Variables
- `PORT`: Server port (default: 5000)

## Security Features

- File type validation (images only)
- File size limits (5MB max)
- Input validation and sanitization
- CORS configuration
- Secure file naming

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Mobile Responsiveness

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones

## Future Enhancements

- User authentication and accounts
- Order tracking system
- Email notifications
- Admin dashboard
- Payment integration
- Multiple design uploads per order
- Bulk order processing
- Design templates and customization tools

## Troubleshooting

### Common Issues

1. **Port already in use**: Change the PORT environment variable or kill the process using the port
2. **Database errors**: Delete `orders.db` file to reset the database
3. **File upload issues**: Check file size and type restrictions
4. **CORS errors**: Ensure the backend is running and CORS is properly configured

### Logs

Check the console output for:
- Server startup messages
- Database connection status
- File upload confirmations
- PDF generation confirmations
- Error messages

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the console logs
3. Verify all dependencies are installed
4. Ensure both backend and frontend are running

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Note**: This application is designed for demonstration purposes and does not include payment processing. In a production environment, you would need to integrate with a payment gateway and implement additional security measures. 