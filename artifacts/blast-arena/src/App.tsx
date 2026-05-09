import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

import Home from "@/pages/home";
import Admin from "@/pages/admin";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(102 74% 51%)", // lime green
    colorForeground: "hsl(225 25% 93%)",
    colorMutedForeground: "hsl(225 15% 70%)",
    colorDanger: "hsl(0 84% 60%)",
    colorBackground: "hsl(240 17% 8%)", // surface #111118
    colorInput: "hsl(240 10% 15%)",
    colorInputForeground: "hsl(225 25% 93%)",
    colorNeutral: "hsl(240 10% 20%)",
    fontFamily: "Rajdhani, sans-serif",
    borderRadius: "0px",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#111118] border border-[#1E90FF]/30 w-[440px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-bold tracking-wider text-[#5DDE26]",
    headerSubtitle: "text-[#E8EAF0]/70",
    socialButtonsBlockButtonText: "text-[#E8EAF0] font-semibold tracking-wide",
    formFieldLabel: "text-[#E8EAF0] uppercase tracking-wider text-sm",
    footerActionLink: "text-[#5DDE26] hover:text-[#1E90FF] transition-colors",
    footerActionText: "text-[#E8EAF0]/70",
    dividerText: "text-[#E8EAF0]/50",
    identityPreviewEditButton: "text-[#1E90FF]",
    formFieldSuccessText: "text-[#5DDE26]",
    alertText: "text-[#E8EAF0]",
    logoBox: "mb-6 flex justify-center",
    logoImage: "h-12 w-auto",
    socialButtonsBlockButton: "border-[#1E90FF]/30 hover:border-[#1E90FF] hover:bg-[#1E90FF]/10 transition-colors clip-diagonal",
    formButtonPrimary: "bg-[#5DDE26] text-black hover:bg-[#5DDE26]/80 clip-diagonal uppercase font-bold tracking-wider",
    formFieldInput: "bg-[#0A0A0F] border-[#1E90FF]/30 focus:border-[#5DDE26] transition-colors text-[#E8EAF0] font-sans",
    footerAction: "mt-4",
    dividerLine: "bg-[#1E90FF]/20",
    alert: "border-[#1E90FF]/30 bg-[#1E90FF]/10",
    otpCodeFieldInput: "border-[#1E90FF]/30 text-[#E8EAF0]",
    formFieldRow: "mb-4",
    main: "w-full",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 scanlines">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 scanlines">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);
  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/admin" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function ProtectedAdmin() {
  return (
    <>
      <Show when="signed-in">
        <Admin />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/admin" component={ProtectedAdmin} />
          <Route>
            <div className="flex h-screen items-center justify-center">
              <h1 className="text-4xl text-destructive font-heading glitch-text" data-text="404 NOT FOUND">404 NOT FOUND</h1>
            </div>
          </Route>
        </Switch>
        <Toaster />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;