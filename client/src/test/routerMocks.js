//Mock implementations for useNavigate, useLocation, and useParams hooks from react-router-dom
import { vi } from 'vitest';

export const mockNavigate = vi.fn();
export const mockLocation = {
  search: '',
};
export const mockParams = {};
