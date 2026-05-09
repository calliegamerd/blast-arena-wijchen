import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { Toaster } from "@/components/ui/toaster";

import Home from "@/pages/home";
import Admin from "@/pages/admin";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/admin" component={Admin} />
          <Route>
            <div className="flex h-screen items-center justify-center bg-background">
              <h1 className="text-4xl font-heading text-destructive glitch-text" data-text="404">404</h1>
            </div>
          </Route>
        </Switch>
        <Toaster />
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
