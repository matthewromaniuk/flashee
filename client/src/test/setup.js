import '@testing-library/jest-dom';
import { afterEach, beforeEach, vi } from 'vitest';
import { mockLocation, mockNavigate, mockParams } from './routerMocks.js';

const createMatchMediaMock = () => vi.fn(() => ({
  matches: false,
  media: '',
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

beforeEach(() => {
  vi.stubGlobal('matchMedia', createMatchMediaMock());
  mockLocation.search = '';
  Object.keys(mockParams).forEach((key) => {
    delete mockParams[key];
  });
});

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
  useParams: () => mockParams,
}));

afterEach(() => {
  mockNavigate.mockReset();
  vi.unstubAllGlobals();
});
