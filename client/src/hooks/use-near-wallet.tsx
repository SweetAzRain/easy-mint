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

// Ключ для хранения accountId в localStorage вашего приложения для быстрого доступа
const ACCOUNT_ID_STORAGE_KEY = 'near-connected-account-id';

export function useNearWallet() {
  const [walletState, setWalletState] = useState<NearWalletState>({
    isConnected: false // Начальное значение, будет обновлено при инициализации
  });
  const { toast } = useToast(); // <-- Исправлено: должно быть здесь, а не внутри useState

  useEffect(() => {
    initializeWallet();
  }, []);

  const initializeWallet = async () => {
    try {
      console.log("Initializing NEAR wallet selector...");
      
      // --- ВАЖНО: Уберите или измените features.testnet на false, если хотите видеть HOT Wallet ---
      // HOT Wallet в манифесте имеет "testnet": false, поэтому при features: { testnet: true } он не будет отображаться.
      // Если вы хотите видеть HOT Wallet, используйте features: { signAndSendTransaction: true } или переключитесь на mainnet с features: { testnet: false }
      // Для решения проблемы с состоянием оставим как есть, но имейте это в виду.
      const selector = new WalletSelector({
        network: "mainnet", // Или "testnet", если вы тестируете
        features: {
          signAndSendTransaction: true,
          // testnet: true // Уберите эту строку, чтобы HOT Wallet появился в списке
        }
      });
      const modal = new WalletSelectorUI(selector);

      // --- Проверка начального состояния подключения ---
      let initialConnected = false;
      let initialAccountId: string | undefined = undefined;
      let initialWalletInstance: any = undefined;
      
      try {
        // Библиотека сама проверяет LocalStorage на "selected-wallet"
        const connectedWallet = await selector.wallet(); // Может бросить ошибку, если не подключен или кошелек не найден
        const accounts = await connectedWallet.getAccounts(); // Получаем аккаунты
        if (accounts && accounts.length > 0) {
             initialConnected = true;
             initialAccountId = accounts[0].accountId;
             initialWalletInstance = connectedWallet;
             console.log("Wallet was already connected on init:", initialAccountId);
             // Также проверим localStorage вашего приложения на всякий случай
             const storedAccountId = localStorage.getItem(ACCOUNT_ID_STORAGE_KEY);
             if (storedAccountId !== initialAccountId) {
                 // На случай несоответствия, доверяем библиотеке и обновляем localStorage
                 localStorage.setItem(ACCOUNT_ID_STORAGE_KEY, initialAccountId);
             }
        } else {
            // Кошелек выбран, но аккаунтов нет. Скорее всего, не подключен.
            // Очищаем потенциально устаревшие данные.
            console.log("Wallet selected but no accounts found on init.");
            localStorage.removeItem(ACCOUNT_ID_STORAGE_KEY);
        }
      } catch (checkError) {
         console.log("No wallet was connected initially or failed to get wallet/accounts:", checkError);
         // Убедимся, что localStorage чист, если библиотека говорит, что не подключено
         localStorage.removeItem(ACCOUNT_ID_STORAGE_KEY);
         // Продолжаем инициализацию с неподключенным состоянием
      }

      // --- Установка обработчиков событий ---
      selector.on("wallet:signOut", async () => {
        console.log("Wallet signed out (event received)");
        // Это событие должно сработать, когда кошелек сам инициирует выход или когда signOut успешен
        setWalletState({
          isConnected: false,
          selector, // Оставляем selector и modal
          modal,
          accountId: undefined,
          wallet: undefined // Очищаем экземпляр кошелька
        });
        // Удаляем accountId из localStorage вашего приложения
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
              // Получаем экземпляр кошелька после входа
              const wallet = await selector.wallet();
              setWalletState({
                isConnected: true,
                accountId,
                selector,
                modal,
                wallet // Сохраняем экземпляр кошелька
              });
              // Сохраняем accountId в localStorage вашего приложения
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
              // Сбрасываем состояние в случае ошибки получения кошелька
              setWalletState({ isConnected: false, selector, modal, accountId: undefined, wallet: undefined });
              localStorage.removeItem(ACCOUNT_ID_STORAGE_KEY);
          }
        }
      });

      // --- Установка начального состояния ---
      // Устанавливаем состояние с selector/modal и, возможно, уже подключенным кошельком
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
      // Очищаем localStorage при критической ошибке инициализации
      localStorage.removeItem(ACCOUNT_ID_STORAGE_KEY);
      toast({
        title: "Initialization Failed",
        description: "Failed to initialize NEAR wallet. Please ensure you have a compatible wallet installed.",
        variant: "destructive"
      });
      // Устанавливаем минимальное состояние ошибки
      setWalletState(prev => ({ isConnected: false, selector: prev?.selector, modal: prev?.modal }));
    }
  };

  const connectWallet = async () => {
    if (walletState.modal) {
      try {
        console.log("Opening wallet connection modal...");
        walletState.modal.open(); // Открываем модальное окно для выбора кошелька
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
        // Вызываем signOut у конкретного экземпляра кошелька
        await walletState.wallet.signOut();
        console.log("wallet.signOut() completed.");
        // Предполагаем, что событие "wallet:signOut" обновит состояние.
        // Однако, на всякий случай, добавим явное обновление в блоке finally.
      } else {
         console.warn("Attempted to disconnect, but no wallet was connected.");
         // Убедимся, что локальное состояние и localStorage сброшены
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
        // --- КЛЮЧЕВОЕ ИЗМЕНЕНИЕ ---
        // Всегда обновляем локальное состояние React и очищаем localStorage,
        // независимо от того, была ли ошибка или событие "wallet:signOut" сработало.
        // Это решает проблему, когда UI не обновляется из-за ошибок или несрабатывания события.
        console.log("Ensuring local state is disconnected in finally block...");
        setWalletState(prev => ({
            isConnected: false,
            selector: prev.selector, // Сохраняем selector и modal
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
      // Вызываем метод у конкретного экземпляра кошелька
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
      throw error; // Перебрасываем ошибку для обработки вызывающим кодом
    }
  };

  // Возвращаем объект с функциями и состоянием
  return {
    ...walletState, // Включает isConnected, accountId, selector, modal, wallet
    connectWallet,
    disconnectWallet,
    signAndSendTransaction
  };
}