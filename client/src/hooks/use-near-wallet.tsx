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

  // --- МОДИФИЦИРОВАННАЯ signAndSendTransaction ---
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

    // --- ЛОГИКА ДЛЯ TWA: Принудительный вызов HOT Wallet ---
    // @ts-ignore
    const isTWA = typeof window !== 'undefined' && typeof window.Telegram?.WebApp !== 'undefined';

    let originalHOTRequest: Function | undefined;
    let requestInProgressForThisCall = false;

    if (isTWA) {
        console.log("TWA environment detected, preparing direct wallet call for transaction...");
        try {
            // 1. Получаем доступ к классу HOT
            const hotModule = await import("@hot-labs/near-connect");
            const HOTClass = hotModule.HOT;
            if (!HOTClass || !HOTClass.shared) {
                throw new Error("HOT class or HOT.shared not found");
            }

            // 2. Сохраняем оригинальный метод request
            originalHOTRequest = HOTClass.shared.request;

            // 3. Подменяем метод request
            HOTClass.shared.request = async function (method: string, request: any) {
                console.log("Intercepted HOT.shared.request for transaction:", method, request?.transactions?.length || 'N/A');
                
                // Защита от рекурсии/повторных вызовов для этого конкретного вызова
                if (requestInProgressForThisCall) {
                   console.log("Request already in progress for this transaction call, calling original...");
                   // @ts-ignore
                   return originalHOTRequest.apply(this, arguments);
                }
                
                requestInProgressForThisCall = true;

                try {
                    // 4. Выполняем почти всю оригинальную логику до renderUI
                    // (Копируем необходимые части из wallets/hotwallet/index.ts HOT.request)
                    
                    // --- Начало копирования логики ---
                    const requestId = await this.createRequest({ method, request });
                    const link = `hotcall-${requestId}`;
                    const fullTelegramLink = `https://t.me/hot_wallet/app?startapp=${link}`;
                    
                    console.log("Computed HOT Wallet link for transaction:", fullTelegramLink);

                    // 5. ВАЖНО: НЕ вызываем renderUI()!
                    // renderUI(); // <-- УБРАНО

                    // 6. ВАЖНО: НЕ создаем QR-код!
                    // const qr = document.querySelector(".qr-code"); // <-- УБРАНО
                    
                    // 7. ВАЖНО: НЕ определяем window.openTelegram и т.д.!
                    // window.openTelegram = ... // <-- УБРАНО

                    // 8. Сразу вызываем window.selector.open с ссылкой!
                    // @ts-ignore
                    if (typeof window.selector?.open === 'function') {
                        console.log("Calling window.selector.open directly for transaction...");
                        // @ts-ignore
                        window.selector.open(fullTelegramLink);
                        console.log("window.selector.open for transaction called successfully.");
                    } else {
                        console.error("window.selector.open is not available for direct transaction call.");
                    }

                    // 9. Запускаем poolResponse как обычно (он будет ждать результата)
                    // Копируем wait и poolResponse из оригинального кода
                    const wait = (timeout: number) => new Promise<void>((resolve) => setTimeout(resolve, timeout));
                    
                    const poolResponse = async () => {
                      await wait(3000); // Начальная задержка
                      const data: any = await this.getResponse(requestId).catch(() => null);
                      if (data == null) return await poolResponse(); // Рекурсивный вызов
                      if (data.success) return data.payload;
                      // Предполагаем, что RequestFailed доступен или создаем его
                      // @ts-ignore
                      const RequestFailed = hotModule.RequestFailed || class RF extends Error { constructor(m: string) { super(m); } };
                      throw new RequestFailed(data.payload?.message || data.payload || "Unknown error from wallet");
                    };

                    const result = await poolResponse();
                    console.log("HOT transaction request completed with result:", result);
                    return result;

                } catch (interceptError) {
                    console.error("Error in intercepted HOT transaction request:", interceptError);
                    throw interceptError;
                } finally {
                    requestInProgressForThisCall = false;
                }
            };

            console.log("HOT.shared.request successfully intercepted for this transaction.");

        } catch (patchError) {
            console.error("Failed to patch HOT.shared.request for transaction:", patchError);
            // Если не удалось подменить, продолжаем как обычно (с окном)
        }
    }
    // --- КОНЕЦ ЛОГИКИ ДЛЯ TWA ---

    try {
      console.log("Sending transaction with params:", params);
      const result = await walletState.wallet.signAndSendTransaction(params);
      console.log("Transaction sent successfully:", result);
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
    } finally {
        // --- ВОССТАНОВЛЕНИЕ оригинального метода после вызова ---
        if (isTWA && originalHOTRequest) {
            try {
                const hotModule = await import("@hot-labs/near-connect");
                const HOTClass = hotModule.HOT;
                if (HOTClass && HOTClass.shared) {
                    HOTClass.shared.request = originalHOTRequest;
                    console.log("Original HOT.shared.request restored after transaction call.");
                }
            } catch (restoreError) {
                console.error("Failed to restore original HOT.shared.request after transaction call:", restoreError);
            }
        }
        // --- КОНЕЦ ВОССТАНОВЛЕНИЯ ---
    }
  };
  // --- КОНЕЦ МОДИФИЦИРОВАННОЙ signAndSendTransaction ---

  return {
    ...walletState,
    connectWallet,
    disconnectWallet,
    signAndSendTransaction
  };
}
