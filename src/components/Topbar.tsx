import { Menu, LogOut, Search, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useTheme } from '../context/ThemeContext';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const initials = (admin?.name ?? 'A')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="h-16 shrink-0 border-b bg-background/80 backdrop-blur sticky top-0 z-20 flex items-center gap-3 px-4 md:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu}>
        <Menu className="size-5" />
      </Button>

      <div className="relative flex-1 max-w-md hidden sm:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Search…" className="pl-9 bg-muted/50 border-transparent" />
      </div>

      <div className="flex-1 sm:hidden" />

      <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
        {theme === 'dark' ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-accent transition-colors">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">{initials}</AvatarFallback>
            </Avatar>
            <div className="text-left hidden md:block leading-tight">
              <div className="text-sm font-medium">{admin?.name}</div>
              <div className="text-xs text-muted-foreground">{admin?.email}</div>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{admin?.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/settings')}>Settings</DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
