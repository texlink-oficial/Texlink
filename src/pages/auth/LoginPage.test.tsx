import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...props}>{children}</a>
  ),
}));

// Mock AuthContext
const mockLogin = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    isLoading: false,
    isAuthenticated: false,
  }),
}));

import LoginPage from './LoginPage';

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render email and password fields', () => {
    render(<LoginPage />);

    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('should render the submit button', () => {
    render(<LoginPage />);

    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('should render link to register page', () => {
    render(<LoginPage />);

    const link = screen.getByText('Cadastre-se');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/register');
  });

  it('should call login and navigate on successful submit', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(undefined);

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'password123');
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should display error message on login failure', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue({ response: { data: { message: 'Invalid credentials' } } });

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'wrong@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('should display generic error when no message provided', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue({});

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'x@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'pass');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('Erro ao fazer login')).toBeInTheDocument();
    });
  });

  it('should disable button while loading', async () => {
    const user = userEvent.setup();
    // Make login hang
    mockLogin.mockImplementation(() => new Promise(() => {}));

    render(<LoginPage />);

    const submitBtn = screen.getByRole('button', { name: /entrar/i });
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'pass');
    await user.click(submitBtn);

    await waitFor(() => {
      // After clicking, button text changes to spinner (no "Entrar"), so query by type=submit
      const buttons = screen.getAllByRole('button');
      const submit = buttons.find(b => b.getAttribute('type') === 'submit');
      expect(submit).toBeDisabled();
    });
  });
});
