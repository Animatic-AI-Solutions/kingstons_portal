// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock the AuthContext
jest.mock('./context/AuthContext', () => ({
  ...jest.requireActual('./context/AuthContext'),
  useAuth: () => ({
    api: {
      get: jest.fn().mockResolvedValue({ data: [] }),
      post: jest.fn().mockResolvedValue({ data: {} }),
      put: jest.fn().mockResolvedValue({ data: {} }),
      delete: jest.fn().mockResolvedValue({ data: {} })
    },
    isAuthenticated: true,
    user: {
      id: 1,
      username: 'testuser',
      email: 'test@example.com'
    },
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn()
  })
}));

// Mock the react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useParams: () => ({ id: '1' }),
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null })
}));

// Mock @faker-js/faker to avoid ESM issues
jest.mock('@faker-js/faker', () => ({
  faker: {
    number: {
      int: () => 1,
    },
    person: {
      firstName: () => 'John',
      lastName: () => 'Doe',
      middleName: () => 'William',
      jobTitle: () => 'Software Engineer',
    },
    internet: {
      email: () => 'john.doe@example.com',
    },
    phone: {
      number: () => '+44 7700 900123',
    },
    location: {
      streetAddress: () => '123 Main Street',
      secondaryAddress: () => 'Apt 4B',
      city: () => 'London',
      county: () => 'Greater London',
      zipCode: () => 'SW1A 1AA',
    },
    date: {
      birthdate: () => new Date('1980-01-15'),
      past: () => new Date('2023-01-01'),
      future: () => new Date('2030-01-15'),
    },
    string: {
      alpha: () => 'A',
      numeric: () => '123456',
    },
    word: {
      adjective: () => 'friendly',
    },
    helpers: {
      arrayElement: (arr: any[]) => arr[0],
      maybe: (fn: () => any, options?: { probability?: number }) => {
        const prob = options?.probability ?? 0.5;
        return prob > 0.5 ? fn() : null;
      },
    },
  },
}));

// Global test setup
beforeAll(() => {
  // Set up any global test environment configurations
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // Legacy browser support
      removeListener: jest.fn(), // Legacy browser support
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock ResizeObserver for HeadlessUI Dialog compatibility
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  // Clean up after each test
  jest.clearAllMocks();
});
