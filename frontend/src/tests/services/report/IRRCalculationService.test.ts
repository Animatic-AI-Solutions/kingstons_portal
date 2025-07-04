import { IRRCalculationService, createIRRCalculationService } from '../../../services/report/IRRCalculationService';

// Mock API instance
const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
} as any;

describe('IRRCalculationService', () => {
  let service: IRRCalculationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IRRCalculationService(mockApi);
  });

  it('should initialize with default options', () => {
    const options = service.getOptions();
    
    expect(options.enableLogging).toBe(true);
    expect(options.cacheResults).toBe(true);
    expect(options.retryAttempts).toBe(1);
  });

  it('should normalize IRR dates correctly', () => {
    expect(service.normalizeIRRDate('2024-03')).toBe('2024-03-31');
    expect(service.normalizeIRRDate('2024-02')).toBe('2024-02-29');
    expect(service.normalizeIRRDate('2024-03-15')).toBe('2024-03-15');
  });

  it('should create service instances', () => {
    const service1 = createIRRCalculationService(mockApi);
    const service2 = createIRRCalculationService(mockApi, { enableLogging: false });
    
    expect(service1.getOptions().enableLogging).toBe(true);
    expect(service2.getOptions().enableLogging).toBe(false);
  });
});

export {}; 