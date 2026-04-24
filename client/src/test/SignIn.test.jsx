//Test for SignIn component, verifying that form renders correctly and that submitting with valid credentials makes the appropriate API call
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SignIn from '../pages/SignIn';
import { mockNavigate } from './routerMocks.js';

describe('SignIn', () => {
  it('renders the sign-in form', () => {
    render(<SignIn />);

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('submits the sign-in form and navigates to the workspace', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ session: {}, user: {} }),
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<SignIn />);

    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'jane@example.com',
          password: 'password123',
        }),
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/workspace');
    });
  });
});
