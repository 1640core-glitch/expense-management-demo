import { Ref, useState, FormEvent } from 'react';
import { Bell, Menu, Search, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from '../ui';
import { useAuth } from '../../context/AuthContext';

export interface TopbarProps {
  onOpenDrawer: () => void;
  notificationCount?: number;
  searchInputRef?: Ref<HTMLInputElement>;
}

export function Topbar({ onOpenDrawer, notificationCount = 0, searchInputRef }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    void logout();
  };

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/expenses?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="flex items-center gap-3 h-14 px-4 bg-surface border-b border-border">
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden"
        onClick={onOpenDrawer}
        aria-label="メニューを開く"
      >
        <Menu size={20} />
      </Button>

      <form
        role="search"
        onSubmit={handleSearchSubmit}
        className="hidden sm:flex items-center flex-1 max-w-md relative"
      >
        <button
          type="submit"
          aria-label="検索を実行"
          className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Search size={16} aria-hidden="true" />
        </button>
        <Input
          ref={searchInputRef}
          type="search"
          placeholder="検索..."
          className="pl-9"
          aria-label="検索"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </form>

      <div className="flex-1 sm:hidden" />

      <Button
        variant="ghost"
        size="sm"
        aria-label="通知"
        className="relative"
        onClick={() => navigate('/notifications')}
      >
        <Bell size={18} />
        {notificationCount > 0 && (
          <Badge variant="danger" size="sm" className="absolute -top-1 -right-1">
            {notificationCount}
          </Badge>
        )}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-md hover:bg-bg px-2 py-1"
            aria-label="ユーザーメニュー"
          >
            <Avatar name={user?.name} size="sm" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {user && (
            <>
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm text-text">{user.name}</span>
                  <span className="text-xs text-text-muted">{user.role}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onSelect={handleLogout}>
            <LogOut size={14} className="mr-2" />
            ログアウト
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
