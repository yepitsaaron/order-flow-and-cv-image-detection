#!/usr/bin/env node

/**
 * Comprehensive Test Runner for AI Image Order Reconciliation System
 * 
 * Usage:
 *   node __tests__/run-tests.js                    # Run all tests
 *   node __tests__/run-tests.js --unit            # Run unit tests only
 *   node __tests__/run-tests.js --integration     # Run integration tests only
 *   node __tests__/run-tests.js --multi-item      # Run multi-item order tests
 *   node __tests__/run-tests.js --images          # Run image processing tests
 *   node __tests__/run-tests.js --pdf             # Run PDF generation tests
 *   node __tests__/run-tests.js --coverage        # Run with coverage report
 *   node __tests__/run-tests.js --watch           # Run in watch mode
 */

const { spawn } = require('child_process');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  unit: {
    pattern: '__tests__/unit/**/*.test.js',
    description: 'Unit Tests',
    includes: ['orders', 'images', 'pdf', 'database']
  },
  integration: {
    pattern: '__tests__/integration/**/*.test.js',
    description: 'Integration Tests',
    includes: ['multi-item-orders', 'image-processing', 'complete-workflows']
  },
  'multi-item': {
    pattern: '**/*multi-item*',
    description: 'Multi-Item Order Tests',
    includes: ['order creation', 'cart management', 'PDF generation']
  },
  images: {
    pattern: '**/*image*',
    description: 'Image Processing Tests',
    includes: ['format validation', 'conversion', 'error handling']
  },
  pdf: {
    pattern: '**/*pdf*',
    description: 'PDF Generation Tests',
    includes: ['multi-image PDFs', 'formatting', 'page breaks']
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  unit: args.includes('--unit'),
  integration: args.includes('--integration'),
  multiItem: args.includes('--multi-item'),
  images: args.includes('--images'),
  pdf: args.includes('--pdf'),
  coverage: args.includes('--coverage'),
  watch: args.includes('--watch'),
  help: args.includes('--help') || args.includes('-h')
};

// Show help
if (options.help) {
  console.log(`
🧪 AI Image Order Reconciliation System - Test Runner

Usage:
  node __tests__/run-tests.js [options]

Options:
  --unit              Run unit tests only
  --integration       Run integration tests only
  --multi-item        Run multi-item order tests
  --images            Run image processing tests
  --pdf               Run PDF generation tests
  --coverage          Run with coverage report
  --watch             Run in watch mode
  --help, -h          Show this help message

Examples:
  node __tests__/run-tests.js --unit --coverage
  node __tests__/run-tests.js --multi-item --images
  node __tests__/run-tests.js --watch

Test Categories:
  📦 Multi-Item Orders: Order creation, cart management, complex workflows
  🖼️  Image Processing: Format validation, conversion, error handling
  📄 PDF Generation: Multi-image PDFs, formatting, page breaks
  🔗 Integration: End-to-end workflows, API testing
  ⚡ Unit: Individual component testing
`);
  process.exit(0);
}

// Determine which tests to run
let testPattern = '**/*.test.js';
let testDescription = 'All Tests';

if (options.unit) {
  testPattern = '__tests__/unit/**/*.test.js';
  testDescription = 'Unit Tests';
} else if (options.integration) {
  testPattern = '__tests__/integration/**/*.test.js';
  testDescription = 'Integration Tests';
} else if (options.multiItem) {
  testPattern = '**/*multi-item*';
  testDescription = 'Multi-Item Order Tests';
} else if (options.images) {
  testPattern = '**/*image*';
  testDescription = 'Image Processing Tests';
} else if (options.pdf) {
  testPattern = '**/*pdf*';
  testDescription = 'PDF Generation Tests';
}

// Build Jest command
const jestArgs = [
  '--testPathPattern', testPattern,
  '--verbose',
  '--testTimeout', '15000'
];

if (options.coverage) {
  jestArgs.push('--coverage');
}

if (options.watch) {
  jestArgs.push('--watch');
}

// Display test information
console.log(`
🚀 Starting ${testDescription}
📁 Test Pattern: ${testPattern}
🔧 Jest Arguments: ${jestArgs.join(' ')}
⏱️  Timeout: 15 seconds
📊 Coverage: ${options.coverage ? 'Enabled' : 'Disabled'}
👀 Watch Mode: ${options.watch ? 'Enabled' : 'Disabled'}
`);

// Run tests
console.log('🧪 Executing tests...\n');

const jestProcess = spawn('npx', ['jest', ...jestArgs], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

jestProcess.on('close', (code) => {
  console.log(`\n🏁 Test execution completed with exit code: ${code}`);
  
  if (code === 0) {
    console.log('✅ All tests passed successfully!');
    
    if (options.coverage) {
      console.log('\n📊 Coverage report generated in coverage/ directory');
      console.log('🌐 Open coverage/lcov-report/index.html to view detailed coverage');
    }
  } else {
    console.log('❌ Some tests failed. Please review the output above.');
    process.exit(code);
  }
});

jestProcess.on('error', (error) => {
  console.error('💥 Error running tests:', error.message);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test execution interrupted by user');
  jestProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test execution terminated');
  jestProcess.kill('SIGTERM');
  process.exit(0);
}); 