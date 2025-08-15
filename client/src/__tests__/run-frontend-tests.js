#!/usr/bin/env node

/**
 * Frontend Test Runner for AI Image Order Reconciliation System
 * 
 * Usage:
 *   node src/__tests__/run-frontend-tests.js                    # Run all frontend tests
 *   node src/__tests__/run-frontend-tests.js --components       # Run component tests only
 *   node src/__tests__/run-frontend-tests.js --integration      # Run integration tests only
 *   node src/__tests__/run-frontend-tests.js --coverage         # Run with coverage report
 *   node src/__tests__/run-frontend-tests.js --watch           # Run in watch mode
 */

const { spawn } = require('child_process');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  components: {
    pattern: 'src/__tests__/components/**/*.test.js',
    description: 'Component Tests',
    includes: ['TShirtDesigner', 'Cart', 'Checkout', 'Admin', 'OrderManager']
  },
  integration: {
    pattern: 'src/__tests__/integration/**/*.test.js',
    description: 'Integration Tests',
    includes: ['user workflows', 'API integration', 'routing']
  },
  utils: {
    pattern: 'src/__tests__/utils/**/*.test.js',
    description: 'Utility Tests',
    includes: ['helpers', 'formatters', 'validators']
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  components: args.includes('--components'),
  integration: args.includes('--integration'),
  utils: args.includes('--utils'),
  coverage: args.includes('--coverage'),
  watch: args.includes('--watch'),
  help: args.includes('--help') || args.includes('-h')
};

// Show help
if (options.help) {
  console.log(`
🧪 Frontend Test Runner for AI Image Order Reconciliation System

Usage:
  node src/__tests__/run-frontend-tests.js [options]

Options:
  --components       Run component tests only
  --integration      Run integration tests only
  --utils            Run utility tests only
  --coverage         Run with coverage report
  --watch            Run in watch mode
  --help, -h         Show this help message

Examples:
  node src/__tests__/run-frontend-tests.js --components --coverage
  node src/__tests__/run-frontend-tests.js --integration --watch
  node src/__tests__/run-frontend-tests.js --watch

Test Categories:
  🧩 Components: Individual React component testing
  🔗 Integration: End-to-end workflows and API integration
  🛠️  Utils: Helper functions and utilities
  📱 Responsive: Mobile and tablet viewport testing
  ♿ Accessibility: ARIA labels and keyboard navigation
  🖼️  Images: Multi-format image handling
  📦 Multi-Item: Cart and order management
`);
  process.exit(0);
}

// Determine which tests to run
let testPattern = 'src/__tests__/**/*.test.js';
let testDescription = 'All Frontend Tests';

if (options.components) {
  testPattern = 'src/__tests__/components/**/*.test.js';
  testDescription = 'Component Tests';
} else if (options.integration) {
  testPattern = 'src/__tests__/integration/**/*.test.js';
  testDescription = 'Integration Tests';
} else if (options.utils) {
  testPattern = 'src/__tests__/utils/**/*.test.js';
  testDescription = 'Utility Tests';
}

// Build test command
const testArgs = [
  'test',
  '--testPathPattern', testPattern,
  '--verbose',
  '--testTimeout', '10000'
];

if (options.coverage) {
  testArgs.push('--coverage');
}

if (options.watch) {
  testArgs.push('--watch');
}

// Display test information
console.log(`
🚀 Starting ${testDescription}
📁 Test Pattern: ${testPattern}
🔧 Test Arguments: ${testArgs.join(' ')}
⏱️  Timeout: 10 seconds
📊 Coverage: ${options.coverage ? 'Enabled' : 'Disabled'}
👀 Watch Mode: ${options.watch ? 'Enabled' : 'Disabled'}
🏗️  Test Environment: React Testing Library + MSW
`);

// Run tests
console.log('🧪 Executing frontend tests...\n');

const testProcess = spawn('npm', testArgs, {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

testProcess.on('close', (code) => {
  console.log(`\n🏁 Frontend test execution completed with exit code: ${code}`);
  
  if (code === 0) {
    console.log('✅ All frontend tests passed successfully!');
    
    if (options.coverage) {
      console.log('\n📊 Coverage report generated in client/coverage/ directory');
      console.log('🌐 Open client/coverage/lcov-report/index.html to view detailed coverage');
    }
  } else {
    console.log('❌ Some frontend tests failed. Please review the output above.');
    process.exit(code);
  }
});

testProcess.on('error', (error) => {
  console.error('💥 Error running frontend tests:', error.message);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Frontend test execution interrupted by user');
  testProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Frontend test execution terminated');
  testProcess.kill('SIGTERM');
  process.exit(0);
}); 