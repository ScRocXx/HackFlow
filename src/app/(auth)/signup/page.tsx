'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const supabase = createClient();

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data?.session) {
      window.location.href = '/dashboard';
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        if (
          error.message.toLowerCase().includes('provider is not enabled') ||
          error.message.toLowerCase().includes('unsupported provider')
        ) {
          setError(
            'Google Sign-In is not enabled yet in your Supabase project. Go to Supabase Dashboard -> Authentication -> Providers -> Google to enable it, or sign up with your email and password below.'
          );
        } else {
          setError(error.message);
        }
        setGoogleLoading(false);
      } else if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err?.message || 'Could not initiate Google signup. Please try email signup.');
      setGoogleLoading(false);
    }
  };

  return (
    <Card className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[8px_8px_0_#671912]">
      <CardHeader className="space-y-1 text-center border-b-2 border-[#10201d] pb-5">
        <CardTitle className="font-display text-3xl font-extrabold uppercase tracking-tight text-[#10201d]">
          Create Account
        </CardTitle>
        <CardDescription className="font-mono text-xs text-[#34433f]">
          Never lose track of a hackathon round again
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {error && (
          <div className="border-2 border-[#10201d] bg-[#e53927] text-[#f7f7f2] p-3 text-xs font-mono font-bold flex gap-2 items-start shadow-[3px_3px_0_#671912]">
            <AlertCircle className="h-4 w-4 text-white shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {success ? (
          <div className="border-2 border-[#10201d] bg-[#8bb2de] p-5 text-center space-y-3 shadow-[4px_4px_0_#2e4742]">
            <CheckCircle2 className="h-8 w-8 text-[#10201d] mx-auto" />
            <h4 className="font-display text-2xl font-bold text-[#10201d]">Account Created!</h4>
            <p className="font-mono text-xs text-[#10201d] leading-relaxed">
              Please check your inbox at <strong>{email}</strong> for the confirmation link.
            </p>
            <div className="pt-2">
              <Link href="/login">
                <Button variant="default" size="sm">
                  Proceed to Sign In
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-mono text-xs font-bold uppercase tracking-wider text-[#10201d]">
                Full Name
              </label>
              <Input
                type="text"
                placeholder="Alex Developer"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading || googleLoading}
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-xs font-bold uppercase tracking-wider text-[#10201d]">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || googleLoading}
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-xs font-bold uppercase tracking-wider text-[#10201d]">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading || googleLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || googleLoading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Account
            </Button>
          </form>
        )}

        {!success && (
          <>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t-2 border-[#10201d]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#f7f7f2] px-3 font-mono font-bold text-[#10201d]">
                  or
                </span>
              </div>
            </div>

            <Button 
              variant="outline" 
              type="button" 
              className="w-full" 
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Continue with Google
            </Button>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-center border-t-2 border-[#10201d] pt-4">
        <p className="font-mono text-xs text-[#34433f]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#10201d] font-bold underline decoration-2 underline-offset-3 hover:text-[#e53927]">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

