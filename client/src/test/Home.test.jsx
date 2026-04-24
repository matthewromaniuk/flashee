import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import Home from '../pages/Home';
import { mockNavigate } from './routerMocks.js';

describe('Home', () => {
  it('renders the landing page and headline', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { name: /study smarter with flashee/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign up$/i })).toBeInTheDocument();
  });

  it('navigates to signup when the call to action is clicked', async () => {
    const user = userEvent.setup();

    render(<Home />);

    await user.click(screen.getByRole('button', { name: /^sign up for free$/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/signup');
  });

  it('navigates to signin when the sign in button is clicked', async () => {
    const user = userEvent.setup();

    render(<Home />);

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/signin');
  });

  it('navigates to signup when the sign up button is clicked', async () => {
    const user = userEvent.setup();

    render(<Home />);

    await user.click(screen.getByRole('button', { name: /^sign up$/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/signup');
  });
});
