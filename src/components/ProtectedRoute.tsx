import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, appUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in with Google at all
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in, but email is not in the AppUsers table
  if (!appUser) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="max-w-md w-full p-8 bg-card border rounded-xl shadow-sm text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Access Pending</h2>
          <p className="text-muted-foreground mb-6">
            You have successfully authenticated as <span className="font-medium text-foreground">{user.email}</span>, but you do not have permission to access the application yet.
          </p>
          <p className="text-sm text-muted-foreground">
            Please ask an administrator to add your email address to the allowed users list.
          </p>
        </div>
      </div>
    );
  }

  // Authorized user
  return <>{children}</>;
};
