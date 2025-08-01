// use-near-wallet.tsx
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
// Убедитесь, что версия соответствует той, что вы используете, например 0.2.15
import { WalletSelector, WalletSelectorUI } from "@hot-labs/near-connect";
import "@hot-labs/near-connect/modal-ui.css";

interface NearWalletState {
  isConnected: boolean;
  accountId?: string;
  selector?: WalletSelector;
  modal?: WalletSelectorUI;
  wallet?: any; // Consider typing this more specifically if possible
}

const ACCOUNT_ID_STORAGE_KEY = 'near-connected-account-id';

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
        network: "mainnet",
        features: {
          signAndSendTransaction: true,
        }
      });
      const modal = new WalletSelectorUI(selector);

      let initialConnected = false;
      let initialAccountId: string | undefined = undefined;
      let initialWalletInstance: any = undefined;
      
      try {
        const connectedWallet = await selector.wallet();
        const accounts = await connectedWallet.getAccounts();
        if (accounts && accounts.length > 0) {
             initialConnected = true;
             initialAccountId = accounts[0].accountId;
             initialWalletInstance = connectedWallet;
             console.log("Wallet was already connected on init:", initialAccountId);
             const storedAccountId = localStorage.getItem(ACCOUNT_ID_STORAGE_KEY);
             if (storedAccountId !== initialAccountId) {
                 localStorage.setItem(ACCOUNT_ID_STORAGE_KEY, initialAccountId);
             }
        } else {
            console.log("Wallet selected but no accounts found on init.");
            localStorage.removeItem(ACCOUNT_ID_STORAGE_KEY);
        }
      } catch (checkError) {
         console.log("No wallet was connected initially or failed to get wallet/accounts:", checkError);
         localStorage.removeItem(ACCOUNT_ID_STORAGE_KEY);
      }

      selector.on("wallet:signOut", async () => {
        console.log("Wallet signed out (event received)");
        setWalletState({
          isConnected: false,
          selector,
          modal,
          accountId: undefined,
          wallet: undefined
        });
        localStorage.removeItem(ACCOUNT_ID_STORAGE_KEY);
        toast({
          title: "Wallet Disconnected",
          description: "You have been signed out from your wallet."
        });
      });

      selector.on("wallet:signIn", async (event) => {
        console.log("Wallet signed in (event received):", event);
        if (event.accounts && event.accounts.length > 0) {
          const accountId = event.accounts[0].accountId;
          try {
              const wallet = await selector.wallet();
              setWalletState({
                isConnected: true,
                accountId,
                selector,
                modal,
                wallet
              });
              localStorage.setItem(ACCOUNT_ID_STORAGE_KEY, accountId);
              toast({
                title: "Wallet Connected",
                description: `Connected as ${accountId}.`
              });
          } catch (err) {
              console.error("Failed to get wallet instance after sign in:", err);
              toast({
                title: "Connection Error",
                description: "Failed to finalize wallet connection. Please try again.",
                variant: "destructive"
              });
              setWalletState({ isConnected: false, selector, modal, accountId: undefined, wallet: undefined });
              localStorage.removeItem(ACCOUNT_ID_STORAGE_KEY);
          }
        }
      });


      setWalletState(prev => ({
        isConnected: initialConnected,
        accountId: initialAccountId,
        selector,
        modal,
        wallet: initialWalletInstance
      }));

      console.log("NEAR wallet selector initialized successfully");
    } catch (error) {
      console.error("Failed to initialize wallet selector:", error);
      localStorage.removeItem(ACCOUNT_ID_STORAGE_KEY);
      toast({
        title: "Initialization Failed",
        description: "Failed to initialize NEAR wallet. Please ensure you have a compatible wallet installed.",
        variant: "destructive"
      });
      setWalletState(prev => ({ isConnected: false, selector: prev?.selector, modal: prev?.modal }));
    }
  };

  const connectWallet = async () => {
    if (walletState.modal) {
      try {
        console.log("Opening wallet connection modal...");
        walletState.modal.open();
        console.log("Wallet connection modal opened.");
      } catch (error) {
        console.error("Failed to open wallet modal:", error);
        toast({
          title: "Connection Failed",
          description: "Failed to open wallet connection window. Please try again.",
          variant: "destructive"
        });
      }
    } else {
      console.error("Wallet modal is not initialized.");
      toast({
        title: "Initialization Error",
        description: "Wallet modal is not ready. Please refresh the page.",
        variant: "destructive"
      });
    }
  };

  const disconnectWallet = async () => {
    console.log("Attempting to disconnect wallet...");
    try {
      if (walletState.wallet && walletState.isConnected) {
        console.log("Calling wallet.signOut()...");
        await walletState.wallet.signOut();
        console.log("wallet.signOut() completed.");
      } else {
         console.warn("Attempted to disconnect, but no wallet was connected.");
         setWalletState(prev => ({
             isConnected: false,
             selector: prev.selector,
             modal: prev.modal,
             accountId: undefined,
             wallet: undefined
         }));
         localStorage.removeItem(ACCOUNT_ID_STORAGE_KEY);
         toast({
            title: "Not Connected",
            description: "No wallet was connected to disconnect.",
            variant: "default"
         });
      }
    } catch (error) {
      console.error("Error during wallet.signOut() call:", error);
      toast({
        title: "Disconnect Issue",
        description: `Disconnect process encountered an issue: ${error instanceof Error ? error.message : 'Unknown error'}. State will be reset locally.`,
        variant: "destructive"
      });
    } finally {
        console.log("Ensuring local state is disconnected in finally block...");
        setWalletState(prev => ({
            isConnected: false,
            selector: prev.selector,
            modal: prev.modal,
            accountId: undefined,
            wallet: undefined
        }));
        localStorage.removeItem(ACCOUNT_ID_STORAGE_KEY);
        console.log("Local state disconnected.");
    }
  };

  const signAndSendTransaction = async (params: any) => {
    if (!walletState.isConnected || !walletState.wallet) {
      const errorMsg = "Wallet not connected. Please connect your wallet first.";
      console.error(errorMsg);
      toast({
        title: "Action Failed",
        description: errorMsg,
        variant: "destructive"
      });
      throw new Error(errorMsg);
    }

    try {
      console.log("Sending transaction with params:", params);
      const result = await walletState.wallet.signAndSendTransaction(params);
      console.log("Transaction sent successfully:", result);
      return result;
    } catch (error) {
      console.error("Failed to send transaction:", error);
      toast({
        title: "Transaction Failed",
        description: `Failed to send transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
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