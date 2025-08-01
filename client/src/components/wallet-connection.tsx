import { Button } from "@/components/ui/button";
import { Wallet, LogOut } from "lucide-react";

interface WalletConnectionProps {
  isConnected: boolean;
  accountId?: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function WalletConnection({ 
  isConnected, 
  accountId, 
  onConnect, 
  onDisconnect 
}: WalletConnectionProps) {
  if (isConnected && accountId) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-lg">
          <div className="w-2 h-2 bg-accent rounded-full"></div>
          <span className="text-sm text-gray-300">{accountId}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white p-2"
          onClick={onDisconnect}
        >
          <LogOut size={16} />
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={onConnect}
      className="bg-primary hover:bg-primary/90 text-white px-6 py-2 font-medium"
    >
      <Wallet className="mr-2" size={16} />
      Connect Wallet
    </Button>
  );
}
