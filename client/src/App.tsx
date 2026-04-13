import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Admin from "@/pages/admin";

const queryClient = new QueryClient();

function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-black text-gray-900 mb-2">404</h1>
        <p className="text-gray-400">Page not found</p>
        <a href="/" className="mt-4 inline-block text-blue-500 hover:underline">Go home</a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
