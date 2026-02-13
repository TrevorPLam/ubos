// AI-META-BEGIN
// AI-META: Page component - profile.tsx
// OWNERSHIP: client/pages
// ENTRYPOINTS: app router
// DEPENDENCIES: react, components, hooks
// DANGER: Review form validation and API integration
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: npm run test:frontend
// AI-META-END

/**
 * Profile management page for authenticated users.
 *
 * This page handles:
 * - Profile information editing (name, email, phone, timezone)
 * - Avatar upload with preview and validation
 * - Password change with strength requirements
 * - Notification preferences management
 * - Working hours configuration
 * - Real-time form validation and feedback
 * - Mobile-responsive design with accessibility
 *
 * Requirements: 92.1, 92.2, 92.3, 92.4, 92.5
 * 2026 Best Practices: Clear visual hierarchy, mobile optimization, accessibility, micro-interactions
 */

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, 
  Camera, 
  Lock, 
  Mail, 
  Phone, 
  Clock, 
  Bell,
  CheckCircle2,
  AlertCircle,
  Save,
  Upload,
  Trash2,
  Shield,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { User as UserType } from "@shared/models/auth";

// Form validation schemas
const profileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  timezone: z.string().min(1, "Timezone is required"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(/[@$!%*?&]/, "Password must contain at least one special character (@$!%*?&)"),
  confirmPassword: z.string().min(1, "Password confirmation is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const workingHoursSchema = z.object({
  monday: z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }),
  tuesday: z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }),
  wednesday: z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }),
  thursday: z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }),
  friday: z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }),
  saturday: z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }),
  sunday: z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;
type WorkingHoursFormData = z.infer<typeof workingHoursSchema>;

// Timezone options
const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
];

// Time slots for working hours
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0");
  return `${hour}:00`;
});

// Days of the week
const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

// API functions
async function updateProfile(data: ProfileFormData) {
  const response = await fetch("/api/users/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update profile");
  }

  return response.json();
}

async function updatePassword(data: PasswordFormData) {
  const response = await fetch("/api/users/me/password", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update password");
  }

  return response.json();
}

async function updatePreferences(preferences: any) {
  const response = await fetch("/api/users/me/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(preferences),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update preferences");
  }

  return response.json();
}

async function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await fetch("/api/users/me/avatar", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to upload avatar");
  }

  return response.json();
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      timezone: user?.timezone || "UTC",
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Working hours form
  const workingHoursForm = useForm<WorkingHoursFormData>({
    resolver: zodResolver(workingHoursSchema),
    defaultValues: {
      monday: { enabled: true, start: "09:00", end: "17:00" },
      tuesday: { enabled: true, start: "09:00", end: "17:00" },
      wednesday: { enabled: true, start: "09:00", end: "17:00" },
      thursday: { enabled: true, start: "09:00", end: "17:00" },
      friday: { enabled: true, start: "09:00", end: "17:00" },
      saturday: { enabled: false, start: "09:00", end: "17:00" },
      sunday: { enabled: false, start: "09:00", end: "17:00" },
    },
  });

  // Update forms when user data changes
  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        timezone: user.timezone || "UTC",
      });
      setAvatarPreview(user.profileImageUrl || null);
    }
  }, [user, profileForm]);

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      toast({
        title: "Profile updated successfully!",
        description: "Your changes have been saved.",
      });
      queryClient.setQueryData(["/api/auth/user"], data);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: updatePassword,
    onSuccess: () => {
      toast({
        title: "Password updated successfully!",
        description: "Your password has been changed.",
      });
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: updatePreferences,
    onSuccess: () => {
      toast({
        title: "Preferences updated!",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (data) => {
      toast({
        title: "Avatar updated!",
        description: "Your profile picture has been updated.",
      });
      setAvatarPreview(data.profileImageUrl);
      setAvatarFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle avatar upload
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Avatar must be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (JPG, PNG)",
          variant: "destructive",
        });
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle profile submission
  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  // Handle password submission
  const onPasswordSubmit = (data: PasswordFormData) => {
    updatePasswordMutation.mutate(data);
  };

  // Handle preferences submission
  const onPreferencesSubmit = (preferences: any) => {
    updatePreferencesMutation.mutate(preferences);
  };

  // Handle working hours submission
  const onWorkingHoursSubmit = (data: WorkingHoursFormData) => {
    // This would be integrated with the preferences API
    updatePreferencesMutation.mutate({ workingHours: data });
  };

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your personal information and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="hours" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Working Hours
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and profile photo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt="Profile preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    type="file"
                    id="avatar"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    aria-label="Upload profile photo"
                  />
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => document.getElementById('avatar')?.click()}
                      disabled={uploadAvatarMutation.isPending}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadAvatarMutation.isPending ? "Uploading..." : "Change Photo"}
                    </Button>
                    {avatarFile && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview(user.profileImageUrl || null);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG up to 5MB. Recommended: 400x400px
                  </p>
                </div>
              </div>

              <Separator />

              {/* Profile Form */}
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your first name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your last name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="Enter your email" 
                            {...field} 
                            disabled
                          />
                        </FormControl>
                        <FormDescription>
                          Email changes require verification. Contact support to update your email.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your timezone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIMEZONES.map((tz) => (
                              <SelectItem key={tz} value={tz}>
                                {tz}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your password and security preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter your current password" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter your new password" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Password must be at least 8 characters with uppercase, lowercase, number, and special character.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Confirm your new password" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updatePasswordMutation.isPending}
                    >
                      {updatePasswordMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-2" />
                          Update Password
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Control how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: "email", label: "Email Notifications", description: "Receive email updates about your account activity" },
                { key: "push", label: "Push Notifications", description: "Receive browser push notifications" },
                { key: "sms", label: "SMS Notifications", description: "Receive text message alerts" },
                { key: "projectUpdates", label: "Project Updates", description: "Get notified about project changes" },
                { key: "taskReminders", label: "Task Reminders", description: "Receive reminders for upcoming tasks" },
                { key: "invoiceNotifications", label: "Invoice Notifications", description: "Get notified about invoice status changes" },
              ].map((preference) => (
                <div key={preference.key} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">{preference.label}</Label>
                    <p className="text-sm text-muted-foreground">{preference.description}</p>
                  </div>
                  <Switch
                    defaultChecked={user.notificationPreferences?.[preference.key as keyof typeof user.notificationPreferences] || false}
                    onCheckedChange={(checked) => {
                      onPreferencesSubmit({
                        ...user.notificationPreferences,
                        [preference.key]: checked,
                      });
                    }}
                    disabled={updatePreferencesMutation.isPending}
                  />
                </div>
              ))}

              <Separator />

              <div className="flex justify-end">
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Advanced Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Working Hours Tab */}
        <TabsContent value="hours">
          <Card>
            <CardHeader>
              <CardTitle>Working Hours</CardTitle>
              <CardDescription>Set your availability and working schedule</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...workingHoursForm}>
                <form onSubmit={workingHoursForm.handleSubmit(onWorkingHoursSubmit)} className="space-y-4">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.key} className="flex items-center gap-4">
                      <div className="w-24">
                        <Label className="text-sm font-medium">{day.label}</Label>
                      </div>
                      <FormField
                        control={workingHoursForm.control}
                        name={`${day.key}.enabled` as any}
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-2 items-center">
                        <FormField
                          control={workingHoursForm.control}
                          name={`${day.key}.start` as any}
                          render={({ field }) => (
                            <FormItem>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {TIME_SLOTS.map((time) => (
                                    <SelectItem key={time} value={time}>
                                      {time}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        <span className="text-muted-foreground">to</span>
                        <FormField
                          control={workingHoursForm.control}
                          name={`${day.key}.end` as any}
                          render={({ field }) => (
                            <FormItem>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {TIME_SLOTS.map((time) => (
                                    <SelectItem key={time} value={time}>
                                      {time}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}

                  <Separator />

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updatePreferencesMutation.isPending}
                    >
                      {updatePreferencesMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Working Hours
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
