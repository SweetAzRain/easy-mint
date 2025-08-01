import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { WalletSelector, WalletSelectorUI } from "@hot-labs/near-connect";
import "@hot-labs/near-connect/modal-ui.css";

interface NearWalletState {
  isConnected: boolean;
  accountId?: string;
  selector?: WalletSelector;
  modal?: WalletSelectorUI;
  wallet?: any;
}

export function useNearWallet() {
  const [walletState, setWalletState] = useState<NearWalletState>({
    isConnected: false
  });
  const { toast } = useToast();

  useEffect(() => {
    initializeWallet();
  }, []);

  const initializeWallet = async () => {
    try {
      console.log("Initializing NEAR wallet selector...");
      
      const selector = new WalletSelector({ 
        network: "testnet",
        // Support all compatible wallets with required features
        features: { 
          signAndSendTransaction: true,
          testnet: true 
        }
      });
      
      const modal = new WalletSelectorUI(selector);

      // Set up event listeners
      selector.on("wallet:signOut", async () => {
        console.log("Wallet signed out");
        setWalletState({
          isConnected: false,
          selector,
          modal
        });
        toast({
          title: "Wallet Disconnected",
          description: "You have been signed out from your wallet"
        });
      });

      selector.on("wallet:signIn", async (event) => {
        console.log("Wallet signed in:", event);
        if (event.accounts && event.accounts.length > 0) {
          const accountId = event.accounts[0].accountId;
          const wallet = await selector.wallet();
          
          setWalletState({
            isConnected: true,
            accountId,
            selector,
            modal,
            wallet
          });

          toast({
            title: "Wallet Connected",
            description: `Connected as ${accountId}`
          });
        }
      });

      setWalletState({
        isConnected: false,
        selector,
        modal
      });

      console.log("NEAR wallet selector initialized successfully");
    } catch (error) {
      console.error("Failed to initialize wallet:", error);
      // Fallback to demo mode if initialization fails
      setWalletState({
        isConnected: false,
        wallet: { mock: true }
      });
      toast({
        title: "Demo Mode",
        description: "Using demo mode - install a compatible wallet for full functionality",
        variant: "default"
      });
    }
  };

  const connectWallet = async () => {
    try {
      if (walletState.wallet?.mock) {
        // Mock wallet connection fallback
        const mockAccountId = "user.testnet";
        setWalletState({
          isConnected: true,
          accountId: mockAccountId,
          wallet: { mock: true, accountId: mockAccountId }
        });

        toast({
          title: "Demo Mode",
          description: `Demo connected as ${mockAccountId}`
        });
        return;
      }

      // Use the modal UI to show all available wallets
      if (walletState.modal) {
        console.log("Opening wallet selection modal...");
        walletState.modal.open();
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect NEAR wallet",
        variant: "destructive"
      });
    }
  };

  const disconnectWallet = async () => {
    try {
      if (walletState.wallet?.mock) {
        setWalletState({
          isConnected: false,
          selector: walletState.selector,
          modal: walletState.modal
        });
        toast({
          title: "Demo Disconnected",
          description: "Demo wallet disconnected"
        });
        return;
      }

      if (walletState.wallet) {
        await walletState.wallet.signOut();
        // The signOut event listener will handle state update
      }
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect wallet",
        variant: "destructive"
      });
    }
  };

  const signAndSendTransaction = async (params: any) => {
    try {
      if (walletState.wallet?.mock) {
        // Mock transaction for demo
        console.log("Mock transaction:", params);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
          transaction_outcome: {
            id: `mock_tx_${Date.now()}`
          }
        };
      }

      if (!walletState.wallet) {
        throw new Error("Wallet not connected");
      }

      return await walletState.wallet.signAndSendTransaction(params);
    } catch (error) {
      console.error("Transaction failed:", error);
      throw error;
    }
  };

  return {
    ...walletState,
    connectWallet,
    disconnectWallet,
    signAndSendTransaction
  };
}