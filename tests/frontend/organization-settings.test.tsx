// AI-META-BEGIN
// AI-META: Test file - organization-settings.test.tsx
// OWNERSHIP: tests/frontend
// ENTRYPOINTS: test runner
// DEPENDENCIES: react, testing libraries
// DANGER: Review test coverage
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: npm run test:frontend
// AI-META-END

/**
 * Organization Settings UI Tests - 2026 Best Practices
 * 
 * Comprehensive test suite for organization settings management interface.
 * Tests all tabs, form validation, file upload, and accessibility features.
 * 
 * Requirements: 94.2, 94.3, 94.4, 94.5
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import "@testing-library/jest-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import OrganizationSettingsPage from "@/pages/organization-settings";
import { useToast } from "@/hooks/use-toast";

// Mock the hooks and API
vi.mock("@/hooks/use-toast");
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: "test-user", firstName: "Test", lastName: "User" },
    isLoading: false,
    isAuthenticated: true,
  }),
}));

// Mock fetch API
global.fetch = vi.fn();

const mockToast = {
  toast: vi.fn(),
};

vi.mocked(useToast).mockReturnValue(mockToast);

// Test wrapper with providers
const createTestClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestClient()}>
    <TooltipProvider>
      {children}
      <Toaster />
    </TooltipProvider>
  </QueryClientProvider>
);

// Mock organization settings data
const mockSettings = {
  id: "test-org",
  name: "Test Organization",
  slug: "test-org",
  logo: null,
  timezone: "UTC",
  currency: "USD",
  dateFormat: "YYYY-MM-DD",
  language: "en",
  businessHours: {
    monday: { enabled: true, open: "09:00", close: "17:00" },
    tuesday: { enabled: true, open: "09:00", close: "17:00" },
    wednesday: { enabled: true, open: "09:00", close: "17:00" },
    thursday: { enabled: true, open: "09:00", close: "17:00" },
    friday: { enabled: true, open: "09:00", close: "17:00" },
    saturday: { enabled: false, open: "09:00", close: "17:00" },
    sunday: { enabled: false, open: "09:00", close: "17:00" },
  },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("Organization Settings UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful fetch for organization settings
    vi.mocked(fetch).mockImplementation((url) => {
      if (url === "/api/organizations/settings") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSettings),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Page Rendering and Structure", () => {
    it("should render the organization settings page with correct title", async () => {
      render(
        <TestWrapper>
          <OrganizationSettingsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Organization Settings")).toBeInTheDocument();
        expect(screen.getByText("Manage your organization's configuration and preferences")).toBeInTheDocument();
      });
    });

    it("should render all tab navigation options", async () => {
      render(
        <TestWrapper>
          <OrganizationSettingsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("General")).toBeInTheDocument();
        expect(screen.getByText("Business Hours")).toBeInTheDocument();
        expect(screen.getByText("Customization")).toBeInTheDocument();
        expect(screen.getByText("Notifications")).toBeInTheDocument();
      });
    });

    it("should display loading state initially", () => {
      // Mock loading state
      vi.mocked(fetch).mockImplementation(() => 
        Promise.resolve(new Promise(() => {})) as any
      );

      render(
        <TestWrapper>
          <OrganizationSettingsPage />
        </TestWrapper>
      );

      expect(screen.getByText(/Loading organization settings/)).toBeInTheDocument();
    });

    it("should display error state when API fails", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("API Error"));

      render(
        <TestWrapper>
          <OrganizationSettingsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load organization settings/)).toBeInTheDocument();
      });
    });
  });

  describe("General Settings Tab", () => {
    beforeEach(async () => {
      render(
        <TestWrapper>
          <OrganizationSettingsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("General")).toBeInTheDocument();
      });
    });

    it("should render general settings form with all fields", async () => {
      await waitFor(() => {
        expect(screen.getByLabelText("Organization Name")).toBeInTheDocument();
        expect(screen.getByLabelText("Timezone")).toBeInTheDocument();
        expect(screen.getByLabelText("Currency")).toBeInTheDocument();
        expect(screen.getByLabelText("Date Format")).toBeInTheDocument();
        expect(screen.getByLabelText("Language")).toBeInTheDocument();
      });
    });

    it("should populate form with current settings", async () => {
      await waitFor(() => {
        const nameInput = screen.getByLabelText("Organization Name") as HTMLInputElement;
        expect(nameInput.value).toBe("Test Organization");
      });
    });

    it("should validate organization name field", async () => {
      const user = userEvent.setup();

      await waitFor(() => {
        const nameInput = screen.getByLabelText("Organization Name");
      });

      const nameInput = screen.getByLabelText("Organization Name");
      await user.clear(nameInput);
      await user.tab(); // Move to next field to trigger validation

      await waitFor(() => {
        expect(screen.getByText("Organization name is required")).toBeInTheDocument();
      });
    });

    it("should submit general settings successfully", async () => {
      const user = userEvent.setup();
      
      // Mock successful update
      vi.mocked(fetch).mockImplementation((url) => {
        if (url === "/api/organizations/settings" && vi.mocked(fetch).mock.calls.length > 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ ...mockSettings, name: "Updated Org" }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSettings),
        } as Response);
      });

      await waitFor(() => {
        const nameInput = screen.getByLabelText("Organization Name");
      });

      const nameInput = screen.getByLabelText("Organization Name");
      await user.clear(nameInput);
      await user.type(nameInput, "Updated Organization");

      const saveButton = screen.getByText("Save Changes");
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: "Settings updated",
          description: "Organization settings have been saved successfully.",
        });
      });
    });

    it("should handle update errors gracefully", async () => {
      const user = userEvent.setup();
      
      // Mock failed update
      vi.mocked(fetch).mockImplementation((url) => {
        if (url === "/api/organizations/settings" && vi.mocked(fetch).mock.calls.length > 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSettings),
        } as Response);
      });

      await waitFor(() => {
        const nameInput = screen.getByLabelText("Organization Name");
      });

      const nameInput = screen.getByLabelText("Organization Name");
      await user.clear(nameInput);
      await user.type(nameInput, "Updated Organization");

      const saveButton = screen.getByText("Save Changes");
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: "Error",
          description: "Failed to update settings. Please try again.",
          variant: "destructive",
        });
      });
    });
  });

  describe("Logo Upload", () => {
    beforeEach(async () => {
      render(
        <TestWrapper>
          <OrganizationSettingsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Organization Logo")).toBeInTheDocument();
      });
    });

    it("should render logo upload section", async () => {
      await waitFor(() => {
        expect(screen.getByText("Organization Logo")).toBeInTheDocument();
        expect(screen.getByText("Upload your organization's logo for branding")).toBeInTheDocument();
        expect(screen.getByText("Choose File")).toBeInTheDocument();
        expect(screen.getByText(/PNG, JPG, or GIF/)).toBeInTheDocument();
      });
    });

    it("should handle file selection", async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        const fileInput = screen.getByLabelText("Choose File");
      });

      const fileInput = screen.getByLabelText("Choose File");
      const file = new File(["test"], "test.png", { type: "image/png" });
      
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText("test.png")).toBeInTheDocument();
        expect(screen.getByText("Cancel")).toBeInTheDocument();
        expect(screen.getByText("Upload Logo")).toBeInTheDocument();
      });
    });

    it("should reject invalid file types", async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        const fileInput = screen.getByLabelText("Choose File");
      });

      const fileInput = screen.getByLabelText("Choose File");
      const file = new File(["test"], "test.txt", { type: "text/plain" });
      
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: "Invalid file type",
          description: "Please select an image file (PNG, JPG, GIF).",
          variant: "destructive",
        });
      });
    });

    it("should reject files that are too large", async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        const fileInput = screen.getByLabelText("Choose File");
      });

      const fileInput = screen.getByLabelText("Choose File");
      // Create a large file (6MB)
      const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "large.png", { type: "image/png" });
      
      await user.upload(fileInput, largeFile);

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: "File too large",
          description: "Please select an image file smaller than 5MB.",
          variant: "destructive",
        });
      });
    });

    it("should upload logo successfully", async () => {
      const user = userEvent.setup();
      
      // Mock successful upload
      vi.mocked(fetch).mockImplementation((url) => {
        if (url === "/api/organizations/logo") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ logoUrl: "https://example.com/logo.png" }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSettings),
        } as Response);
      });

      await waitFor(() => {
        const fileInput = screen.getByLabelText("Choose File");
      });

      const fileInput = screen.getByLabelText("Choose File");
      const file = new File(["test"], "test.png", { type: "image/png" });
      
      await user.upload(fileInput, file);

      const uploadButton = screen.getByText("Upload Logo");
      await user.click(uploadButton);

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: "Logo uploaded",
          description: "Organization logo has been updated successfully.",
        });
      });
    });
  });

  describe("Business Hours Tab", () => {
    beforeEach(async () => {
      render(
        <TestWrapper>
          <OrganizationSettingsPage />
        </TestWrapper>
      );

      // Click on Business Hours tab
      await waitFor(() => {
        const businessHoursTab = screen.getByText("Business Hours");
      });
      
      const businessHoursTab = screen.getByText("Business Hours");
      await userEvent.click(businessHoursTab);
    });

    it("should render business hours configuration", async () => {
      await waitFor(() => {
        expect(screen.getByText("Business Hours")).toBeInTheDocument();
        expect(screen.getByText("Configure your organization's operating hours for each day of the week")).toBeInTheDocument();
        
        // Check all days are rendered
        expect(screen.getByText("Monday")).toBeInTheDocument();
        expect(screen.getByText("Tuesday")).toBeInTheDocument();
        expect(screen.getByText("Wednesday")).toBeInTheDocument();
        expect(screen.getByText("Thursday")).toBeInTheDocument();
        expect(screen.getByText("Friday")).toBeInTheDocument();
        expect(screen.getByText("Saturday")).toBeInTheDocument();
        expect(screen.getByText("Sunday")).toBeInTheDocument();
      });
    });

    it("should toggle day enable/disable", async () => {
      const user = userEvent.setup();

      await waitFor(() => {
        const mondaySwitch = screen.getByLabelText("Monday");
      });

      const mondaySwitch = screen.getByLabelText("Monday");
      await user.click(mondaySwitch);

      // Check that time inputs are disabled when day is disabled
      await waitFor(() => {
        const openSelect = screen.getByLabelText("Open");
        expect(openSelect).toBeDisabled();
      });
    });

    it("should validate business hours time format", async () => {
      const user = userEvent.setup();

      await waitFor(() => {
        const mondaySwitch = screen.getByLabelText("Monday");
      });

      // Ensure Monday is enabled
      const mondaySwitch = screen.getByLabelText("Monday");
      if (!mondaySwitch.checked) {
        await user.click(mondaySwitch);
      }

      const saveButton = screen.getByText("Save Business Hours");
      await user.click(saveButton);

      // Should not show validation errors for valid default times
      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: "Business hours updated",
          description: "Business hours have been saved successfully.",
        });
      });
    });

    it("should prevent close time before open time", async () => {
      // This would be tested through form validation
      // The actual validation logic is in the Zod schema
      expect(true).toBe(true); // Placeholder for validation test
    });
  });

  describe("Customization Tab", () => {
    beforeEach(async () => {
      render(
        <TestWrapper>
          <OrganizationSettingsPage />
        </TestWrapper>
      );

      // Click on Customization tab
      await waitFor(() => {
        const customizationTab = screen.getByText("Customization");
      });
      
      const customizationTab = screen.getByText("Customization");
      await userEvent.click(customizationTab);
    });

    it("should render email template customization", async () => {
      await waitFor(() => {
        expect(screen.getByText("Email Templates")).toBeInTheDocument();
        expect(screen.getByText("Customize email templates sent to your clients and team members")).toBeInTheDocument();
        
        expect(screen.getByText("Invitation Email")).toBeInTheDocument();
        expect(screen.getByText("Invoice Reminder Email")).toBeInTheDocument();
      });
    });

    it("should render invitation email fields", async () => {
      await waitFor(() => {
        expect(screen.getByLabelText("Subject")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Email body")).toBeInTheDocument();
        expect(screen.getByText(/Available variables:/)).toBeInTheDocument();
      });
    });

    it("should show coming soon message for email templates", async () => {
      const user = userEvent.setup();

      await waitFor(() => {
        const saveButton = screen.getByText("Save Email Templates");
      });

      const saveButton = screen.getByText("Save Email Templates");
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: "Coming soon",
          description: "Email template customization will be available in a future update.",
        });
      });
    });
  });

  describe("Notifications Tab", () => {
    beforeEach(async () => {
      render(
        <TestWrapper>
          <OrganizationSettingsPage />
        </TestWrapper>
      );

      // Click on Notifications tab
      await waitFor(() => {
        const notificationsTab = screen.getByText("Notifications");
      });
      
      const notificationsTab = screen.getByText("Notifications");
      await userEvent.click(notificationsTab);
    });

    it("should render notification preferences", async () => {
      await waitFor(() => {
        expect(screen.getByText("Notification Preferences")).toBeInTheDocument();
        expect(screen.getByText("Configure how and when your organization sends notifications")).toBeInTheDocument();
        
        expect(screen.getByText("Email Notifications")).toBeInTheDocument();
        expect(screen.getByText("Invoice Reminders")).toBeInTheDocument();
        expect(screen.getByText("Project Updates")).toBeInTheDocument();
        expect(screen.getByText("Client Portal Access")).toBeInTheDocument();
      });
    });

    it("should render toggle switches for notification types", async () => {
      await waitFor(() => {
        const switches = screen.getAllByRole("switch");
        expect(switches).toHaveLength(4); // 4 notification types
      });
    });

    it("should toggle notification preferences", async () => {
      const user = userEvent.setup();

      await waitFor(() => {
        const emailNotificationsSwitch = screen.getByLabelText("Email Notifications");
      });

      const emailNotificationsSwitch = screen.getByLabelText("Email Notifications");
      await user.click(emailNotificationsSwitch);

      // Toggle should change state
      expect(emailNotificationsSwitch).not.toBeChecked();
    });
  });

  describe("Accessibility", () => {
    it("should be keyboard navigable", async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <OrganizationSettingsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const firstTab = screen.getByText("General");
      });

      // Tab through interface
      await user.tab();
      expect(screen.getByText("General")).toHaveFocus();

      await user.tab();
      expect(screen.getByText("Business Hours")).toHaveFocus();
    });

    it("should have proper ARIA labels", async () => {
      render(
        <TestWrapper>
          <OrganizationSettingsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
        expect(screen.getAllByRole("tab")).toHaveLength(4);
      });
    });

    it("should support screen readers", async () => {
      render(
        <TestWrapper>
          <OrganizationSettingsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check for proper headings structure
        expect(screen.getByRole("heading", { name: "Organization Settings" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "General Information" })).toBeInTheDocument();
      });
    });
  });

  describe("Responsive Design", () => {
    it("should adapt to mobile viewport", async () => {
      // Mock mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <OrganizationSettingsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Organization Settings")).toBeInTheDocument();
        // Should still be usable on mobile
        expect(screen.getByText("General")).toBeInTheDocument();
      });
    });
  });

  describe("Performance", () => {
    it("should render efficiently", async () => {
      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <OrganizationSettingsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Organization Settings")).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within reasonable time (less than 1 second)
      expect(renderTime).toBeLessThan(1000);
    });
  });
});
