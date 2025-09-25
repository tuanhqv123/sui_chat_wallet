import {
  ConnectButton,
  useCurrentWallet,
  useCurrentAccount,
} from "@mysten/dapp-kit";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { MoveUpRight } from "lucide-react";

export function WalletConnect() {
  const { isConnecting } = useCurrentWallet();
  const currentAccount = useCurrentAccount();

  // Debug logging
  console.log(
    "WalletConnect render - isConnecting:",
    isConnecting,
    "currentAccount:",
    currentAccount?.address
  );

  return (
    <div className="flex h-screen bg-bg text-text overflow-hidden fixed inset-0">
      {/* Grid background */}
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
        <div className="text-center max-w-5xl">
          <p className="text-6xl font-heading text-gray-900 mb-3 leading-tight">
            Discover AI-powered insights for crypto and DeFi.
          </p>
          <p className="text-xl text-gray-700 mb-10 leading-relaxed">
            AI-powered crypto and DeFi conversations.
          </p>

          {/* Hidden native ConnectButton to keep Mysten modal behavior */}
          <ConnectButton
            id="hidden-mysten-connect"
            connectText={
              isConnecting
                ? "Connecting..."
                : "Connect to your wallet " + <MoveUpRight />
            }
            className="sr-only"
            disabled={isConnecting}
          />

          {/* Our styled button that programmatically clicks the hidden one */}
          <Button
            className={cn(
              "mx-auto w-full max-w-sm",
              "text-2xl h-20 px-8 flex items-center justify-center gap-2"
            )}
            onClick={() => {
              const el = document.getElementById(
                "hidden-mysten-connect"
              ) as HTMLButtonElement | null;
              el?.click();
            }}
            disabled={isConnecting}
          >
            {isConnecting ? "Connecting..." : "Connect to your wallet"}
            <span className="inline-block text-2xl"> ↗</span>
          </Button>

          {isConnecting && (
            <div className="text-center mt-8">
              <div className="inline-flex items-center space-x-2 text-main">
                <div className="w-5 h-5 border-2 border-main border-t-transparent rounded-full animate-spin"></div>
                <span className="text-lg">Connecting to wallet...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
