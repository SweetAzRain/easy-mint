// client/src/hooks/use-near-wallet.tsx
import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { WalletSelector, WalletSelectorUI } from "@/lib/near-connect";
import { ActivityLogEntry } from "@/types/near-wallet";
import { useToast } from "@/hooks/use-toast";

interface NearWalletContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  accountId: string | null;
  walletName: string;
  network: "mainnet" | "testnet";
  // Wallet operations
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  signAndSendTransaction: (params: any) => Promise<any>;
  // UI state
  activityLog: ActivityLogEntry[];
  setNetwork: (network: "mainnet" | "testnet") => void;
}

const NearWalletContext = createContext<NearWalletContextType | undefined>(undefined);

interface NearWalletProviderProps {
  children: ReactNode;
}

export function NearWalletProvider({ children }: NearWalletProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [walletName, setWalletName] = useState("Unknown Wallet");
  const [network, setNetwork] = useState<"mainnet" | "testnet">("mainnet"); // mainnet по умолчанию
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [selector, setSelector] = useState<any>(null);
  const [modal, setModal] = useState<any>(null);
  const [currentWallet, setCurrentWallet] = useState<any>(null);
  const { toast } = useToast();

  const addActivityLog = useCallback((message: string, type: "info" | "success" | "error" | "warning" = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setActivityLog(prev => [{ message, type, timestamp }, ...prev.slice(0, 19)]);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem('nearConnectSession');
    setCurrentWallet(null);
    setIsConnected(false);
    setAccountId(null);
    setWalletName("Unknown Wallet");
  }, []);

  // Улучшенная функция обновления состояния подключения
  const updateConnectedState = useCallback(async (selectorInstance: any) => {
    try {
      const wallet = await selectorInstance.wallet();
      const accounts = await wallet.getAccounts();
      
      if (accounts && accounts.length > 0) {
        setCurrentWallet(wallet);
        setIsConnected(true);
        setAccountId(accounts[0].accountId);
        setWalletName(wallet.id || 'Unknown Wallet');
        addActivityLog(`Wallet connected: ${accounts[0].accountId}`, 'success');
        return true;
      } else {
        clearSession();
        addActivityLog('No accounts found in wallet', 'warning');
        return false;
      }
    } catch (error) {
      console.error('Error updating connected state:', error);
      clearSession();
      addActivityLog(`Failed to update connection state: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return false;
    }
  }, [addActivityLog, clearSession]);

  const initializeWallet = useCallback(async () => {
    try {
      addActivityLog('Initializing NEAR wallet...', 'info');
      if (typeof window === 'undefined') return;

      // Initialize WalletSelector
      const newSelector = new WalletSelector({ network });
      setSelector(newSelector);

      // Initialize WalletSelectorUI
      const newModal = new WalletSelectorUI(newSelector);
      setModal(newModal);

      // Проверяем, подключен ли кошелек при инициализации
      await updateConnectedState(newSelector);

      // Set up event listeners
      newSelector.on('wallet:signIn', async (event: any) => {
        try {
          addActivityLog('Wallet sign-in successful', 'success');
          
          // Обновляем состояние подключения
          await updateConnectedState(newSelector);
          
          const accounts = event.accounts;
          if (accounts && accounts.length > 0) {
            // Save session to localStorage
            const sessionData = {
              accountId: accounts[0].accountId,
              walletId: accounts[0].walletId || 'unknown',
              network,
              timestamp: Date.now()
            };
            localStorage.setItem('nearConnectSession', JSON.stringify(sessionData));

            toast({
              title: "Success",
              description: "Wallet connected successfully!",
            });
          }
        } catch (error) {
          console.error('Sign in error:', error);
          addActivityLog(`Sign-in error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
          toast({
            title: "Connection Failed",
            description: "Failed to complete wallet connection",
            variant: "destructive",
          });
        } finally {
          setIsConnecting(false);
        }
      });

      newSelector.on('wallet:signOut', async () => {
        addActivityLog('Wallet disconnected', 'info');
        clearSession();
        setIsConnecting(false);
        toast({
          title: "Disconnected",
          description: "Wallet disconnected",
        });
      });

      addActivityLog('NEAR wallet initialized successfully', 'success');
    } catch (error) {
      console.error('Initialization error:', error);
      addActivityLog(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      toast({
        title: "Initialization Failed",
        description: "Failed to initialize NEAR wallet",
        variant: "destructive",
      });
    }
  }, [network, addActivityLog, clearSession, updateConnectedState, toast]);

  const connectWallet = useCallback(async () => {
    try {
      if (!modal) {
        toast({
          title: "Error",
          description: "Wallet selector not initialized",
          variant: "destructive",
        });
        return;
      }
      setIsConnecting(true);
      addActivityLog('Opening wallet selector...', 'info');
      modal.open();
    } catch (error) {
      console.error('Connection error:', error);
      addActivityLog(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      toast({
        title: "Connection Failed",
        description: "Failed to open wallet selector",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  }, [modal, addActivityLog, toast]);

  const disconnectWallet = useCallback(async () => {
    try {
      if (currentWallet && typeof currentWallet.signOut === 'function') {
        await currentWallet.signOut();
      }
      clearSession();
      addActivityLog('Wallet disconnected manually', 'info');
      toast({
        title: "Disconnected",
        description: "Wallet disconnected",
      });
    } catch (error) {
      console.error('Disconnect error:', error);
      addActivityLog(`Disconnect error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      toast({
        title: "Disconnect Failed",
        description: "Error disconnecting wallet",
        variant: "destructive",
      });
    }
  }, [currentWallet, clearSession, addActivityLog, toast]);

  // Функция для подписания и отправки транзакций
  const signAndSendTransaction = useCallback(async (params: any) => {
    try {
      // Проверяем состояние перед вызовом
      if (!currentWallet) {
        // Пытаемся обновить состояние если кошелек не найден
        if (selector) {
          const updated = await updateConnectedState(selector);
          if (!updated) {
            throw new Error('Wallet not connected');
          }
        } else {
          throw new Error('Wallet not connected');
        }
      }
      
      addActivityLog(`Sending transaction to ${params.receiverId}`, 'info');
      const result = await currentWallet.signAndSendTransaction(params);
      addActivityLog('Transaction sent successfully', 'success');
      return result;
    } catch (error) {
      console.error('Transaction error:', error);
      addActivityLog(`Transaction error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    }
  }, [currentWallet, selector, updateConnectedState, addActivityLog]);

  const handleNetworkChange = useCallback((newNetwork: "mainnet" | "testnet") => {
    if (isConnected) {
      toast({
        title: "Warning",
        description: "Please disconnect wallet before changing network",
        variant: "destructive",
      });
      return;
    }
    setNetwork(newNetwork);
    addActivityLog(`Network changed to ${newNetwork}`, 'info');
  }, [isConnected, addActivityLog, toast]);

  // Initialize wallet on mount and network change
  useEffect(() => {
    initializeWallet();
  }, [initializeWallet]);

  const value: NearWalletContextType = {
    isConnected,
    isConnecting,
    accountId,
    walletName,
    network,
    connectWallet,
    disconnectWallet,
    signAndSendTransaction,
    activityLog,
    setNetwork: handleNetworkChange,
  };

  return (
    <NearWalletContext.Provider value={value}>
      {children}
    </NearWalletContext.Provider>
  );
}

export function useNearWallet() {
  const context = useContext(NearWalletContext);
  if (context === undefined) {
    throw new Error('useNearWallet must be used within a NearWalletProvider');
  }
  return context;
}
