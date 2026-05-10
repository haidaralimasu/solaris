"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

interface SidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

const NAV_ITEMS = [
  {
    href: "/simulate",
    label: "Simulator",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" />
      </svg>
    ),
  },
  {
    href: "/debug",
    label: "Debugger",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <path fillRule="evenodd" d="M6.56 1.14a.75.75 0 0 1 .177 1.045 3.989 3.989 0 0 0-.464.86C6.8 3.16 7.37 3.25 8 3.25c.628 0 1.2-.09 1.727-.205a3.989 3.989 0 0 0-.464-.86.75.75 0 0 1 1.222-.869c.369.519.65 1.105.84 1.34.55.075 1.07.19 1.56.344a.75.75 0 0 1-.496 1.417A13.01 13.01 0 0 0 10.5 4.9v.164c.528.158 1.027.35 1.5.574v-.238a.75.75 0 1 1 1.5 0V6.25h1.5a.75.75 0 0 1 0 1.5H14v.25a2.75 2.75 0 0 1-2 2.646v1.354a.75.75 0 0 1-1.5 0v-1.354a2.75 2.75 0 0 1-2-2.646V7.75H7a.75.75 0 0 1 0-1.5h1.5V5.4a13.01 13.01 0 0 0-1.889.517.75.75 0 0 1-.496-1.417c.49-.154 1.01-.269 1.56-.344.19-.235.471-.821.84-1.34a.75.75 0 0 1 1.045-.176Z" clipRule="evenodd" />
        <path d="M5.5 9.5a.75.75 0 0 0-.75.75v2c0 1.6.8 3.011 2.02 3.866l-1.024 1.37a.75.75 0 1 0 1.207.893l1.093-1.46a5.06 5.06 0 0 0 .954.091h2a5.06 5.06 0 0 0 .954-.091l1.093 1.46a.75.75 0 1 0 1.207-.893l-1.024-1.37A4.99 4.99 0 0 0 15.25 12.25v-2a.75.75 0 0 0-.75-.75H5.5Z" />
      </svg>
    ),
  },
  {
    href: "/circuit-breaker",
    label: "Circuit Breaker",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <path fillRule="evenodd" d="M2 5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v.75a.75.75 0 0 1-1.5 0V5A1.5 1.5 0 0 0 15 3.5H5A1.5 1.5 0 0 0 3.5 5v10A1.5 1.5 0 0 0 5 16.5h10a1.5 1.5 0 0 0 1.5-1.5v-.75a.75.75 0 0 1 1.5 0V15a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5Zm11.78 4.22a.75.75 0 0 1 0 1.06l-2 2a.75.75 0 1 1-1.06-1.06l.72-.72H7a.75.75 0 0 1 0-1.5h4.44l-.72-.72a.75.75 0 0 1 1.06-1.06l2 2Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: "/alerts",
    label: "Alerts",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M4.214 3.227a.75.75 0 0 0-1.156-.956 8.97 8.97 0 0 0-1.856 5.285.75.75 0 0 0 1.498.063 7.47 7.47 0 0 1 1.514-4.392Zm11.73.987a.75.75 0 0 0-1.156.956 7.47 7.47 0 0 1 1.514 4.392.75.75 0 0 0 1.498-.063 8.97 8.97 0 0 0-1.856-5.285ZM10 2a6 6 0 0 0-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 0 0 .515 1.076 32.094 32.094 0 0 0 3.256.508 3.5 3.5 0 0 0 6.972 0 32.093 32.093 0 0 0 3.256-.508.75.75 0 0 0 .515-1.076A11.448 11.448 0 0 1 16 8a6 6 0 0 0-6-6Zm0 14.5a2 2 0 0 1-1.95-1.557 32.433 32.433 0 0 0 3.9 0A2 2 0 0 1 10 16.5Z" />
      </svg>
    ),
  },
  {
    href: "/inspect",
    label: "Program Inspector",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" />
      </svg>
    ),
  },
  {
    href: "/wallet",
    label: "Wallet Tracker",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M1 4.25a3.733 3.733 0 0 1 2.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0 0 16.75 2H3.25A2.25 2.25 0 0 0 1 4.25ZM1 7.25a3.733 3.733 0 0 1 2.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0 0 16.75 5H3.25A2.25 2.25 0 0 0 1 7.25ZM7 8a1 1 0 0 0-1 1 8 8 0 0 0 8 8h2a2.25 2.25 0 0 0 2.25-2.25v-1a2.25 2.25 0 0 0-2.25-2.25h-2a1 1 0 0 0-1 1v1.5a1 1 0 0 1-2 0V9a1 1 0 0 0-1-1H7Z" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
      </svg>
    ),
  },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 p-3">
      <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#2A3E52]">
        Tools
      </p>
      <div className="space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-all
                ${isActive ? "text-[#F5A623]" : "text-[#4A6478] hover:text-[#9AAFC2]"}`}
              style={isActive ? {
                background: "rgba(245,166,35,0.06)",
                boxShadow: "inset 0 0 0 1px rgba(245,166,35,0.1)",
              } : undefined}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full"
                  style={{ background: "#F5A623", boxShadow: "0 0 8px #F5A623" }}
                />
              )}
              <span style={isActive ? { filter: "drop-shadow(0 0 4px rgba(245,166,35,0.5))" } : undefined}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function WalletWidget() {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  if (connecting) {
    return (
      <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl border border-[#1B2C3E] px-3 py-2">
        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#F5A623]" />
        <span className="text-[11px] text-[#4A6478]">Connecting…</span>
      </div>
    );
  }

  if (publicKey) {
    const addr = publicKey.toBase58();
    const short = addr.slice(0, 4) + "…" + addr.slice(-4);
    return (
      <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.12)" }}>
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#22C55E]" style={{ boxShadow: "0 0 5px #22C55E" }} />
        <span className="flex-1 font-mono text-[11px] text-[#22C55E]" title={addr}>{short}</span>
        <button
          onClick={() => disconnect()}
          className="text-[#2A3E52] transition-colors hover:text-[#EF4444] text-[10px] font-bold uppercase tracking-wider"
          title="Disconnect wallet"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      className="mx-3 mb-2 flex w-[calc(100%-1.5rem)] items-center gap-2 rounded-xl border border-[#1B2C3E] px-3 py-2 text-[12px] font-semibold text-[#4A6478] transition-all hover:border-[#F5A623]/25 hover:text-[#9AAFC2]"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 flex-shrink-0">
        <path d="M1 4.25a3.733 3.733 0 0 1 2.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0 0 16.75 2H3.25A2.25 2.25 0 0 0 1 4.25ZM1 7.25a3.733 3.733 0 0 1 2.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0 0 16.75 5H3.25A2.25 2.25 0 0 0 1 7.25ZM7 8a1 1 0 0 0-1 1 8 8 0 0 0 8 8h2a2.25 2.25 0 0 0 2.25-2.25v-1a2.25 2.25 0 0 0-2.25-2.25h-2a1 1 0 0 0-1 1v1.5a1 1 0 0 1-2 0V9a1 1 0 0 0-1-1H7Z" />
      </svg>
      Connect Wallet
    </button>
  );
}

function UserFooter({ user }: { user: SidebarProps["user"] }) {
  if (!user) {
    return (
      <div className="border-t border-[#0E1925] p-3">
        <Link
          href="/sign-in"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#152030] px-3 py-2.5 text-[13px] font-semibold text-[#4A6478] transition-all hover:border-[#F5A623]/20 hover:text-[#9AAFC2]"
        >
          Sign in
        </Link>
      </div>
    );
  }
  return (
    <div className="border-t border-[#0E1925] p-3">
      <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt={user.name ?? "User"} className="h-7 w-7 rounded-full flex-shrink-0 ring-1 ring-[#152030]" />
        ) : (
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#0C1420] text-xs font-bold text-[#6B8299] ring-1 ring-[#152030]">
            {(user.name ?? user.email ?? "?")[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="truncate text-[13px] font-semibold text-[#F0F4F8]">
            {user.name ?? user.email ?? "User"}
          </p>
          {user.name && user.email && (
            <p className="truncate text-xs text-[#4A6478]">{user.email}</p>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-[#2A3E52] transition-colors hover:text-[#9AAFC2] p-1 rounded-lg"
          title="Sign out"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-.943a.75.75 0 1 0-1.004-1.114l-2.5 2.25a.75.75 0 0 0 0 1.114l2.5 2.25a.75.75 0 1 0 1.004-1.114l-1.048-.943h9.546A.75.75 0 0 0 19 10Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarBg: React.CSSProperties = {
    background: "#03060F",
    borderRight: "1px solid #0E1925",
  };

  const brandSection = (
    <div className="flex h-14 items-center gap-3 px-4" style={{ borderBottom: "1px solid #0E1925" }}>
      <div
        className="flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0"
        style={{ background: "#F5A623", boxShadow: "0 0 12px rgba(245,166,35,0.35)" }}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <path
            d="M13 2L4.09344 12.6879C3.74463 13.1064 3.57023 13.3157 3.56756 13.4925C3.56524 13.6461 3.63372 13.7923 3.75324 13.8889C3.89073 14 4.16209 14 4.70481 14H12L11 22L19.9065 11.3121C20.2553 10.8936 20.4297 10.6843 20.4324 10.5075C20.4347 10.3539 20.3663 10.2077 20.2467 10.1111C20.1092 10 19.8379 10 19.2951 10H12L13 2Z"
            stroke="#03060F"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className="text-[15px] font-bold tracking-tight text-[#F0F4F8]">Solaris</span>
      <span
        className="ml-auto rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
        style={{ background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.15)", color: "rgba(245,166,35,0.6)" }}
      >
        beta
      </span>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:fixed md:left-0 md:top-0 md:z-30 md:flex md:h-screen md:w-56 md:flex-col"
        style={sidebarBg}
      >
        {brandSection}
        <NavLinks pathname={pathname} />
        <WalletWidget />
        <UserFooter user={user} />
      </aside>

      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-3 px-4"
        style={{ background: "#03060F", borderBottom: "1px solid #0E1925" }}
      >
        <div className="flex items-center gap-2.5 flex-1">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ background: "#F5A623", boxShadow: "0 0 8px rgba(245,166,35,0.3)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
              <path d="M13 2L4.09344 12.6879C3.74463 13.1064 3.57023 13.3157 3.56756 13.4925C3.56524 13.6461 3.63372 13.7923 3.75324 13.8889C3.89073 14 4.16209 14 4.70481 14H12L11 22L19.9065 11.3121C20.2553 10.8936 20.4297 10.6843 20.4324 10.5075C20.4347 10.3539 20.3663 10.2077 20.2467 10.1111C20.1092 10 19.8379 10 19.2951 10H12L13 2Z" fill="#03060F" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight text-[#F0F4F8]">Solaris</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4A6478] transition-colors hover:text-[#9AAFC2]"
          style={{ background: "#070D17", border: "1px solid #0E1925" }}
          aria-label="Open menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-50 backdrop-blur-sm"
            style={{ background: "rgba(3,6,15,0.8)" }}
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="md:hidden fixed left-0 top-0 z-50 flex h-screen w-64 flex-col"
            style={sidebarBg}
          >
            <div className="flex h-14 items-center gap-3 px-4" style={{ borderBottom: "1px solid #0E1925" }}>
              <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: "#F5A623" }}>
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                  <path d="M13 2L4.09344 12.6879C3.74463 13.1064 3.57023 13.3157 3.56756 13.4925C3.56524 13.6461 3.63372 13.7923 3.75324 13.8889C3.89073 14 4.16209 14 4.70481 14H12L11 22L19.9065 11.3121C20.2553 10.8936 20.4297 10.6843 20.4324 10.5075C20.4347 10.3539 20.3663 10.2077 20.2467 10.1111C20.1092 10 19.8379 10 19.2951 10H12L13 2Z" fill="#03060F" />
                </svg>
              </div>
              <span className="text-sm font-bold text-[#F0F4F8]">Solaris</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-[#4A6478] hover:text-[#9AAFC2] transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            <WalletWidget />
            <UserFooter user={user} />
          </aside>
        </>
      )}
    </>
  );
}
