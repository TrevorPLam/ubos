// AI-META-BEGIN
// AI-META: Page component - organization-settings.tsx
// OWNERSHIP: client/pages
// ENTRYPOINTS: app router
// DEPENDENCIES: react, components, hooks
// DANGER: Review form validation and API integration
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: npm run test:frontend
// AI-META-END

/**
 * Organization settings page for administrators.
 *
 * This page handles comprehensive organization management:
 * - General settings (name, timezone, currency, date format, language)
 * - Business hours configuration with day-by-day scheduling
 * - Logo upload with preview and validation
 * - Email template customization
 * - Real-time form validation and feedback
 * - Mobile-responsive design with accessibility
 *
 * Requirements: 94.2, 94.3, 94.4, 94.5
 * 2026 Best Practices: Function over form, cognitive load minimization, accessibility, keyboard-first workflows
 */

import { useState, useEffect, useRef } from "react";
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
  Building2, 
  Upload, 
  Clock, 
  Globe, 
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
  X,
  Bell
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";

// Form validation schemas
const generalSettingsSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(255, "Name too long"),
  timezone: z.string().min(1, "Timezone is required").max(50, "Invalid timezone"),
  currency: z.string().length(3, "Invalid currency format"),
  dateFormat: z.enum([
    "YYYY-MM-DD",
    "DD/MM/YYYY", 
    "MM/DD/YYYY",
    "DD-MM-YYYY",
    "MM-DD-YYYY",
    "YYYY/MM/DD",
    "DD.MM.YYYY",
    "MM.DD.YYYY",
  ]),
  language: z.string().min(2, "Invalid language").max(10, "Invalid language"),
});

const businessHoursSchema = z.object({
  monday: z.object({ enabled: z.boolean(), open: z.string(), close: z.string() }),
  tuesday: z.object({ enabled: z.boolean(), open: z.string(), close: z.string() }),
  wednesday: z.object({ enabled: z.boolean(), open: z.string(), close: z.string() }),
  thursday: z.object({ enabled: z.boolean(), open: z.string(), close: z.string() }),
  friday: z.object({ enabled: z.boolean(), open: z.string(), close: z.string() }),
  saturday: z.object({ enabled: z.boolean(), open: z.string(), close: z.string() }),
  sunday: z.object({ enabled: z.boolean(), open: z.string(), close: z.string() }),
}).refine((data) => {
  // Validate business hours for enabled days
  for (const day of Object.keys(data)) {
    const dayConfig = data[day as keyof typeof data];
    if (dayConfig.enabled) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(dayConfig.open) || !timeRegex.test(dayConfig.close)) {
        return false;
      }
      if (dayConfig.open >= dayConfig.close) {
        return false;
      }
    }
  }
  return true;
}, {
  message: "Invalid business hours configuration",
});

const emailTemplateSchema = z.object({
  invitationSubject: z.string().min(1, "Subject is required"),
  invitationBody: z.string().min(1, "Body is required"),
  invoiceReminderSubject: z.string().min(1, "Subject is required"),
  invoiceReminderBody: z.string().min(1, "Body is required"),
});

type GeneralSettingsForm = z.infer<typeof generalSettingsSchema>;
type BusinessHoursForm = z.infer<typeof businessHoursSchema>;
type EmailTemplateForm = z.infer<typeof emailTemplateSchema>;

// API functions
async function fetchOrganizationSettings() {
  const response = await fetch("/api/organizations/settings", {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch organization settings");
  }
  return response.json();
}

async function updateOrganizationSettings(data: Partial<GeneralSettingsForm>) {
  const response = await fetch("/api/organizations/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Failed to update organization settings");
  }
  return response.json();
}

async function updateBusinessHours(data: BusinessHoursForm) {
  const response = await fetch("/api/organizations/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ businessHours: data }),
  });
  if (!response.ok) {
    throw new Error("Failed to update business hours");
  }
  return response.json();
}

async function uploadOrganizationLogo(file: File) {
  const formData = new FormData();
  formData.append("logo", file);

  const response = await fetch("/api/organizations/logo", {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!response.ok) {
    throw new Error("Failed to upload logo");
  }
  return response.json();
}

async function removeOrganizationLogo() {
  const response = await fetch("/api/organizations/logo", {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to remove logo");
  }
  return response.json();
}

// Time options for business hours
const timeOptions = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0");
  return [
    { value: `${hour}:00`, label: `${hour}:00` },
    { value: `${hour}:30`, label: `${hour}:30` },
  ];
}).flat();

// Timezone options
const timezoneOptions = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "America/Chicago", label: "Central Time (Chicago)" },
  { value: "America/Denver", label: "Mountain Time (Denver)" },
  { value: "America/Los_Angeles", label: "Pacific Time (Los Angeles)" },
  { value: "Europe/London", label: "Greenwich Mean Time (London)" },
  { value: "Europe/Paris", label: "Central European Time (Paris)" },
  { value: "Europe/Berlin", label: "Central European Time (Berlin)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (Tokyo)" },
  { value: "Asia/Shanghai", label: "China Standard Time (Shanghai)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (Sydney)" },
];

// Currency options
const currencyOptions = [
  { value: "USD", label: "USD - US Dollar ($)" },
  { value: "EUR", label: "EUR - Euro (€)" },
  { value: "GBP", label: "GBP - British Pound (£)" },
  { value: "JPY", label: "JPY - Japanese Yen (¥)" },
  { value: "CAD", label: "CAD - Canadian Dollar (C$)" },
  { value: "AUD", label: "AUD - Australian Dollar (A$)" },
  { value: "CHF", label: "CHF - Swiss Franc (Fr)" },
  { value: "CNY", label: "CNY - Chinese Yuan (¥)" },
];

// Date format options
const dateFormatOptions = [
  { value: "YYYY-MM-DD", label: "2024-12-31" },
  { value: "DD/MM/YYYY", label: "31/12/2024" },
  { value: "MM/DD/YYYY", label: "12/31/2024" },
  { value: "DD-MM-YYYY", label: "31-12-2024" },
  { value: "MM-DD-YYYY", label: "12-31-2024" },
  { value: "YYYY/MM/DD", label: "2024/12/31" },
  { value: "DD.MM.YYYY", label: "31.12.2024" },
  { value: "MM.DD.YYYY", label: "12.31.2024" },
];

// Language options
const languageOptions = [
  { value: "en", label: "English" },
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "es", label: "Español" },
  { value: "es-ES", label: "Español (España)" },
  { value: "fr", label: "Français" },
  { value: "fr-FR", label: "Français (France)" },
  { value: "de", label: "Deutsch" },
  { value: "de-DE", label: "Deutsch (Deutschland)" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Português" },
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
];

// Days of the week
const daysOfWeek = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export default function OrganizationSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Fetch organization settings
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["organization-settings"],
    queryFn: fetchOrganizationSettings,
  });

  // General settings form
  const generalForm = useForm<GeneralSettingsForm>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      name: "",
      timezone: "UTC",
      currency: "USD",
      dateFormat: "YYYY-MM-DD",
      language: "en",
    },
  });

  // Business hours form
  const businessHoursForm = useForm<BusinessHoursForm>({
    resolver: zodResolver(businessHoursSchema),
    defaultValues: {
      monday: { enabled: true, open: "09:00", close: "17:00" },
      tuesday: { enabled: true, open: "09:00", close: "17:00" },
      wednesday: { enabled: true, open: "09:00", close: "17:00" },
      thursday: { enabled: true, open: "09:00", close: "17:00" },
      friday: { enabled: true, open: "09:00", close: "17:00" },
      saturday: { enabled: false, open: "09:00", close: "17:00" },
      sunday: { enabled: false, open: "09:00", close: "17:00" },
    },
  });

  // Email template form
  const emailTemplateForm = useForm<EmailTemplateForm>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: {
      invitationSubject: "You're invited to join {{organizationName}}",
      invitationBody: "Hello {{firstName}},\n\nYou've been invited to join {{organizationName}}. Click the link below to get started.\n\n{{invitationLink}}\n\nThis invitation expires in 7 days.",
      invoiceReminderSubject: "Invoice Reminder from {{organizationName}}",
      invoiceReminderBody: "Hello {{firstName}},\n\nThis is a reminder that you have an outstanding invoice from {{organizationName}}.\n\nInvoice: {{invoiceNumber}}\nAmount: {{amount}}\nDue Date: {{dueDate}}\n\nPlease review and process the payment at your earliest convenience.",
    },
  });

  // Update forms when data is loaded
  useEffect(() => {
    if (settings) {
      generalForm.reset({
        name: settings.name || "",
        timezone: settings.timezone || "UTC",
        currency: settings.currency || "USD",
        dateFormat: settings.dateFormat || "YYYY-MM-DD",
        language: settings.language || "en",
      });

      businessHoursForm.reset(settings.businessHours || {
        monday: { enabled: true, open: "09:00", close: "17:00" },
        tuesday: { enabled: true, open: "09:00", close: "17:00" },
        wednesday: { enabled: true, open: "09:00", close: "17:00" },
        thursday: { enabled: true, open: "09:00", close: "17:00" },
        friday: { enabled: true, open: "09:00", close: "17:00" },
        saturday: { enabled: false, open: "09:00", close: "17:00" },
        sunday: { enabled: false, open: "09:00", close: "17:00" },
      });

      setPreviewUrl(settings.logo || null);
    }
  }, [settings, generalForm, businessHoursForm]);

  // Mutations
  const updateGeneralMutation = useMutation({
    mutationFn: updateOrganizationSettings,
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Organization settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["organization-settings"] });
    },
    onError: (_error) => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateBusinessHoursMutation = useMutation({
    mutationFn: updateBusinessHours,
    onSuccess: () => {
      toast({
        title: "Business hours updated",
        description: "Business hours have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["organization-settings"] });
    },
    onError: (_error) => {
      toast({
        title: "Error",
        description: "Failed to update business hours. Please try again.",
        variant: "destructive",
      });
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: uploadOrganizationLogo,
    onSuccess: (_data) => {
      toast({
        title: "Logo uploaded",
        description: "Organization logo has been updated successfully.",
      });
      setPreviewUrl(_data.logoUrl);
      queryClient.invalidateQueries({ queryKey: ["organization-settings"] });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (_error) => {
      toast({
        title: "Error",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    },
  });

  const removeLogoMutation = useMutation({
    mutationFn: removeOrganizationLogo,
    onSuccess: () => {
      toast({
        title: "Logo removed",
        description: "Organization logo has been removed successfully.",
      });
      setPreviewUrl(null);
      queryClient.invalidateQueries({ queryKey: ["organization-settings"] });
    },
    onError: (_error) => {
      toast({
        title: "Error",
        description: "Failed to remove logo. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Form handlers
  const onGeneralSubmit = (data: GeneralSettingsForm) => {
    updateGeneralMutation.mutate(data);
  };

  const onBusinessHoursSubmit = (data: BusinessHoursForm) => {
    updateBusinessHoursMutation.mutate(data);
  };

  const onEmailTemplateSubmit = (_data: EmailTemplateForm) => {
    // TODO: Implement email template update API
    toast({
      title: "Coming soon",
      description: "Email template customization will be available in a future update.",
    });
  };

  // File handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (PNG, JPG, GIF).",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image file smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleLogoUpload = () => {
    if (selectedFile) {
      uploadLogoMutation.mutate(selectedFile);
    }
  };

  const handleLogoRemove = () => {
    removeLogoMutation.mutate();
  };

  const handleFileCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(settings?.logo || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading organization settings...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="flex items-center space-x-2 text-destructive">
          <AlertCircle className="h-6 w-6" />
          <span>Failed to load organization settings. Please refresh the page.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader 
        title="Organization Settings" 
        description="Manage your organization's configuration and preferences" 
      />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="business-hours">Business Hours</TabsTrigger>
          <TabsTrigger value="customization">Customization</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                General Information
              </CardTitle>
              <CardDescription>
                Basic organization information and regional settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...generalForm}>
                <form onSubmit={generalForm.handleSubmit(onGeneralSubmit)} className="space-y-6">
                  <FormField
                    control={generalForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter organization name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={generalForm.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timezone</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select timezone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {timezoneOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={generalForm.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {currencyOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={generalForm.control}
                      name="dateFormat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date Format</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select date format" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {dateFormatOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={generalForm.control}
                      name="language"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Language</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {languageOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <CardFooter className="px-0">
                    <Button 
                      type="submit" 
                      disabled={updateGeneralMutation.isPending}
                    >
                      {updateGeneralMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save Changes
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Logo Upload Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Organization Logo
              </CardTitle>
              <CardDescription>
                Upload your organization's logo for branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                    {previewUrl ? (
                      <img 
                        src={previewUrl} 
                        alt="Organization logo" 
                        className="w-full h-full rounded-lg object-cover"
                      />
                    ) : (
                      <Building2 className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  {previewUrl && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0"
                      onClick={handleLogoRemove}
                      disabled={removeLogoMutation.isPending}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                
                <div className="flex-1 space-y-4">
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label htmlFor="logo-upload">
                      <Button variant="outline" className="cursor-pointer" asChild>
                        <span>
                          <Upload className="mr-2 h-4 w-4" />
                          Choose File
                        </span>
                      </Button>
                    </label>
                    <p className="text-sm text-muted-foreground mt-2">
                      PNG, JPG, or GIF. Maximum 5MB.
                    </p>
                  </div>

                  {selectedFile && (
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{selectedFile.name}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleFileCancel}
                        disabled={uploadLogoMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {selectedFile && (
                <div className="flex justify-end space-x-2">
                  <Button
                    onClick={handleLogoUpload}
                    disabled={uploadLogoMutation.isPending}
                  >
                    {uploadLogoMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Upload Logo
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Hours Tab */}
        <TabsContent value="business-hours" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Business Hours
              </CardTitle>
              <CardDescription>
                Configure your organization's operating hours for each day of the week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...businessHoursForm}>
                <form onSubmit={businessHoursForm.handleSubmit(onBusinessHoursSubmit)} className="space-y-6">
                  {daysOfWeek.map((day) => (
                    <div key={day.key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <FormField
                          control={businessHoursForm.control}
                          name={`${day.key}.enabled` as any}
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="font-medium">{day.label}</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex items-center space-x-4">
                        <FormField
                          control={businessHoursForm.control}
                          name={`${day.key}.open` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Select
                                  disabled={!businessHoursForm.watch(`${day.key}.enabled` as any)}
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <SelectTrigger className="w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {timeOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <span className="text-muted-foreground">to</span>

                        <FormField
                          control={businessHoursForm.control}
                          name={`${day.key}.close` as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Select
                                  disabled={!businessHoursForm.watch(`${day.key}.enabled` as any)}
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <SelectTrigger className="w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {timeOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}

                  <CardFooter className="px-0">
                    <Button 
                      type="submit" 
                      disabled={updateBusinessHoursMutation.isPending}
                    >
                      {updateBusinessHoursMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save Business Hours
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customization Tab */}
        <TabsContent value="customization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Email Templates
              </CardTitle>
              <CardDescription>
                Customize email templates sent to your clients and team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...emailTemplateForm}>
                <form onSubmit={emailTemplateForm.handleSubmit(onEmailTemplateSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Invitation Email</h3>
                    <FormField
                      control={emailTemplateForm.control}
                      name="invitationSubject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <Input placeholder="Email subject" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={emailTemplateForm.control}
                      name="invitationBody"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Body</FormLabel>
                          <FormControl>
                            <textarea
                              className="w-full p-3 border rounded-md resize-vertical min-h-[100px]"
                              placeholder="Email body"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Available variables: {"{{organizationName}}"}, {"{{firstName}}"}, {"{{invitationLink}}"}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Invoice Reminder Email</h3>
                    <FormField
                      control={emailTemplateForm.control}
                      name="invoiceReminderSubject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <Input placeholder="Email subject" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={emailTemplateForm.control}
                      name="invoiceReminderBody"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Body</FormLabel>
                          <FormControl>
                            <textarea
                              className="w-full p-3 border rounded-md resize-vertical min-h-[100px]"
                              placeholder="Email body"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Available variables: {"{{organizationName}}"}, {"{{firstName}}"}, {"{{invoiceNumber}}"}, {"{{amount}}"}, {"{{dueDate}}"}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <CardFooter className="px-0">
                    <Button type="submit">
                      <Mail className="mr-2 h-4 w-4" />
                      Save Email Templates
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure how and when your organization sends notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email notifications for important events
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Invoice Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically send reminders for overdue invoices
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Project Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify team members about project changes
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Client Portal Access</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow clients to receive notifications about their projects
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="pt-4">
                <Button>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Save Notification Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
