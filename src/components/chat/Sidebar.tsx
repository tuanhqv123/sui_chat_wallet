import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { WalletInfo } from "../../services/sui";

interface SidebarProps {
  onNewChat: () => void;
  onViewAssets: () => void;
  onViewTransactions: () => void;
  onCreateNFT: () => void;
  onViewPrices: () => void;
  onDisconnect: () => void;
  walletData: WalletInfo | null;
}

export function Sidebar({
  onNewChat,
  onViewAssets,
  onViewTransactions,
  onCreateNFT,
  onViewPrices,
  onDisconnect,
  walletData,
}: SidebarProps) {
  return (
    <div className="w-64 bg-bg border-r-2 border-border flex flex-col">
      {/* Sidebar Header */}
      <div className="p-4 border-b-2 border-border h-16 bg-main flex items-center justify-center">
        <img
          src="/Sui_Symbol_White.svg"
          alt="Sui Logo"
          className="w-8 h-8 mr-3"
          style={{ filter: "invert(1)" }}
        />
        <h1 className="text-2xl font-heading italic text-text">CrypChat</h1>
      </div>

      {/* New Chat Button */}
      <div className="p-4 border-b-2 border-border">
        <Button className="w-full" onClick={onNewChat}>
          New Chat
        </Button>
      </div>

      {/* Spacer to push wallet to bottom */}
      <div className="flex-1"></div>

      {/* Wallet Section at bottom */}
      <div className="border-t-2 border-border h-20">
        <div className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="neutral"
                className="w-full justify-between h-12 text-base font-heading"
              >
                <span>Wallet</span>▲
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" side="top">
              <DropdownMenuItem onClick={onViewAssets}>
                View Assets ({walletData?.tokens?.length || 0})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewTransactions}>
                Transaction History
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCreateNFT}>
                Create NFT
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewPrices}>
                Crypto Prices
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDisconnect}>
                Disconnect Wallet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
