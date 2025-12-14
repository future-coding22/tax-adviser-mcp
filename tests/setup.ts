/**
 * Test setup and global configuration
 */

import { beforeAll, afterAll, afterEach } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';

// Mock console methods to reduce test output noise
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  console.error = (...args: any[]) => {
    // Only show errors that include 'Error:' to catch actual errors
    if (args.some((arg) => String(arg).includes('Error:'))) {
      originalConsoleError(...args);
    }
  };

  console.warn = (...args: any[]) => {
    // Suppress warnings during tests
  };

  console.log = (...args: any[]) => {
    // Suppress logs during tests
  };
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});

afterEach(() => {
  // Clear all mocks after each test
  // This is handled by vitest's clearMocks: true in config
});
