// AI-META-BEGIN
// AI-META: Page component - onboarding.tsx
// OWNERSHIP: client/pages
// ENTRYPOINTS: app router
// DEPENDENCIES: react, components, hooks
// DANGER: Review form validation and API integration
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: npm run test:frontend
// AI-META-END

/**
 * Onboarding page for new users accepting invitations.
 *
 * This page handles:
 * - Invitation token validation from URL parameters
 * - User account setup form (name, password, profile photo)
 * - Integration with invitation acceptance API
 * - Error handling for invalid/expired invitations
 * - Progressive enhancement with proper validation
 *
 * Requirements: 91.3 - Implement onboarding flow
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Lock, 
  Mail, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Building2,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InvitationData {
  email: string;
  organizationName: string;
  roleName: string;
  inviterName: string;
  token: string;
}

interface OnboardingForm {
  name: string;
  password: string;
  confirmPassword: string;
  profilePhoto?: File;
  profilePhotoPreview?: string;
}

// Password validation requirements
const PASSWORD_REQUIREMENTS = [
  { regex: /.{8,}/, text: "At least 8 characters" },
  { regex: /[A-Z]/, text: "One uppercase letter" },
  { regex: /[a-z]/, text: "One lowercase letter" },
  { regex: /\d/, text: "One number" },
  { regex: /[@$!%*?&]/, text: "One special character (@$!%*?&)" },
];

async function acceptInvitation(token: string, formData: OnboardingForm) {
  const formDataToSend = new FormData();
  formDataToSend.append("token", token);
  formDataToSend.append("name", formData.name);
  formDataToSend.append("password", formData.password);
  
  if (formData.profilePhoto) {
    formDataToSend.append("profilePhoto", formData.profilePhoto);
  }

  const response = await fetch(`/api/invitations/${token}/accept`, {
    method: "POST",
    credentials: "include",
    body: formDataToSend,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to accept invitation");
  }

  return response.json();
}

export default function OnboardingPage() {
  const [location] = useLocation();
  const { toast } = useToast();
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<OnboardingForm>({
    name: "",
    password: "",
    confirmPassword: "",
    profilePhotoPreview: undefined,
  });
  const [passwordValidation, setPasswordValidation] = useState<boolean[]>(new Array(PASSWORD_REQUIREMENTS.length).fill(false));

  // Validate invitation token with server
  const validateInvitationToken = async (token: string) => {
    try {
      const response = await fetch(`/api/invitations/${token}/validate`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        setError(error.message || "Invalid invitation link.");
        setIsLoading(false);
        return;
      }

      const invitationDetails = await response.json();
      setInvitationData({
        token,
        email: invitationDetails.email,
        organizationName: invitationDetails.organizationName,
        roleName: invitationDetails.roleName,
        inviterName: invitationDetails.inviterName,
      });
      setIsLoading(false);
    } catch (error) {
      console.error("Error validating invitation:", error);
      setError("Failed to validate invitation. Please try again later.");
      setIsLoading(false);
    }
  };

  // Extract token from URL query parameters
  useEffect(() => {
    const validateToken = async () => {
      const urlParams = new URLSearchParams(location.split("?")[1] || "");
      const token = urlParams.get("token");
      
      if (!token) {
        setError("No invitation token found. Please check your invitation link.");
        setIsLoading(false);
        return;
      }

      // Validate invitation token and fetch details from API
      await validateInvitationToken(token);
    };

    validateToken();
  }, [location]);

  // Password validation
  useEffect(() => {
    const validation = PASSWORD_REQUIREMENTS.map(req => req.regex.test(formData.password));
    setTimeout(() => setPasswordValidation(validation), 0);
  }, [formData.password]);

  const acceptInvitationMutation = useMutation({
    mutationFn: (data: { token: string; formData: OnboardingForm }) =>
      acceptInvitation(data.token, data.formData),
    onSuccess: (_response) => {
      toast({
        title: "Welcome aboard! 🎉",
        description: "Your account has been created successfully.",
      });
      
      // Redirect to dashboard after successful onboarding
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof OnboardingForm, value: string | File) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Handle profile photo preview
      if (field === "profilePhoto" && value instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFormData(prev => ({
            ...prev,
            profilePhotoPreview: e.target?.result as string,
          }));
        };
        reader.readAsDataURL(value);
      }
      
      return newData;
    });
  };

  const handleProfilePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Profile photo must be less than 5MB",
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

      handleInputChange("profilePhoto", file);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) return false;
    if (!formDataValidation.password) return false;
    if (formData.password !== formData.confirmPassword) return false;
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !invitationData) return;
    
    acceptInvitationMutation.mutate({
      token: invitationData.token,
      formData,
    });
  };

  const formDataValidation = {
    name: formData.name.trim().length >= 2,
    password: passwordValidation.every(req => req),
    passwordsMatch: formData.password === formData.confirmPassword && formData.password.length > 0,
  };

  const isFormValid = Object.values(formDataValidation).every(Boolean);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = "/"}
            >
              Go to Homepage
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!invitationData) return null;

  const steps = [
    { title: "Welcome", icon: Mail },
    { title: "Account Setup", icon: User },
    { title: "Security", icon: Lock },
    { title: "Complete", icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold text-sm">
              UB
            </div>
            <span className="font-semibold text-lg">UBOS</span>
          </div>
          <Badge variant="secondary">Secure Onboarding</Badge>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step.title} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 
                    ${index <= 2 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : "bg-muted text-muted-foreground border-border"
                    }
                  `}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`
                      w-full h-0.5 mx-4
                      ${index < 2 ? "bg-primary" : "bg-border"}
                    `} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              {steps.map((step, index) => (
                <span 
                  key={step.title}
                  className={`text-xs font-medium ${
                    index <= 2 ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </span>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Invitation Details */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Invitation Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Email</Label>
                    <p className="font-medium">{invitationData.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Organization</Label>
                    <p className="font-medium">{invitationData.organizationName}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Role</Label>
                    <p className="font-medium">{invitationData.roleName}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Invited by</Label>
                    <p className="font-medium">{invitationData.inviterName}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Security Badge */}
              <Card className="mt-4">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium text-sm">Secure Connection</p>
                      <p className="text-xs text-muted-foreground">
                        Your data is encrypted and protected
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Onboarding Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Complete Your Profile</CardTitle>
                  <CardDescription>
                    Set up your account to join {invitationData.organizationName}
                  </CardDescription>
                </CardHeader>
                
                <form onSubmit={handleSubmit}>
                  <CardContent className="space-y-6">
                    {/* Profile Photo Upload */}
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {formData.profilePhotoPreview ? (
                          <img 
                            src={formData.profilePhotoPreview} 
                            alt="Profile preview" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <input
                          type="file"
                          id="profilePhoto"
                          accept="image/*"
                          onChange={handleProfilePhotoChange}
                          className="hidden"
                          aria-label="Upload profile photo"
                          title="Upload profile photo"
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => document.getElementById('profilePhoto')?.click()}
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          {formData.profilePhoto ? "Change Photo" : "Upload Photo"}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">
                          Optional: JPG, PNG up to 5MB
                        </p>
                        {formData.profilePhoto && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs text-destructive hover:text-destructive"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                profilePhoto: undefined,
                                profilePhotoPreview: undefined,
                              }));
                            }}
                          >
                            Remove photo
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Name Input */}
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        className={formData.name && !formDataValidation.name ? "border-red-500" : ""}
                      />
                      {formData.name && !formDataValidation.name && (
                        <p className="text-sm text-destructive">Name must be at least 2 characters</p>
                      )}
                    </div>

                    {/* Password Input */}
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        className={formData.password && !formDataValidation.password ? "border-red-500" : ""}
                      />
                      
                      {/* Password Requirements */}
                      {formData.password && (
                        <div className="space-y-1">
                          {PASSWORD_REQUIREMENTS.map((req, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              {passwordValidation[index] ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              ) : (
                                <AlertCircle className="h-3 w-3 text-muted-foreground" />
                              )}
                              <span className={passwordValidation[index] ? "text-green-600" : "text-muted-foreground"}>
                                {req.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                        className={formData.confirmPassword && !formDataValidation.passwordsMatch ? "border-red-500" : ""}
                      />
                      {formData.confirmPassword && !formDataValidation.passwordsMatch && (
                        <p className="text-sm text-destructive">Passwords do not match</p>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="flex justify-between">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => window.location.href = "/"}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={!isFormValid || acceptInvitationMutation.isPending}
                    >
                      {acceptInvitationMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating Account...
                        </>
                      ) : (
                        <>
                          Complete Setup
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
