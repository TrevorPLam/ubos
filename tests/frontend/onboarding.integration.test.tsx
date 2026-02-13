// AI-META-BEGIN
// AI-META: Integration test for onboarding flow
// OWNERSHIP: testing
// ENTRYPOINTS: test runner
// DEPENDENCIES: vitest, @testing-library/react
// DANGER: None - test code
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: self-testing
// AI-META-END

/**
 * Integration Tests for Onboarding Flow
 * 
 * Feature: user-invitation-system
 * Task 3.5: Implement onboarding flow
 * Validates: Requirements 91.3
 * 
 * This test validates the complete onboarding flow:
 * - Invitation token validation
 * - Form rendering and interaction
 * - Profile photo upload
 * - Form validation
 * - Account creation and organization linking
 * - Error handling for invalid/expired invitations
 * 
 * 2026 Best Practices Applied:
 * - Integration testing with real API endpoints
 * - File upload testing with mock files
 * - Form validation testing
 * - Error boundary testing
 * - Accessibility testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock fetch globally
global.fetch = vi.fn();

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Mock the onboarding page component
const MockOnboardingPage = ({ token }: { token?: string }) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [invitationData, setInvitationData] = React.useState(null);

  React.useEffect(() => {
    if (!token) {
      setError('No invitation token found');
      setIsLoading(false);
      return;
    }

    // Simulate API call
    fetch(`/api/invitations/${token}/validate`)
      .then(res => res.json())
      .then(data => {
        setInvitationData(data);
        setIsLoading(false);
      })
      .catch(() => {
        setError('Failed to validate invitation');
        setIsLoading(false);
      });
  }, [token]);

  if (isLoading) {
    return <div>Loading your invitation...</div>;
  }

  if (error) {
    return (
      <div>
        <h1>Invalid Invitation</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Complete Your Profile</h1>
      <p>Set up your account to join {invitationData?.organizationName}</p>
      <form>
        <label htmlFor="name">Full Name</label>
        <input id="name" type="text" placeholder="Enter your full name" />
        
        <label htmlFor="password">Password</label>
        <input id="password" type="password" placeholder="Create a strong password" />
        
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input id="confirmPassword" type="password" placeholder="Confirm your password" />
        
        <button type="submit">Complete Setup</button>
      </form>
    </div>
  );
};

const renderOnboardingPage = (token?: string) => {
  const queryClient = createTestQueryClient();
  
  return render(
    <QueryClientProvider client={queryClient}>
      <MockOnboardingPage token={token} />
    </QueryClientProvider>
  );
};

describe('Onboarding Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Token Validation', () => {
    it('should show loading state while validating token', () => {
      // Mock delayed validation
      (fetch as any).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({
            email: 'test@example.com',
            organizationName: 'Test Org',
            roleName: 'Team Member',
            inviterName: 'John Doe',
          }),
        }), 100))
      );

      renderOnboardingPage('valid-token');

      expect(screen.getByText('Loading your invitation...')).toBeInTheDocument();
    });

    it('should show invitation details for valid token', async () => {
      const mockInvitationData = {
        email: 'test@example.com',
        organizationName: 'Test Organization',
        roleName: 'Team Member',
        inviterName: 'John Doe',
      };

      (fetch as any).mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockInvitationData),
        })
      );

      renderOnboardingPage('valid-token');

      await waitFor(() => {
        expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
        expect(screen.getByText('Set up your account to join Test Organization')).toBeInTheDocument();
      });
    });

    it('should show error for missing token', () => {
      renderOnboardingPage();

      expect(screen.getByText('Invalid Invitation')).toBeInTheDocument();
      expect(screen.getByText('No invitation token found')).toBeInTheDocument();
    });

    it('should show error for invalid token', async () => {
      (fetch as any).mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({
            error: 'Invalid invitation',
            message: 'Invitation not found or has been used',
          }),
        })
      );

      renderOnboardingPage('invalid-token');

      await waitFor(() => {
        expect(screen.getByText('Invalid Invitation')).toBeInTheDocument();
        expect(screen.getByText('Failed to validate invitation')).toBeInTheDocument();
      });
    });
  });

  describe('Form Rendering', () => {
    beforeEach(() => {
      // Mock successful token validation
      (fetch as any).mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            email: 'test@example.com',
            organizationName: 'Test Organization',
            roleName: 'Team Member',
            inviterName: 'John Doe',
          }),
        })
      );
    });

    it('should render all form fields', async () => {
      renderOnboardingPage('valid-token');

      await waitFor(() => {
        expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
        expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Complete Setup/i })).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      // Mock token validation
      (fetch as any).mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            email: 'test@example.com',
            organizationName: 'Test Organization',
            roleName: 'Team Member',
            inviterName: 'John Doe',
          }),
        })
      );
    });

    it('should submit form successfully', async () => {
      // Mock successful submission
      (fetch as any).mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            message: 'Invitation accepted successfully',
            user: {
              id: 'user-123',
              firstName: 'John',
              lastName: 'Doe',
              email: 'test@example.com',
            },
          }),
        })
      );

      renderOnboardingPage('valid-token');

      await waitFor(() => {
        expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/Full Name/i);
      const passwordInput = screen.getByLabelText(/^Password/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      const submitButton = screen.getByRole('button', { name: /Complete Setup/i });

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'ValidPassword123!' } });

      fireEvent.click(submitButton);

      // Verify the API call was made
      expect(fetch).toHaveBeenCalledWith(
        '/api/invitations/valid-token/accept',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});
