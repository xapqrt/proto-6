'use client'; // Top-level layout now needs to be client due to hooks

import React, { useMemo, useCallback, useEffect } from 'react'; // Added useEffect
import './globals.css';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarFooter, // Import SidebarFooter
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  CreditCard,
  Bot,
  FileText,
  Upload,
  ListChecks, // Added icons
  Activity,
  Clock,
  Target,
  LogOut, // Added Logout icon
} from 'lucide-react';
import Link from 'next/link';
import { Toaster } from '@/components/ui/toaster';
import { Logo } from '@/components/ui/logo';
import { usePathname, useRouter } from 'next/navigation'; // Import usePathname and useRouter
import { cn } from '@/lib/utils';
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { AuthProvider, useAuth } from '@/hooks/use-auth'; // Import AuthProvider and useAuth
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react'; // Import Loader

import Dashboard from './dashboard/page';
import Materials from './materials/page';
import Goals from './goals/page';
import Tasks from './tasks/page';
import Habits from './habits/page';
import Timer from './timer/page';
import Flashcards from './flashcards/page';
import Notes from './notes/page';
import Assistant from './assistant/page';
import Login from './login/page';
import Signup from './signup/page';

import { BrowserRouter, Routes, Route, NavLink } from "react-router";

export default function RootLayout() {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <SidebarProvider defaultOpen={true}>
              <BrowserRouter>
                <AppContent />
              </BrowserRouter>
            </SidebarProvider>
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

function AppContent() {
  const { isMobile, setOpenMobile, state: sidebarState } = useSidebar();
  const { user, signOut, loading: authLoading } = useAuth();

  const menuItems = useMemo(() => [
    { path: "/", label: "Dashboard", icon: <LayoutDashboard /> },
    { path: "/materials", label: "Materials", icon: <Upload /> },
    { path: "/goals", label: "Goals", icon: <Target /> },
    { path: "/tasks", label: "Tasks", icon: <ListChecks /> },
    { path: "/habits", label: "Habits", icon: <Activity /> },
    { path: "/timer", label: "Timer", icon: <Clock /> },
    { path: "/flashcards", label: "Flashcards", icon: <CreditCard /> },
    { path: "/notes", label: "Notes", icon: <FileText /> },
    { path: "/assistant", label: "AI Assistant", icon: <Bot /> },
  ], []);

  const showSidebar = user && !authLoading;

  return (
    <div className={cn('flex min-h-screen w-full', 'antialiased font-sans')}>
      {showSidebar && (
        <Sidebar
          variant="sidebar"
          collapsible="icon"
          className="border-r border-sidebar-border/50"
          data-state={sidebarState}
        >
          <SidebarHeader>
            <Logo />
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <NavLink to={item.path}>
                  <SidebarMenuButton
                    tooltip={item.label}
                    className="hover-glow"
                    onClick={() => isMobile && setOpenMobile(false)}
                  >
                    {item.icon}
                    {/* <NavLink to={item.path}>{item.label}</NavLink> */}

                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="flex items-center justify-between p-4 border-t border-sidebar-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="hover-glow w-full justify-start"
              disabled={authLoading}
            >
              {authLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4 mr-2" />
              )}
              <span className={cn(sidebarState === 'collapsed' && 'md:hidden')}>Logout</span>
            </Button>
            <ThemeToggleButton />
          </SidebarFooter>
        </Sidebar>
      )}
      <SidebarInset
        className={cn(
          "flex-1 transition-[padding-left] duration-200 ease-linear",
          showSidebar && (
            sidebarState === 'collapsed'
              ? 'md:pl-[calc(var(--sidebar-width-icon,4rem))]'
              : 'md:pl-[calc(var(--sidebar-width,16rem))]'
          ),
          "p-4 md:p-8 space-y-8"
        )}
      >
        This is the dashboard part
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/timer" element={<Timer />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          {/* <Route path="*" element={<Navigate to="/" />} /> */}
        </Routes>
      </SidebarInset>
    </div>
  );
}


    