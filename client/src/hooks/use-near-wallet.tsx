// client/src/hooks/use-near-wallet.tsx
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
          signMessage: true,
          signAndSendTransaction: true,
          signInWithoutAddKey: true,
          signAndSendTransactions: true
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
        console.log("SignIn event: (event received)");
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

// client/src/hooks/use-near-wallet.tsx
// ... остальные импорты и код без изменений ...

// Найдите в файле вашу оригинальную функцию signAndSendTransaction и ЗАМЕНИТЕ её этой:

// client/src/hooks/use-near-wallet.tsx
// ... остальные импорты ...

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
    
    // Попробуем использовать прямой вызов через window.selector.open
    // @ts-ignore
    if (typeof window.selector?.open === 'function') {
      try {
        // Импортируем HOT для генерации requestId
        const hotModule = await import("@hot-labs/near-connect");
        const HOTClass = hotModule.HOT;
        
        if (HOTClass && HOTClass.shared) {
          // Создаем временный экземпляр для генерации ID
          const tempHOT = new HOTClass();
          const method = "near:signAndSendTransactions";
          const request = { transactions: [params] };
          
          // Генерируем requestId
          const requestId = await tempHOT.createRequest({ method, request });
          const link = `hotcall-${requestId}`;
          const fullTelegramLink = `https://t.me/hot_wallet/app?startapp=${link}`;
          
          console.log("Attempting to open HOT Wallet with link:", fullTelegramLink);
          
          // Открываем ссылку напрямую
          // @ts-ignore
          window.selector.open(fullTelegramLink);
          
          // Теперь нам нужно дождаться результата
          // Попробуем использовать poolResponse из оригинального кода
          // Но для этого нужно, чтобы HOT.shared.request был вызван...
          // Это хак, но может сработать
          
          // Создаем Promise, который будет ждать результата
          const resultPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Timeout waiting for transaction result"));
            }, 60000); // 60 секунд таймаут
            
            const pollForResult = async () => {
              try {
                // @ts-ignore
                const data: any = await HOTClass.shared.getResponse(requestId).catch(() => null);
                if (data != null) {
                  clearTimeout(timeout);
                  if (data.success) {
                    resolve(data.payload);
                  } else {
                    // @ts-ignore
                    const RequestFailed = hotModule.RequestFailed || class RF extends Error { constructor(m: string) { super(m); } };
                    reject(new RequestFailed(data.payload?.message || data.payload || "Unknown error from wallet"));
                  }
                } else {
                  // Продолжаем опрос
                  setTimeout(pollForResult, 2000); // Проверяем каждые 2 секунды
                }
              } catch (pollError) {
                clearTimeout(timeout);
                reject(pollError);
              }
            };
            
            // Начинаем опрос
            setTimeout(pollForResult, 3000); // Начинаем через 3 секунды
          });
          
          const result = await resultPromise;
          console.log("Transaction completed with result:", result);
          // Возвращаем результат в формате, ожидаемом_near-selector
          // HOT возвращает transactions[0], поэтому нам нужно это имитировать
          return result?.transactions?.[0] || result;
        }
      } catch (directOpenError) {
        console.error("Failed to open HOT Wallet directly:", directOpenError);
        // Если прямой вызов не удался, продолжаем как обычно
      }
    }
    
    // Фоллбэк на стандартную реализацию
    console.log("Falling back to standard wallet.signAndSendTransaction...");
    const result = await walletState.wallet.signAndSendTransaction(params);
    console.log("Transaction sent successfully (fallback):", result);
    return result;
    
  } catch (error) {
    console.error("Failed to send transaction:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    toast({
      title: "Transaction Failed",
      description: `Failed to send transaction: ${errorMessage}`,
      variant: "destructive"
    });
    throw error;
  }
};

// ... остальной код ...

  return {
    ...walletState,
    connectWallet,
    disconnectWallet,
    signAndSendTransaction
  };
}
