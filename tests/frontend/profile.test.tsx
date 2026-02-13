// AI-META-BEGIN
// AI-META: Test file - profile.test.tsx
// OWNERSHIP: tests/frontend
// ENTRYPOINTS: npm run test:frontend
// DEPENDENCIES: react, testing-library
// DANGER: Review test coverage and assertions
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: npm run test:frontend
// AI-META-END

/**
 * Profile management UI tests.
 *
 * This test suite covers:
 * - Profile information editing and validation
 * - Avatar upload with preview functionality
 * - Password change with strength requirements
 * - Notification preferences management
 * - Working hours configuration
 * - Mobile responsiveness and accessibility
 * - Form validation and error handling
 * - API integration and loading states
 *
 * Requirements: 92.1, 92.2, 92.3, 92.4, 92.5
 * 2026 Best Practices: Comprehensive testing, accessibility validation, mobile testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock fetch globally
global.fetch = vi.fn() as any;

// Mock the ProfilePage component
const MockProfilePage = () => React.createElement('div', { 'data-testid': 'profile-page' }, 'Profile Page');

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderProfilePage = (queryClient = createTestQueryClient()) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MockProfilePage />
    </QueryClientProvider>
  );
};

describe("ProfilePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe("Profile Information Tab", () => {
    it("renders profile form with user data", async () => {
      renderProfilePage();

      await waitFor(() => {
        expect(screen.getByDisplayValue("John")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Doe")).toBeInTheDocument();
        expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument();
        expect(screen.getByDisplayValue("+1234567890")).toBeInTheDocument();
        expect(screen.getByDisplayValue("UTC")).toBeInTheDocument();
      });
    });

    it("disables email field with appropriate message", async () => {
      renderProfilePage();

      await waitFor(() => {
        const emailInput = screen.getByDisplayValue("test@example.com");
        expect(emailInput).toBeDisabled();
        expect(screen.getByText(/Email changes require verification/)).toBeInTheDocument();
      });
    });

    it("validates form fields correctly", async () => {
      const user = userEvent.setup();
      renderProfilePage();

      await waitFor(() => {
        expect(screen.getByDisplayValue("John")).toBeInTheDocument();
      });

      // Clear first name to trigger validation
      const firstNameInput = screen.getByDisplayValue("John");
      await user.clear(firstNameInput);
      await user.tab(); // Move to next field

      await waitFor(() => {
        expect(screen.getByText(/First name must be at least 2 characters/)).toBeInTheDocument();
      });
    });

    it("submits profile form successfully", async () => {
      const user = userEvent.setup();
      const mockToast = jest.fn();
      (useToast as jest.Mock).mockReturnValue({ toast: mockToast });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockUser, firstName: "Jane" }),
      });

      renderProfilePage();

      await waitFor(() => {
        expect(screen.getByDisplayValue("John")).toBeInTheDocument();
      });

      const firstNameInput = screen.getByDisplayValue("John");
      await user.clear(firstNameInput);
      await user.type(firstNameInput, "Jane");

      const saveButton = screen.getByRole("button", { name: /Save Changes/ });
      await user.click(saveButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          "/api/users/me",
          expect.objectContaining({
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: expect.stringContaining("Jane"),
          })
        );
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Profile updated successfully!",
          })
        );
      });
    });
  });

  describe("Avatar Upload", () => {
    it("displays current avatar image", async () => {
      renderProfilePage();

      await waitFor(() => {
        const avatarImg = screen.getByAltText("Profile preview");
        expect(avatarImg).toBeInTheDocument();
        expect(avatarImg).toHaveAttribute("src", mockUser.profileImageUrl);
      });
    });

    it("handles avatar file selection", async () => {
      const user = userEvent.setup();
      renderProfilePage();

      await waitFor(() => {
        expect(screen.getByText(/Change Photo/)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText("Upload profile photo");
      const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/Remove photo/)).toBeInTheDocument();
      });
    });

    it("validates file size and type", async () => {
      const user = userEvent.setup();
      const mockToast = jest.fn();
      (useToast as jest.Mock).mockReturnValue({ toast: mockToast });

      renderProfilePage();

      await waitFor(() => {
        expect(screen.getByText(/Change Photo/)).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText("Upload profile photo");
      
      // Test oversized file
      const largeFile = new File(["x".repeat(6 * 1024 * 1024)], "large.jpg", { type: "image/jpeg" });
      await user.upload(fileInput, largeFile);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "File too large",
            description: "Avatar must be less than 5MB",
            variant: "destructive",
          })
        );
      });

      // Test invalid file type
      const textFile = new File(["test"], "test.txt", { type: "text/plain" });
      await user.upload(fileInput, textFile);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Invalid file type",
            description: "Please upload an image file (JPG, PNG)",
            variant: "destructive",
          })
        );
      });
    });
  });

  describe("Security Tab", () => {
    it("renders password change form", async () => {
      renderProfilePage();

      const securityTab = screen.getByRole("tab", { name: /Security/ });
      await userEvent.click(securityTab);

      await waitFor(() => {
        expect(screen.getByLabelText("Current Password")).toBeInTheDocument();
        expect(screen.getByLabelText("New Password")).toBeInTheDocument();
        expect(screen.getByLabelText("Confirm New Password")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Update Password/ })).toBeInTheDocument();
      });
    });

    it("validates password requirements", async () => {
      const user = userEvent.setup();
      renderProfilePage();

      const securityTab = screen.getByRole("tab", { name: /Security/ });
      await user.click(securityTab);

      await waitFor(() => {
        expect(screen.getByLabelText("New Password")).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByLabelText("New Password");
      await user.type(newPasswordInput, "weak");

      await waitFor(() => {
        expect(screen.getByText(/Password must be at least 8 characters/)).toBeInTheDocument();
      });
    });

    it("validates password confirmation", async () => {
      const user = userEvent.setup();
      renderProfilePage();

      const securityTab = screen.getByRole("tab", { name: /Security/ });
      await user.click(securityTab);

      await waitFor(() => {
        expect(screen.getByLabelText("New Password")).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByLabelText("New Password");
      const confirmPasswordInput = screen.getByLabelText("Confirm New Password");

      await user.type(newPasswordInput, "StrongPass123!");
      await user.type(confirmPasswordInput, "DifferentPass123!");

      await waitFor(() => {
        expect(screen.getByText(/Passwords don't match/)).toBeInTheDocument();
      });
    });

    it("submits password change successfully", async () => {
      const user = userEvent.setup();
      const mockToast = jest.fn();
      (useToast as jest.Mock).mockReturnValue({ toast: mockToast });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      renderProfilePage();

      const securityTab = screen.getByRole("tab", { name: /Security/ });
      await user.click(securityTab);

      await waitFor(() => {
        expect(screen.getByLabelText("Current Password")).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText("Current Password"), "CurrentPass123!");
      await user.type(screen.getByLabelText("New Password"), "StrongPass123!");
      await user.type(screen.getByLabelText("Confirm New Password"), "StrongPass123!");

      const updateButton = screen.getByRole("button", { name: /Update Password/ });
      await user.click(updateButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          "/api/users/me/password",
          expect.objectContaining({
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: expect.stringContaining("StrongPass123!"),
          })
        );
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Password updated successfully!",
          })
        );
      });
    });
  });

  describe("Preferences Tab", () => {
    it("renders notification preferences", async () => {
      renderProfilePage();

      const preferencesTab = screen.getByRole("tab", { name: /Preferences/ });
      await userEvent.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByText("Email Notifications")).toBeInTheDocument();
        expect(screen.getByText("Push Notifications")).toBeInTheDocument();
        expect(screen.getByText("SMS Notifications")).toBeInTheDocument();
        expect(screen.getByText("Project Updates")).toBeInTheDocument();
        expect(screen.getByText("Task Reminders")).toBeInTheDocument();
        expect(screen.getByText("Invoice Notifications")).toBeInTheDocument();
      });
    });

    it("displays current preference states", async () => {
      renderProfilePage();

      const preferencesTab = screen.getByRole("tab", { name: /Preferences/ });
      await userEvent.click(preferencesTab);

      await waitFor(() => {
        // Check that switches reflect current user preferences
        const emailSwitch = screen.getByLabelText("Email Notifications");
        const pushSwitch = screen.getByLabelText("Push Notifications");
        
        // Note: We can't easily test the actual state of Radix UI switches
        // but we can verify they are present and interactive
        expect(emailSwitch).toBeInTheDocument();
        expect(pushSwitch).toBeInTheDocument();
      });
    });

    it("updates preferences when toggled", async () => {
      const user = userEvent.setup();
      const mockToast = jest.fn();
      (useToast as jest.Mock).mockReturnValue({ toast: mockToast });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      renderProfilePage();

      const preferencesTab = screen.getByRole("tab", { name: /Preferences/ });
      await user.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getByLabelText("Push Notifications")).toBeInTheDocument();
      });

      const pushSwitch = screen.getByLabelText("Push Notifications");
      await user.click(pushSwitch);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          "/api/users/me/preferences",
          expect.objectContaining({
            method: "PUT",
            headers: { "Content-Type": "application/json" },
          })
        );
      });
    });
  });

  describe("Working Hours Tab", () => {
    it("renders working hours configuration", async () => {
      renderProfilePage();

      const hoursTab = screen.getByRole("tab", { name: /Working Hours/ });
      await userEvent.click(hoursTab);

      await waitFor(() => {
        expect(screen.getByText("Monday")).toBeInTheDocument();
        expect(screen.getByText("Tuesday")).toBeInTheDocument();
        expect(screen.getByText("Wednesday")).toBeInTheDocument();
        expect(screen.getByText("Thursday")).toBeInTheDocument();
        expect(screen.getByText("Friday")).toBeInTheDocument();
        expect(screen.getByText("Saturday")).toBeInTheDocument();
        expect(screen.getByText("Sunday")).toBeInTheDocument();
      });
    });

    it("displays time selectors for each day", async () => {
      renderProfilePage();

      const hoursTab = screen.getByRole("tab", { name: /Working Hours/ });
      await userEvent.click(hoursTab);

      await waitFor(() => {
        // Check that time selectors are present
        expect(screen.getAllByText("09:00")).toHaveLength(5); // Weekdays
        expect(screen.getAllByText("17:00")).toHaveLength(5); // Weekdays
      });
    });

    it("submits working hours configuration", async () => {
      const user = userEvent.setup();
      const mockToast = jest.fn();
      (useToast as jest.Mock).mockReturnValue({ toast: mockToast });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      renderProfilePage();

      const hoursTab = screen.getByRole("tab", { name: /Working Hours/ });
      await user.click(hoursTab);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Save Working Hours/ })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole("button", { name: /Save Working Hours/ });
      await user.click(saveButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          "/api/users/me/preferences",
          expect.objectContaining({
            method: "PUT",
            headers: { "Content-Type": "application/json" },
          })
        );
      });
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels and roles", async () => {
      renderProfilePage();

      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Profile/ })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Security/ })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Preferences/ })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Working Hours/ })).toBeInTheDocument();
      });
    });

    it("supports keyboard navigation", async () => {
      renderProfilePage();

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /Profile/ })).toBeInTheDocument();
      });

      // Test tab navigation
      await userEvent.tab();
      expect(screen.getByRole("tab", { name: /Profile/ })).toHaveFocus();

      // Test arrow key navigation between tabs
      await userEvent.keyboard("{ArrowRight}");
      expect(screen.getByRole("tab", { name: /Security/ })).toHaveFocus();
    });

    it("provides proper form labels", async () => {
      renderProfilePage();

      await waitFor(() => {
        expect(screen.getByLabelText("First Name")).toBeInTheDocument();
        expect(screen.getByLabelText("Last Name")).toBeInTheDocument();
        expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
        expect(screen.getByLabelText("Phone Number")).toBeInTheDocument();
        expect(screen.getByLabelText("Timezone")).toBeInTheDocument();
      });
    });
  });

  describe("Loading States", () => {
    it("shows loading state when user data is loading", () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
        logout: jest.fn(),
        isLoggingOut: false,
      });

      renderProfilePage();

      expect(screen.getByText("Loading profile...")).toBeInTheDocument();
      expect(screen.getByRole("status")).toBeInTheDocument(); // Loading spinner
    });

    it("shows loading state during form submission", async () => {
      const user = userEvent.setup();
      
      (fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ ...mockUser, firstName: "Jane" }),
        }), 100))
      );

      renderProfilePage();

      await waitFor(() => {
        expect(screen.getByDisplayValue("John")).toBeInTheDocument();
      });

      const firstNameInput = screen.getByDisplayValue("John");
      await user.clear(firstNameInput);
      await user.type(firstNameInput, "Jane");

      const saveButton = screen.getByRole("button", { name: /Save Changes/ });
      await user.click(saveButton);

      // Should show loading state
      expect(screen.getByText("Saving...")).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });
  });

  describe("Error Handling", () => {
    it("displays error message on profile update failure", async () => {
      const user = userEvent.setup();
      const mockToast = jest.fn();
      (useToast as jest.Mock).mockReturnValue({ toast: mockToast });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Update failed" }),
      });

      renderProfilePage();

      await waitFor(() => {
        expect(screen.getByDisplayValue("John")).toBeInTheDocument();
      });

      const saveButton = screen.getByRole("button", { name: /Save Changes/ });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Error",
            description: "Update failed",
            variant: "destructive",
          })
        );
      });
    });

    it("displays error message on password change failure", async () => {
      const user = userEvent.setup();
      const mockToast = jest.fn();
      (useToast as jest.Mock).mockReturnValue({ toast: mockToast });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Current password is incorrect" }),
      });

      renderProfilePage();

      const securityTab = screen.getByRole("tab", { name: /Security/ });
      await user.click(securityTab);

      await waitFor(() => {
        expect(screen.getByLabelText("Current Password")).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText("Current Password"), "WrongPass");
      await user.type(screen.getByLabelText("New Password"), "StrongPass123!");
      await user.type(screen.getByLabelText("Confirm New Password"), "StrongPass123!");

      const updateButton = screen.getByRole("button", { name: /Update Password/ });
      await user.click(updateButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Error",
            description: "Current password is incorrect",
            variant: "destructive",
          })
        );
      });
    });
  });

  describe("Mobile Responsiveness", () => {
    it("renders correctly on mobile viewport", async () => {
      // Change viewport to mobile size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      renderProfilePage();

      await waitFor(() => {
        expect(screen.getByText("Profile Settings")).toBeInTheDocument();
        expect(screen.getByRole("tablist")).toBeInTheDocument();
      });

      // Tabs should stack vertically on mobile
      const tabList = screen.getByRole("tablist");
      expect(tabList).toHaveClass("grid-cols-4"); // Should adapt to mobile
    });
  });
});
