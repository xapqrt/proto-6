'use client'; // Top-level layout now needs to be client due to hooks

import React, { useMemo, useEffect } from 'react';
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
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  CreditCard,
  Bot,
  FileText,
  Upload,
  ListChecks,
  Activity,
  Clock,
  Target,
  LogOut,
} from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { AuthGuard } from "../providers/auth-guard";
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// React Router imports
import { BrowserRouter, Routes, Route, Link as RouterLink, useLocation } from 'react-router-dom';

// Import page components with correct absolute paths
import DashboardPage from './dashboard/page';
import MaterialsPage from './materials/page';
import GoalsPage from './goals/page';
import TasksPage from './tasks/page';
import HabitsPage from './habits/page';
import TimerPage from './timer/page';
import FlashcardsPage from './flashcards/page';
import NotesPage from './notes/page';
import AssistantPage from './assistant/page';
import LoginPage from './login/page';
import SignupPage from './signup/page';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <AuthGuard>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <BrowserRouter>
                <SidebarProvider defaultOpen={true}>
                  <AppContent />
                </SidebarProvider>
                <Toaster />
              </BrowserRouter>
            </ThemeProvider>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}

function AppContent() {
  const { isMobile, setOpenMobile, state: sidebarState } = useSidebar();
  const { user, signOut, loading: authLoading } = useAuth();
  const location = useLocation();
  
  const menuItems = useMemo(() => [
    { path: "/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
    { path: "/materials", label: "Materials", icon: <Upload /> },
    { path: "/goals", label: "Goals", icon: <Target /> },
    { path: "/tasks", label: "Tasks", icon: <ListChecks /> },
    { path: "/habits", label: "Habits", icon: <Activity /> },
    { path: "/timer", label: "Timer", icon: <Clock /> },
    { path: "/flashcards", label: "Flashcards", icon: <CreditCard /> },
    { path: "/notes", label: "Notes", icon: <FileText /> },
    { path: "/assistant", label: "Assistant", icon: <Bot /> },
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
                  <RouterLink to={item.path}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      className={cn("hover-glow", location.pathname === item.path && "bg-accent")}
                      onClick={() => isMobile && setOpenMobile(false)}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </RouterLink>
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
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/materials" element={<MaterialsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/timer" element={<TimerPage />} />
          <Route path="/flashcards" element={<FlashcardsPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </SidebarInset>
    </div>
  );
}


