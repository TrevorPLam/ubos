import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2,
  FileText,
  Briefcase,
  FolderKanban,
  MessageSquare,
  Receipt,
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
} from "lucide-react";

const features = [
  {
    icon: Building2,
    title: "CRM & Pipeline",
    description: "Manage clients, contacts, and deals with an intuitive pipeline view.",
  },
  {
    icon: FileText,
    title: "Proposals & Contracts",
    description: "Create, send, and track proposals. E-sign contracts seamlessly.",
  },
  {
    icon: Briefcase,
    title: "Engagements",
    description: "The central hub that ties together every client interaction.",
  },
  {
    icon: FolderKanban,
    title: "Project Management",
    description: "Apply templates, track tasks, and manage milestones efficiently.",
  },
  {
    icon: MessageSquare,
    title: "Communications",
    description: "Internal and client-facing message threads in one place.",
  },
  {
    icon: Receipt,
    title: "AR/AP Management",
    description: "Invoice scheduling, bill capture, and approval workflows.",
  },
];

const benefits = [
  "Unified platform for all business operations",
  "Multi-tenant with strict data isolation",
  "Client portal for seamless collaboration",
  "Activity audit trail for compliance",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold text-sm">
              UB
            </div>
            <span className="font-semibold text-lg">UBOS</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </a>
            <a
              href="#benefits"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Benefits
            </a>
          </div>
          <Button asChild data-testid="button-login">
            <a href="/api/login">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </nav>

      <main>
        <section className="pt-32 pb-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Zap className="h-3.5 w-3.5" />
                Unified Business Operations Suite
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-6">
                All your business operations in <span className="text-primary">one place</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                From lead to invoice, manage your entire client lifecycle. CRM, proposals,
                contracts, projects, documents, communications, and billing — unified.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" asChild data-testid="button-hero-cta">
                  <a href="/api/login">
                    Start Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#features">Learn More</a>
                </Button>
              </div>
              <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Free forever plan</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span>Enterprise-grade security</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 px-6 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-semibold mb-4">Everything you need</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                A complete suite of tools to manage your business operations, designed to work
                together seamlessly.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="hover-elevate transition-all">
                  <CardContent className="p-6">
                    <div className="rounded-lg bg-primary/10 p-2.5 w-fit mb-4">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="benefits" className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-semibold mb-6">Built for modern businesses</h2>
                <p className="text-muted-foreground mb-8">
                  UBOS is designed from the ground up to handle the complexity of modern business
                  operations while remaining simple to use.
                </p>
                <ul className="space-y-4">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
                <Button className="mt-8" asChild>
                  <a href="/api/login">
                    Get Started Today
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8">
                  <div className="h-full rounded-xl bg-card border border-border shadow-lg flex items-center justify-center">
                    <div className="text-center">
                      <Briefcase className="h-16 w-16 text-primary mx-auto mb-4" />
                      <p className="font-semibold text-lg">Engagement Hub</p>
                      <p className="text-sm text-muted-foreground">Everything connected</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-6 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-semibold mb-4">Ready to unify your operations?</h2>
            <p className="text-primary-foreground/80 mb-8">
              Join businesses that have streamlined their workflow with UBOS.
            </p>
            <Button size="lg" variant="secondary" asChild data-testid="button-footer-cta">
              <a href="/api/login">
                Start Free Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground font-semibold text-xs">
              UB
            </div>
            <span className="text-sm text-muted-foreground">
              UBOS - Unified Business Operations Suite
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} UBOS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
