import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context';
import { Role } from '@/types';
import axios from 'axios';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user was redirected due to expired token
  const searchParams = new URLSearchParams(location.search);
  const sessionExpired = searchParams.get('expired') === 'true';

  // Client-side form validation
  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const user = await login({
        email: email.trim(),
        password,
      });

      // Role-based redirection after successful authentication
      if (user.role === Role.ADMIN) {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === Role.SALES_EXECUTIVE) {
        navigate('/executive/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const errorMsg =
          err.response?.data?.message ||
          (err.response?.status === 401
            ? 'Invalid email or password'
            : 'Authentication failed. Please verify your credentials.');
        setServerError(errorMsg);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('An unexpected error occurred during login.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to prefill demo accounts
  const fillDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrors({});
    setServerError(null);
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-7 sm:p-8 shadow-[0_12px_32px_-4px_rgba(99,54,245,0.06),0_4px_12px_-2px_rgba(17,24,39,0.03)] transition-all">
      {/* Brand Header */}
      <div className="mb-7 text-center">
        <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6336F5] to-[#4F24E8] text-white shadow-md shadow-[#6336F5]/25 ring-4 ring-[#E4DCFF]/50">
          <span className="font-bold tracking-tight text-lg text-white font-sans">PG</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111827]">
          PGfy Sales CRM
        </h1>
        <p className="mt-1 text-xs font-medium text-[#64748B]">
          Internal Lead Management &amp; Call Tracking System
        </p>
      </div>

      {/* Session Expired Banner */}
      {sessionExpired && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[#E4DCFF] bg-[#F2EEFF] p-3 text-xs text-[#4F24E8]">
          <AlertCircle className="h-4 w-4 shrink-0 text-[#6336F5]" />
          <span className="font-medium">Your session has expired. Please sign in again.</span>
        </div>
      )}

      {/* Server Error Alert */}
      {serverError && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1 font-medium">{serverError}</div>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold uppercase tracking-wider text-[#111827]"
          >
            Work Email
          </label>
          <div className="relative mt-1.5">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#64748B]">
              <Mail className="h-4 w-4" />
            </div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="e.g. admin@pgfy.demo"
              disabled={isSubmitting}
              className={`w-full rounded-xl border py-2.5 pl-10 pr-3.5 text-sm text-[#111827] placeholder-[#64748B]/60 transition-all duration-150 focus:outline-none disabled:bg-[#F7F9FC] disabled:cursor-not-allowed ${
                errors.email
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-[#E2E8F0] bg-white focus:border-[#6336F5] focus:ring-2 focus:ring-[#6336F5]/20'
              }`}
            />
          </div>
          {errors.email && (
            <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.email}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-[#111827]"
            >
              Password
            </label>
          </div>
          <div className="relative mt-1.5">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#64748B]">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder="••••••••"
              disabled={isSubmitting}
              className={`w-full rounded-xl border py-2.5 pl-10 pr-10 text-sm text-[#111827] placeholder-[#64748B]/60 transition-all duration-150 focus:outline-none disabled:bg-[#F7F9FC] disabled:cursor-not-allowed ${
                errors.password
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-[#E2E8F0] bg-white focus:border-[#6336F5] focus:ring-2 focus:ring-[#6336F5]/20'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              tabIndex={-1}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#64748B] hover:text-[#111827] transition-colors focus:outline-none"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.password}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="group mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6336F5] to-[#4F24E8] py-2.5 px-4 text-sm font-semibold text-white shadow-md shadow-[#6336F5]/25 transition-all duration-200 hover:from-[#572be0] hover:to-[#431ecd] hover:shadow-lg hover:shadow-[#6336F5]/35 focus:outline-none focus:ring-2 focus:ring-[#6336F5] focus:ring-offset-2 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:from-[#6336F5] disabled:hover:to-[#4F24E8]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span>Verifying credentials...</span>
            </>
          ) : (
            <>
              <span>Sign in to CRM</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      {/* Demo Accounts Quick Selection */}
      <div className="mt-6 border-t border-[#E2E8F0] pt-5">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#64748B] text-center mb-3">
          Quick Demo Accounts
        </span>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <button
            type="button"
            onClick={() => fillDemoAccount('admin@pgfy.demo', 'Admin@123')}
            className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all duration-150 ${
              email === 'admin@pgfy.demo'
                ? 'border-[#6336F5] bg-[#F2EEFF] ring-1 ring-[#6336F5]/40 shadow-xs'
                : 'border-[#E2E8F0] bg-white hover:border-[#6336F5]/60 hover:bg-[#F2EEFF]/40 hover:shadow-xs'
            }`}
          >
            <span
              className={`font-semibold text-[11px] ${
                email === 'admin@pgfy.demo' ? 'text-[#4F24E8]' : 'text-[#111827]'
              }`}
            >
              Admin
            </span>
            <span className="text-[10px] text-[#64748B] truncate w-full mt-0.5">admin@pgfy</span>
          </button>
          <button
            type="button"
            onClick={() => fillDemoAccount('sales@pgfy.demo', 'Sales@123')}
            className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all duration-150 ${
              email === 'sales@pgfy.demo'
                ? 'border-[#6336F5] bg-[#F2EEFF] ring-1 ring-[#6336F5]/40 shadow-xs'
                : 'border-[#E2E8F0] bg-white hover:border-[#6336F5]/60 hover:bg-[#F2EEFF]/40 hover:shadow-xs'
            }`}
          >
            <span
              className={`font-semibold text-[11px] ${
                email === 'sales@pgfy.demo' ? 'text-[#4F24E8]' : 'text-[#111827]'
              }`}
            >
              Exec 1
            </span>
            <span className="text-[10px] text-[#64748B] truncate w-full mt-0.5">sales@pgfy</span>
          </button>
          <button
            type="button"
            onClick={() => fillDemoAccount('sales2@pgfy.demo', 'Sales2@123')}
            className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all duration-150 ${
              email === 'sales2@pgfy.demo'
                ? 'border-[#6336F5] bg-[#F2EEFF] ring-1 ring-[#6336F5]/40 shadow-xs'
                : 'border-[#E2E8F0] bg-white hover:border-[#6336F5]/60 hover:bg-[#F2EEFF]/40 hover:shadow-xs'
            }`}
          >
            <span
              className={`font-semibold text-[11px] ${
                email === 'sales2@pgfy.demo' ? 'text-[#4F24E8]' : 'text-[#111827]'
              }`}
            >
              Exec 2
            </span>
            <span className="text-[10px] text-[#64748B] truncate w-full mt-0.5">sales2@pgfy</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
