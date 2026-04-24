//Test for SignIn component, verifying that the form renders correctly and that submitting the form with valid credentials makes the appropriate API call and navigates to the workspace page
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SignUp from '../pages/SignUp';
import { mockNavigate } from './routerMocks.js';

describe('SignUp', () => {
  it('renders the sign-up form', () => {
    render(<SignUp />);

    expect(screen.getByRole('heading', { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('submits the sign-up form', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Sign-up request sent successfully' }),
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<SignUp />);

    await user.type(screen.getByLabelText(/name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'jane@example.com',
          password: 'password123',
          fullName: 'Jane Doe',
        }),
      });
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
