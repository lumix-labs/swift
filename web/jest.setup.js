// Import Jest DOM for additional matchers
import '@testing-library/jest-dom';

// Mock the global fetch
global.fetch = jest.fn(() => 
  Promise.resolve({
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    ok: true
  })
);

// Setup any global mocks needed for tests
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn()
  }),
  useSearchParams: () => ({
    get: jest.fn()
  }),
  usePathname: () => ""
}));

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
