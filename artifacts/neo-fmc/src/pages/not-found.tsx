import { Link } from "wouter";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center bg-background">
      <div className="premium-card p-12 text-center max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
            <AlertCircle size={40} />
          </div>
        </div>
        <h1 className="text-4xl font-display font-bold text-foreground mb-4">404</h1>
        <p className="text-lg text-muted-foreground mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link 
          href="/" 
          className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
