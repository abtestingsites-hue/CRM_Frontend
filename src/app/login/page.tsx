"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '@/store/authStore';
import { apiFetch, API_BASE_URL } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setUser } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError('');

    try {
      const apiEndpoint = process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`
        : `${API_BASE_URL}/api/v1/auth/login`;

      const res = await apiFetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          rememberMe: data.rememberMe,
        }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.message || 'Invalid email or password');
      }

      // Save tokens
      localStorage.setItem('paramantra_access_token', responseData.accessToken);
      localStorage.setItem('paramantra_refresh_token', responseData.refreshToken);
      localStorage.setItem('crm_token', responseData.accessToken); // Backward compat

      if (responseData.session) {
        const userObj = {
          id: responseData.session.userId || responseData.session.id, // Primary ID is now the actual userId
          email: responseData.session.email,
          name: responseData.session.name,
          role: responseData.session.role,
          orgId: responseData.session.orgId,
          agentId: responseData.session.agentId || responseData.session.userId || responseData.session.id, // True agentId
          sessionId: responseData.session.id,
        };
        localStorage.setItem('paramantra_user', JSON.stringify(userObj));
        localStorage.setItem('crm_user', JSON.stringify(userObj)); // Backward compat

        setUser(userObj);

        // Routing redirects
        if (userObj.role === 'SUPER_ADMIN' || userObj.role === 'ADMIN') {
          router.push('/dashboard');
        } else {
          router.push('/agent/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to establish connection to CRM Auth Gateway');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-30%] left-[-20%] w-[60%] h-[60%] bg-[#ea580c]/10 blur-[130px] rounded-full"></div>
        <div className="absolute bottom-[-30%] right-[-20%] w-[60%] h-[60%] bg-blue-500/5 blur-[130px] rounded-full"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#0b0b0b] border border-[#1e1e1e] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Brand Header */}
          <div className="p-8 pb-6 text-center border-b border-[#1a1a1a]">
            <div className="mx-auto w-12 h-12 bg-[#121212] border border-[#2a2a2a] rounded-xl flex items-center justify-center mb-4 shadow-inner">
              <ShieldCheck className="text-orange-500 w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">CRM Tool</h1>
            <p className="text-slate-400 text-xs mt-1">Enterprise Sales & Command Center</p>
          </div>

          {/* Form Content */}
          <div className="p-8 pt-6">
            {error && (
              <div className="mb-5 p-3 bg-red-950/20 border border-red-900/50 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-400 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input aria-label="Email address" id="login-email" type="email"
                    {...register('email')}
                    className="w-full bg-[#141414] border border-[#262626] focus:border-orange-500 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all"
                    placeholder="name@company.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Security Password</label>
                  <a href="#" className="text-xs font-medium text-orange-500 hover:text-orange-400 transition-colors">Forgot Password?</a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input aria-label="Password" id="login-password" type="password"
                    {...register('password')}
                    className="w-full bg-[#141414] border border-[#262626] focus:border-orange-500 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{errors.password.message}</p>
                )}
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center gap-2 py-1">
                <input aria-label="Remember me" type="checkbox"
                  id="rememberMe"
                  {...register('rememberMe')}
                  className="rounded border-[#262626] bg-[#141414] text-orange-500 focus:ring-orange-500"
                />
                <label htmlFor="rememberMe" className="text-xs text-slate-400 select-none cursor-pointer">
                  Remember my session on this device
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg py-2.5 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-[0_0_15px_rgba(234,88,12,0.15)]"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    Establish Secure Session <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="bg-[#101010] border-t border-[#1a1a1a] py-4 text-center">
            <p className="text-[10px] text-slate-500 tracking-wider font-semibold">CRM TOOL • CORE v4.1.0 • SECURED</p>
          </div>
        </div>
      </div>
    </div>
  );
}
