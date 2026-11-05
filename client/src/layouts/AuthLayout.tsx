import { Outlet } from 'react-router-dom';

/**
 * Auth layout — SaaS authentication canvas styled to match the Admin Dashboard
 * with soft cool background (#F7F9FC), subtle purple radial glows, and geometric accents.
 */
export function AuthLayout() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#F7F9FC] px-4 py-8 sm:px-6 lg:px-8 overflow-hidden">
      {/* Decorative background ambient glows & geometric elements matching dashboard theme */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Top-right subtle purple ambient glow */}
        <div
          className="absolute -top-32 -right-32 h-96 w-96 rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(99, 54, 245, 0.09) 0%, rgba(242, 238, 255, 0.05) 50%, transparent 70%)',
          }}
        />

        {/* Bottom-left dark purple ambient glow */}
        <div
          className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(79, 36, 232, 0.07) 0%, rgba(242, 238, 255, 0.04) 50%, transparent 70%)',
          }}
        />

        {/* Center soft purple aura behind card */}
        <div
          className="absolute top-1/2 left-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(242, 238, 255, 0.45) 0%, rgba(99, 54, 245, 0.03) 50%, transparent 75%)',
          }}
        />

        {/* Minimal abstract curved line accents */}
        <svg
          className="absolute top-0 right-0 h-80 w-80 text-[#6336F5]/[0.05]"
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="400" cy="0" r="320" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="400" cy="0" r="220" stroke="currentColor" strokeWidth="1" strokeDasharray="5 5" />
          <circle cx="400" cy="0" r="120" stroke="currentColor" strokeWidth="1.5" />
        </svg>

        <svg
          className="absolute bottom-0 left-0 h-80 w-80 text-[#4F24E8]/[0.05]"
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="0" cy="400" r="320" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="0" cy="400" r="220" stroke="currentColor" strokeWidth="1" strokeDasharray="5 5" />
          <circle cx="0" cy="400" r="120" stroke="currentColor" strokeWidth="1.5" />
        </svg>

        {/* Subtle dot matrix texture matching purple accent */}
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: 'radial-gradient(#6336F5 0.75px, transparent 0.75px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Main card container */}
      <div className="relative z-10 w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
