import { Link } from 'react-router';
import { Button } from '../components/ui/button';

export function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-muted/30 p-4 text-center">
      <div className="text-6xl font-semibold text-muted-foreground/40">404</div>
      <p className="text-muted-foreground">This page doesn’t exist.</p>
      <Button asChild>
        <Link to="/">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
