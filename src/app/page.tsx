import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Search,
  MapPin,
  Shield,
  QrCode,
  MessageSquare,
  BarChart3,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1a5c6b' }}>
                <Search className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg text-gray-800">KARE <span className="font-normal text-gray-500">Lost & Found</span></span>
            </div>
            <nav className="hidden md:flex items-center gap-5">
              <Link href="#features" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
                How it Works
              </Link>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="text-gray-600">
                  <Search className="w-3.5 h-3.5 mr-1.5" />
                  Student
                </Button>
              </Link>
              <Link href="/admin/login">
                <Button variant="ghost" size="sm" className="text-gray-600">
                  <Shield className="w-3.5 h-3.5 mr-1.5" />
                  Admin
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm" className="text-white" style={{ background: '#1a5c6b' }}>
                  Register
                </Button>
              </Link>
            </nav>
            <Link href="/auth/login" className="md:hidden">
              <Button size="sm" style={{ background: '#1a5c6b' }} className="text-white">Login</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section with Campus Background */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Campus Background - Add your campus-background.jpg to public folder */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('/campus-background.jpg')`
          }}
        />

        {/* Hero Content - Simple and Clean */}
        <div className="relative z-10 max-w-3xl mx-auto text-center px-4 pt-20 pb-16">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 text-white leading-tight">
            Campus Lost & Found System
          </h1>

          <p className="text-base md:text-lg text-white/90 max-w-xl mx-auto mb-8">
            Report, search, and recover your lost belongings at Kalasalingam University. Secure, private, and easy to use.
          </p>

          {/* Login Options */}
          <div className="flex flex-col items-center justify-center gap-4 mb-6">
            <p className="text-white/80 text-sm font-medium">Choose your login type:</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
              {/* Student Login */}
              <Link href="/auth/login" className="w-full sm:w-auto">
                <Button size="lg" className="w-full text-white px-8 py-5 rounded-lg text-sm font-semibold shadow-lg hover:shadow-xl transition-all" style={{ background: '#1a5c6b' }}>
                  <Search className="w-4 h-4 mr-2" />
                  Student Login
                </Button>
              </Link>

              {/* Admin Login */}
              <Link href="/admin/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20 px-8 py-5 rounded-lg text-sm font-semibold backdrop-blur-sm">
                  <Shield className="w-4 h-4 mr-2" />
                  Admin Login
                </Button>
              </Link>
            </div>

            {/* Register Link */}
            <div className="text-center mt-2">
              <p className="text-white/70 text-sm">
                New student?{' '}
                <Link href="/auth/register" className="text-white font-semibold underline hover:text-white/90">
                  Create Account
                </Link>
              </p>
            </div>
          </div>

          {/* Simple Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mt-12">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">500+</div>
              <div className="text-xs text-white/70">Items Recovered</div>
            </div>
            <div className="text-center border-x border-white/20">
              <div className="text-2xl font-bold text-white">95%</div>
              <div className="text-xs text-white/70">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">24h</div>
              <div className="text-xs text-white/70">Avg. Recovery</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
              Everything You Need
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto text-sm">
              A complete solution designed for campus security with privacy at its core.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              icon={<Shield className="w-5 h-5" />}
              title="Privacy First"
              description="Only register numbers are visible. No personal details exposed to other students."
            />
            <FeatureCard
              icon={<MapPin className="w-5 h-5" />}
              title="Campus Map"
              description="Pin exact locations on our interactive campus map. Find items nearby instantly."
            />
            <FeatureCard
              icon={<QrCode className="w-5 h-5" />}
              title="QR Verification"
              description="Verify item returns with secure QR codes. Prevents false claims."
            />
            <FeatureCard
              icon={<MessageSquare className="w-5 h-5" />}
              title="Community Chat"
              description="Campus-wide discussion channel for lost items. Moderated and safe."
            />
            <FeatureCard
              icon={<Search className="w-5 h-5" />}
              title="Smart Search"
              description="Filter by category, location, date, and status. Find what you're looking for fast."
            />
            <FeatureCard
              icon={<BarChart3 className="w-5 h-5" />}
              title="Admin Analytics"
              description="Security office dashboard with trends, hotspots, and user management."
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
              How It Works
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto text-sm">
              Simple steps to report or find your lost items.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <StepCard number={1} title="Sign Up" description="Register with your college email and register number." />
            <StepCard number={2} title="Report" description="Create a lost or found report with photos and location." />
            <StepCard number={3} title="Connect" description="Receive notifications when someone claims or finds your item." />
            <StepCard number={4} title="Verify" description="Use QR code to verify and complete the return process." />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
            Ready to Get Started?
          </h2>
          <p className="text-gray-500 mb-6 text-sm">
            Join hundreds of students who have successfully recovered their lost items.
          </p>
          <Link href="/auth/register">
            <Button size="lg" className="text-white px-8" style={{ background: '#1a5c6b' }}>
              Create Account
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#1a5c6b]" />
              <span>Free to use</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#1a5c6b]" />
              <span>Secure & Private</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#1a5c6b]" />
              <span>24/7 Available</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 px-4 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: '#1a5c6b' }}>
              <Search className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-gray-800 text-sm">KARE Lost & Found</span>
          </div>
          <p className="text-xs text-gray-400">
            © 2026 Kalasalingam University Security Office. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-5 rounded-lg bg-white border border-gray-200 hover:border-[#1a5c6b]/30 transition-all duration-200 hover:shadow-sm">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white mb-3" style={{ background: '#1a5c6b' }}>
        {icon}
      </div>
      <h3 className="font-semibold text-gray-800 mb-1.5">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 rounded-full text-white font-bold text-base flex items-center justify-center mx-auto mb-3" style={{ background: '#1a5c6b' }}>
        {number}
      </div>
      <h3 className="font-semibold text-gray-800 mb-1.5">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}
