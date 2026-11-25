import React, { useEffect, useState } from 'react';
import {
  Bell,
  Bookmark,
  CalendarDays,
  Camera,
  Dna,
  Film,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Palette,
  ScanSearch,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { NotificationItem, StudioTab } from '../types/stylesync';

interface StudioShellProps {
  activeTab: StudioTab;
  onChangeTab: (tab: StudioTab) => void;
  onReturnLanding: () => void;
  children: React.ReactNode;
}

interface NavItem {
  id: StudioTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Home Studio', icon: LayoutDashboard, group: 'Overview' },
  { id: 'fashion-twin', label: 'Fashion Twin', icon: Dna, group: 'Overview' },
  { id: 'style-analysis', label: 'Style Analysis', icon: Camera, group: 'AI Styling Lab' },
  { id: 'ai-stylist', label: 'AI Stylist', icon: Sparkles, group: 'AI Styling Lab' },
  { id: 'stylist-chat', label: 'Stylist Chat', icon: MessageSquare, group: 'AI Styling Lab' },
  { id: 'virtual-try-on', label: 'Virtual Try-On', icon: Wand2, group: 'AI Styling Lab' },
  { id: 'runway-video', label: 'Runway Video', icon: Film, group: 'AI Styling Lab' },
  { id: 'color-lab', label: 'Color Lab', icon: Palette, group: 'AI Styling Lab' },
  { id: 'match-decode', label: 'Match & Recreate', icon: ScanSearch, group: 'Wardrobe & Planning' },
  { id: 'wardrobe', label: 'Digital Wardrobe', icon: Shirt, group: 'Wardrobe & Planning' },
  { id: 'calendar-travel', label: 'Calendar & Travel', icon: CalendarDays, group: 'Wardrobe & Planning' },
  { id: 'saved-decision', label: 'Saved & Compare', icon: Bookmark, group: 'Wardrobe & Planning' },
  { id: 'smart-shopping', label: 'Smart Shopping', icon: ShoppingBag, group: 'Shopping & Fit' },
];

export const StudioShell: React.FC<StudioShellProps> = ({
  activeTab,
  onChangeTab,
  onReturnLanding,
  children,
}) => {
  const { dbUser, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    apiFetch<{ notifications: NotificationItem[] }>('/api/notifications')
      .then((d) => setNotifications(d.notifications || []))
      .catch(() => {});
  }, [activeTab]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markRead = async (id: number) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      // ignore
    }
  };

  const groups = ['Overview', 'AI Styling Lab', 'Wardrobe & Planning', 'Shopping & Fit'];
  const currentTitle =
    NAV_ITEMS.find((i) => i.id === activeTab)?.label ||
    (activeTab === 'admin' ? 'Admin Console' : 'Home Studio');

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1917] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#F4EFE8] border-r border-[#E7E2DA]">
        <div className="px-6 py-5 border-b border-[#E7E2DA] flex items-center justify-between">
          <button
            onClick={onReturnLanding}
            className="font-editorial text-2xl font-semibold text-[#1C1917] cursor-pointer"
          >
            StyleSync AI
          </button>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-6 overflow-y-auto">
          {groups.map((group) => (
            <div key={group}>
              <div className="px-3 mb-2 text-[11px] font-semibold tracking-wide text-[#78716C]">
                {group}
              </div>
              <div className="space-y-1">
                {NAV_ITEMS.filter((n) => n.group === group).map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onChangeTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? 'bg-[#1C1917] text-white'
                          : 'text-[#44403C] hover:bg-[#EAE3D9] hover:text-[#1C1917]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {dbUser?.role === 'admin' && (
            <div>
              <div className="px-3 mb-2 text-[11px] font-semibold tracking-wide text-[#78716C]">
                Administration
              </div>
              <button
                onClick={() => onChangeTab('admin')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-[#1C1917] text-white'
                    : 'text-[#44403C] hover:bg-[#EAE3D9] hover:text-[#1C1917]'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Admin Console</span>
              </button>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-[#E7E2DA]">
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#1C1917] truncate">
                {dbUser?.displayName || dbUser?.email}
              </div>
              <div className="text-xs text-[#57534E] truncate">{dbUser?.email}</div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-2 text-[#57534E] hover:text-[#1C1917] rounded-lg hover:bg-[#EAE3D9] cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-[#F4EFE8] h-full flex flex-col border-r border-[#E7E2DA] z-10">
            <div className="px-5 py-4 border-b border-[#E7E2DA] flex items-center justify-between">
              <span className="font-editorial text-2xl font-semibold">StyleSync AI</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onChangeTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
                      active ? 'bg-[#1C1917] text-white' : 'text-[#44403C] hover:bg-[#EAE3D9]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              {dbUser?.role === 'admin' && (
                <button
                  onClick={() => {
                    onChangeTab('admin');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-[#1C1917] text-white'
                      : 'text-[#44403C] hover:bg-[#EAE3D9]'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin Console</span>
                </button>
              )}
            </nav>
            <div className="p-4 border-t border-[#E7E2DA]">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-white border border-[#E2DBD0] rounded-lg cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-[#FAF8F5]/95 backdrop-blur-sm border-b border-[#E7E2DA]">
          <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg border border-[#E2DBD0] bg-white cursor-pointer"
                aria-label="Open navigation"
              >
                <Menu className="w-4 h-4" />
              </button>
              <div className="text-sm text-[#57534E] truncate">
                <span className="hidden sm:inline">StyleSync Studio / </span>
                <span className="font-semibold text-[#1C1917]">{currentTitle}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 relative">
              <button
                onClick={() => onChangeTab('ai-stylist')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#9D5C63] rounded-lg hover:bg-[#864B52] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ask AI Stylist
              </button>

              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative p-2 rounded-lg border border-[#E2DBD0] bg-white hover:bg-[#F2EDE6] cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 text-[#1C1917]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#9D5C63] text-white text-[10px] font-mono-num flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-12 w-80 bg-white border border-[#E7E2DA] rounded-xl shadow-lg p-4 z-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#1C1917]">Notifications</span>
                    <button
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-[#57534E] py-3">
                      No alerts yet. Enable price tracking on wishlist items to get updates.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markRead(n.id)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer ${
                            n.isRead
                              ? 'bg-[#FAF8F5] border-[#E7E2DA] text-[#57534E]'
                              : 'bg-white border-[#9D5C63]/40 text-[#1C1917]'
                          }`}
                        >
                          <div className="font-semibold">{n.title}</div>
                          <div className="mt-0.5">{n.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-[1200px] w-full mx-auto px-5 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
};
