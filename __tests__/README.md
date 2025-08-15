# 🧪 **Comprehensive Testing Suite Documentation**

## **Overview**

This testing suite provides comprehensive coverage for the AI Image Order Reconciliation System, with special focus on **multi-item orders** and **image type handling**. The suite includes unit tests, integration tests, and end-to-end scenarios to ensure system reliability and functionality.

## **🚀 Quick Start**

### **Run All Tests**
```bash
npm test
```

### **Run Specific Test Categories**
```bash
# Multi-item order tests
npm run test:multi-item

# Image processing tests
npm run test:images

# PDF generation tests
npm run test:pdf

# Unit tests only
npm run test:backend:unit

# Integration tests only
npm run test:backend:integration
```

### **Run with Coverage**
```bash
npm run test:coverage
```

### **Custom Test Runner**
```bash
# Run all tests
node __tests__/run-tests.js

# Run multi-item tests with coverage
node __tests__/run-tests.js --multi-item --coverage

# Run image tests in watch mode
node __tests__/run-tests.js --images --watch

# Get help
node __tests__/run-tests.js --help
```

## **📁 Test Structure**

```
__tests__/
├── setup/                           # Test configuration and utilities
│   ├── test-setup.js               # Global test setup
│   ├── database-test-helper.js     # Database testing utilities
│   └── server-test-helper.js       # Server testing utilities
├── unit/                           # Unit tests
│   ├── orders/                     # Order management tests
│   ├── images/                     # Image processing tests
│   ├── pdf/                        # PDF generation tests
│   └── database/                   # Database operation tests
├── integration/                    # Integration tests
│   ├── multi-item-orders/          # Multi-item order workflows
│   ├── image-processing/           # Image handling flows
│   └── complete-workflows/         # End-to-end scenarios
├── fixtures/                       # Test data and files
│   ├── images/                     # Sample images of all types
│   ├── orders/                     # Sample order data
│   └── databases/                  # Test database schemas
├── mocks/                          # Mock objects and services
└── run-tests.js                    # Custom test runner
```

## **🎯 Test Categories**

### **1. Multi-Item Order Tests** 📦
- **Order Creation**: Single and multiple items with various configurations
- **Cart Management**: Adding, removing, and updating multiple items
- **Validation**: Required fields, data integrity, business rules
- **Database Operations**: Complex order storage and retrieval
- **PDF Generation**: Multi-image PDFs with proper formatting

**Key Test Scenarios:**
- 2-5 items with different designs
- Same design, different colors/sizes
- Mixed image formats in same order
- Large quantity orders (50+ items)
- Cart state persistence and updates

### **2. Image Processing Tests** 🖼️
- **Format Support**: JPG, JPEG, PNG, WebP, SVG
- **Validation**: File extensions, MIME types, file sizes
- **Conversion**: WebP to JPEG, PNG to JPEG, SVG to PNG
- **Error Handling**: Corrupted files, unsupported formats
- **Performance**: Large files, concurrent processing

**Key Test Scenarios:**
- Mixed format orders
- Format conversion accuracy
- File size validation
- Corrupted file handling
- Memory usage optimization

### **3. PDF Generation Tests** 📄
- **Multi-Image Layouts**: Proper image positioning and sizing
- **Page Management**: Automatic page breaks for long orders
- **Formatting Consistency**: Font colors, spacing, alignment
- **Error Handling**: Missing images, processing failures
- **Performance**: Large order processing times

**Key Test Scenarios:**
- 5+ items with page breaks
- Mixed image format handling
- Consistent formatting throughout
- Error recovery mechanisms
- Output validation

### **4. Integration Tests** 🔗
- **Complete Workflows**: Design → Cart → Checkout → PDF
- **API Endpoints**: All backend functionality
- **Database Integration**: Complex data relationships
- **File System**: Upload, storage, retrieval
- **Error Recovery**: Network failures, validation errors

### **5. Unit Tests** ⚡
- **Individual Components**: Isolated functionality testing
- **Business Logic**: Order calculations, validation rules
- **Utility Functions**: Image processing, PDF generation
- **Database Operations**: CRUD operations, queries
- **Error Handling**: Specific error scenarios

## **🧪 Test Execution**

### **Jest Configuration**
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'server.js',
    '**/*.js',
    '!**/node_modules/**',
    '!**/client/**'
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 87,
      statements: 87
    }
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/test-setup.js'],
  testTimeout: 15000
};
```

### **Coverage Targets**
| Component | Target Coverage |
|-----------|-----------------|
| **Overall System** | **87%+** |
| **Multi-Item Logic** | **95%+** |
| **Image Processing** | **95%+** |
| **PDF Generation** | **90%+** |
| **API Endpoints** | **90%+** |
| **Database Operations** | **95%+** |

## **🔧 Test Utilities**

### **Global Test Utilities**
```javascript
// Available in all tests via global.testUtils
global.testUtils = {
  generateTestOrder: (itemCount, imageTypes) => { /* ... */ },
  generateTestImage: (format, size) => { /* ... */ },
  mockFileUpload: (files) => { /* ... */ },
  cleanupTestFiles: () => { /* ... */ }
};
```

### **Database Test Helper**
```javascript
const DatabaseTestHelper = require('./setup/database-test-helper');

const dbHelper = new DatabaseTestHelper();
await dbHelper.initializeTestDatabase();
await dbHelper.seedTestData();
await dbHelper.cleanup();
```

### **Server Test Helper**
```javascript
const ServerTestHelper = require('./setup/server-test-helper');

const serverHelper = new ServerTestHelper();
await serverHelper.initializeTestServer();
const app = serverHelper.request();
await serverHelper.cleanup();
```

## **📊 Test Data and Fixtures**

### **Sample Order Data**
```javascript
const testOrder = {
  customerName: 'Test Customer',
  customerEmail: 'test@example.com',
  shippingAddress: '123 Test St',
  items: [
    {
      color: 'blue',
      size: 'medium',
      quantity: 2,
      price: 25.00,
      designImage: 'design-1.jpg'
    }
  ]
};
```

### **Sample Image Data**
```javascript
const testImage = {
  fieldname: 'designImage',
  originalname: 'test-image.jpg',
  mimetype: 'image/jpeg',
  buffer: Buffer.alloc(1024),
  size: 1024
};
```

## **🚨 Error Handling Tests**

### **Validation Errors**
- Missing required fields
- Invalid data types
- Business rule violations
- File format restrictions

### **System Errors**
- Database connection failures
- File system errors
- Image processing failures
- Network timeouts

### **Recovery Scenarios**
- Partial order failures
- Image upload retries
- Database rollbacks
- Error state management

## **📈 Performance Testing**

### **Benchmarks**
- **API Response Time**: < 200ms for simple operations
- **Multi-Item Order Creation**: < 500ms for 5+ items
- **PDF Generation**: < 3s for multi-item orders
- **Image Processing**: < 1s for standard images
- **WebP Conversion**: < 2s for large images

### **Load Testing**
- Multiple concurrent orders
- Large file uploads
- Database query performance
- Memory usage monitoring

## **🔍 Debugging Tests**

### **Verbose Output**
```bash
npm test -- --verbose
```

### **Debug Specific Test**
```bash
npm test -- --testNamePattern="should create order with 2 items"
```

### **Watch Mode**
```bash
npm run test:watch
```

### **Coverage Reports**
```bash
npm run test:coverage
# Open coverage/lcov-report/index.html
```

## **📝 Writing New Tests**

### **Test Structure**
```javascript
describe('Feature Name', () => {
  let testData;
  
  beforeEach(() => {
    // Setup test data
    testData = { /* ... */ };
  });
  
  afterEach(() => {
    // Cleanup
  });
  
  test('should do something specific', async () => {
    // Arrange
    const input = testData;
    
    // Act
    const result = await functionUnderTest(input);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.property).toBe(expectedValue);
  });
});
```

### **Naming Conventions**
- **Test Names**: Descriptive, action-oriented
- **File Names**: `feature-name.test.js`
- **Directory Names**: `feature-name/`
- **Mock Names**: `mockFeatureName`

### **Best Practices**
- **AAA Pattern**: Arrange, Act, Assert
- **Single Responsibility**: One assertion per test
- **Test Isolation**: Independent test execution
- **Meaningful Data**: Realistic test scenarios
- **Error Coverage**: Test both success and failure paths

## **🔄 Continuous Integration**

### **Pre-commit Hooks**
```bash
# Install husky for git hooks
npm install --save-dev husky

# Add to package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm test"
    }
  }
}
```

### **CI/CD Pipeline**
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

## **📚 Additional Resources**

### **Jest Documentation**
- [Jest Getting Started](https://jestjs.io/docs/getting-started)
- [Jest Configuration](https://jestjs.io/docs/configuration)
- [Jest Mocking](https://jestjs.io/docs/mock-functions)

### **Testing Best Practices**
- [Testing Library Guidelines](https://testing-library.com/docs/guiding-principles)
- [Test-Driven Development](https://en.wikipedia.org/wiki/Test-driven_development)
- [Behavior-Driven Development](https://en.wikipedia.org/wiki/Behavior-driven_development)

### **Performance Testing**
- [Jest Performance](https://jestjs.io/docs/troubleshooting#tests-are-extremely-slow-on-docker-andor-continuous-integration-server)
- [Load Testing with Artillery](https://artillery.io/)

---

## **🎯 Next Steps**

1. **Run Initial Tests**: `npm test`
2. **Check Coverage**: `npm run test:coverage`
3. **Focus on Multi-Item**: `npm run test:multi-item`
4. **Test Image Processing**: `npm run test:images`
5. **Validate PDF Generation**: `npm run test:pdf`
6. **Add New Tests**: Follow the patterns established
7. **Monitor Performance**: Track test execution times
8. **Update Documentation**: Keep this README current

---

**Happy Testing! 🧪✨** 