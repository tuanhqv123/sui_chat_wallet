import { useState } from "react";
import { useCurrentWallet, useCurrentAccount } from "@mysten/dapp-kit";
import { Sidebar } from "./components/Sidebar";
import { ChatInterface } from "./components/ChatInterface";
import { WalletConnect } from "./components/WalletConnect";
import { WalletDashboard } from "./components/WalletDashboard";
import "./App.css";

function App() {
  const { isConnected } = useCurrentWallet();
  const currentAccount = useCurrentAccount();
  const [currentSession, setCurrentSession] = useState<string>("main");
  const [showDashboard, setShowDashboard] = useState<boolean>(false);
  const [currentMode, setCurrentMode] = useState<"nft" | "transfer">(
    "transfer"
  );

  // Debug logging
  console.log(
    "App render - isConnected:",
    isConnected,
    "currentAccount:",
    currentAccount?.address
  );

  if (!isConnected || !currentAccount) {
    return (
      <div className="min-h-screen w-screen relative overflow-hidden">
        <div className="relative z-10 min-h-screen w-full flex items-center justify-center p-8">
          <div className="w-full max-w-6xl">
            <div className="text-center mb-12">
              <h1 className="text-8xl font-black mb-6 tracking-tight">
                <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  SUI CHAT
                </span>
              </h1>
              <p className="text-2xl text-gray-300 font-light mb-8">
                AI-Powered Web3 Wallet Interface
              </p>
            </div>
            <WalletConnect />
          </div>
        </div>
      </div>
    );
  }

  if (showDashboard) {
    return (
      <div className="min-h-screen w-screen relative overflow-hidden">
        <div className="relative z-10 min-h-screen w-full p-8">
          <div className="text-center mb-8">
            <h1 className="text-6xl font-black mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                SUI WALLET
              </span>
            </h1>
          </div>
          <WalletDashboard onClose={() => setShowDashboard(false)} />

          <div className="text-center mt-8">
            <button
              onClick={() => setShowDashboard(false)}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-2xl text-lg transition-all duration-300 hover:scale-[1.02] shadow-lg"
            >
              Continue to Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-bg text-main-foreground prevent-scroll">
      <Sidebar
        currentSession={currentSession}
        onSessionChange={setCurrentSession}
        onShowDashboard={() => setShowDashboard(true)}
      />

      <main className="flex-1 relative z-10 overflow-hidden">
        <ChatInterface
          sessionId={currentSession}
          currentMode={currentMode}
          onModeChange={setCurrentMode}
        />
      </main>
    </div>
  );
}

export default App;
