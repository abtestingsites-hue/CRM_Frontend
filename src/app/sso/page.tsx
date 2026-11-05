"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiFetch, API_BASE_URL } from '@/lib/api';

export default function SsoExchangePage() {
  const [error, setError] = useState('');
  const [isExchanging, setIsExchanging] = useState(true);
  const router = useRouter();
  const { setUser } = useAuthStore();

  useEffect(() => {
    let isMounted = true;

    const performExchange = async () => {
      // 1. Try to read ticket from sessionStorage
      let ticket: string | null = null;
      try {
        ticket = window.sessionStorage.getItem('__sso_exchange_ticket');
        window.sessionStorage.removeItem('__sso_exchange_ticket');
      } catch (_) {}

      // 2. If not in sessionStorage, check hash fragment (#ticket=sso_...) which is never sent to servers/proxies
      if (!ticket && typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        ticket = params.get('ticket');
        // Clear hash immediately from browser URL without adding to history
        window.history.replaceState(null, '', window.location.pathname);
      }

      if (!ticket || !ticket.startsWith('sso_')) {
        if (isMounted) {
          setError('No valid single-use SSO authorization ticket was supplied.');
          setIsExchanging(false);
        }
        return;
      }

      try {
        const apiEndpoint = process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/sso-exchange`
          : `${API_BASE_URL}/api/v1/auth/sso-exchange`;

        const res = await apiFetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticket }),
        });

        const responseData = await res.json();
        if (!res.ok) {
          throw new Error(responseData.message || 'SSO exchange failed or ticket has expired/replayed.');
        }

        // Store tokens securely in localStorage
        localStorage.setItem('paramantra_access_token', responseData.accessToken);
        localStorage.setItem('paramantra_refresh_token', responseData.refreshToken);
        localStorage.setItem('crm_token', responseData.accessToken);

        if (responseData.session) {
          const userObj = {
            id: responseData.session.userId || responseData.session.id,
            email: responseData.session.email,
            name: responseData.session.name,
            role: responseData.session.role,
            tenantId: responseData.session.tenantId,
            unitId: responseData.session.unitId,
            agentId: responseData.session.agentId || responseData.session.userId,
            sessionId: responseData.session.id,
          };
          localStorage.setItem('paramantra_user', JSON.stringify(userObj));
          localStorage.setItem('crm_user', JSON.stringify(userObj));
          setUser(userObj);

          if (userObj.role === 'SUPER_ADMIN' || userObj.role === 'ADMIN') {
            router.replace('/dashboard');
          } else {
            router.replace('/agent/dashboard');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Authentication error during SSO ticket exchange.');
          setIsExchanging(false);
        }
      }
    };

    performExchange();

    return () => {
      isMounted = false;
    };
  }, [router, setUser]);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#0b0b0b] border border-[#1e1e1e] rounded-2xl shadow-2xl p-8 text-center flex flex-col items-center">
          <div className="w-14 h-14 bg-[#121212] border border-[#2a2a2a] rounded-xl flex items-center justify-center mb-5 shadow-inner">
            <ShieldCheck className="text-orange-500 w-7 h-7" />
          </div>

          <h1 className="text-xl font-bold text-white mb-2">Enterprise Super Admin SSO</h1>

          {isExchanging && !error && (
            <div className="flex flex-col items-center gap-3 my-6">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              <p className="text-sm text-neutral-400">Verifying single-use ticket and establishing session...</p>
            </div>
          )}

          {error && (
            <div className="w-full my-4 p-4 rounded-xl bg-red-950/40 border border-red-800 text-left">
              <p className="text-xs text-red-200 font-medium mb-1">SSO Authentication Failed</p>
              <p className="text-xs text-red-400">{error}</p>
              <button
                type="button"
                onClick={() => router.replace('/login')}
                className="mt-4 w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold transition"
              >
                Return to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

