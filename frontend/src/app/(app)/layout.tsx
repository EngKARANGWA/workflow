"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { notifications as notificationsApi } from "@/lib/api";
import { Dropdown, DropdownButton } from "@/components/Dropdown";
import { QuickSearch } from "@/components/QuickSearch";
import {
  IconBell,
  IconChartBar,
  IconChevronDown,
  IconDocument,
  IconMenu,
  IconPlus,
  IconTag,
  IconUsers,
  IconWorkflow,
} from "@/components/icons";
import { initials } from "@/lib/initials";

function SidebarLink({
  href,
  icon,
  children,
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/requests" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-blue-600 text-white" : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}

function SidebarContent({
  isAdmin,
  isApproverOrAdmin,
  onNavigate,
}: {
  isAdmin: boolean;
  isApproverOrAdmin: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-4 pt-5">
        <span className="text-lg font-semibold text-white">Workflow Engine</span>
      </div>
      <div className="px-3 pb-4">
        <Link
          href="/requests/new"
          onClick={onNavigate}
          className="flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <IconPlus className="h-4 w-4" />
          New request
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        <SidebarLink href="/requests" icon={<IconDocument className="h-4.5 w-4.5" />} onNavigate={onNavigate}>
          Requests
        </SidebarLink>
        {isApproverOrAdmin && (
          <SidebarLink href="/delegations" icon={<IconUsers className="h-4.5 w-4.5" />} onNavigate={onNavigate}>
            Delegations
          </SidebarLink>
        )}
        {isAdmin && (
          <>
            <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">Admin</p>
            <SidebarLink href="/admin/workflows" icon={<IconWorkflow className="h-4.5 w-4.5" />} onNavigate={onNavigate}>
              Workflows
            </SidebarLink>
            <SidebarLink href="/admin/users" icon={<IconUsers className="h-4.5 w-4.5" />} onNavigate={onNavigate}>
              Users
            </SidebarLink>
            <SidebarLink href="/admin/roles" icon={<IconTag className="h-4.5 w-4.5" />} onNavigate={onNavigate}>
              Roles
            </SidebarLink>
            <SidebarLink href="/admin/reports" icon={<IconChartBar className="h-4.5 w-4.5" />} onNavigate={onNavigate}>
              Reports
            </SidebarLink>
          </>
        )}
      </nav>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    notificationsApi
      .list({ per_page: 20 })
      .then((res) => setUnread(res.data.filter((n) => !n.read_at).length))
      .catch(() => {});
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-neutral-400">Loading...</p>
      </div>
    );
  }

  const isAdmin = user.system_role === "system_administrator";
  const isApproverOrAdmin = isAdmin || user.system_role === "approver";

  return (
    <div className="flex flex-1">
      <aside className="hidden w-60 shrink-0 bg-neutral-900 lg:block">
        <SidebarContent isAdmin={isAdmin} isApproverOrAdmin={isApproverOrAdmin} />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-60 bg-neutral-900 shadow-xl">
            <SidebarContent
              isAdmin={isAdmin}
              isApproverOrAdmin={isApproverOrAdmin}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              title="Open menu"
              aria-label="Open menu"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800 lg:hidden"
            >
              <IconMenu className="h-5 w-5" />
            </button>

            <QuickSearch isAdmin={isAdmin} isApproverOrAdmin={isApproverOrAdmin} />

            <div className="ml-auto flex items-center gap-1.5">
              <Link
                href="/notifications"
                title="Notifications"
                className="relative flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                <IconBell className="h-5 w-5" />
                {unread > 0 && <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-red-500" />}
              </Link>

              <Dropdown
                trigger={({ open }) => (
                  <span
                    className={`ml-1 flex items-center gap-2 rounded-md py-1 pl-1 pr-2 transition-colors ${
                      open ? "bg-gray-100 dark:bg-neutral-800" : "hover:bg-gray-100 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700 dark:bg-neutral-700 dark:text-neutral-200">
                      {initials(user.name)}
                    </span>
                    <IconChevronDown className="h-4 w-4 text-gray-400 dark:text-neutral-500" />
                  </span>
                )}
              >
                <div className="border-b border-gray-100 px-3.5 py-2 dark:border-neutral-800">
                  <p className="text-sm font-medium text-gray-900 dark:text-neutral-100">{user.name}</p>
                  <p className="text-xs capitalize text-gray-500 dark:text-neutral-400">
                    {user.system_role.replace(/_/g, " ")}
                  </p>
                </div>
                <DropdownButton onClick={() => logout()}>Sign out</DropdownButton>
              </Dropdown>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
