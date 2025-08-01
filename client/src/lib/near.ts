// client/src/lib/near.ts

interface MintParams {
  title: string;
  description: string;
  media: string;
  reference: string;
}
interface MintResult {
  tokenId: string;
  transactionHash: string;
}

export async function mintNFT(params: MintParams, wallet?: any): Promise<MintResult> {
  try {
    console.log("Minting NFT with params:", params);
    if (!wallet) {
      throw new Error("Wallet not connected");
    }
    if (typeof wallet.signAndSendTransaction !== 'function') {
        throw new Error("Connected wallet does not support signAndSendTransaction");
    }

    // --- ЛОГИКА ДЛЯ TWA: Авто-вызов HOT Wallet ---
    // @ts-ignore
    const isTWA = typeof window !== 'undefined' && typeof window.Telegram?.WebApp !== 'undefined';
    let autoTriggerAttempted = false;

    if (isTWA) {
        console.log("TWA environment detected for mintNFT, setting up auto-trigger...");
        
        // Запускаем проверку немедленно, но асинхронно
        setTimeout(() => {
            if (autoTriggerAttempted) {
                console.log("Auto-trigger already attempted, skipping.");
                return;
            }

            const checkAndTrigger = () => {
                // @ts-ignore
                if (typeof window.openTelegram === 'function' && !autoTriggerAttempted) {
                    autoTriggerAttempted = true;
                    console.log("Found window.openTelegram, attempting auto-trigger...");
                    try {
                        // @ts-ignore
                        window.openTelegram(); // Это должно открыть HOT Wallet в Telegram
                        console.log("HOT Wallet auto-triggered successfully via window.openTelegram.");
                        // Останавливаем дальнейшие проверки
                        return true; 
                    } catch (triggerError) {
                        console.error("Failed to auto-trigger window.openTelegram:", triggerError);
                        autoTriggerAttempted = false; // Позволим повторную попытку в случае ошибки?
                        return false;
                    }
                } else if (autoTriggerAttempted) {
                    console.log("Auto-trigger already successfully called.");
                    return true;
                } else {
                    console.log("Waiting for window.openTelegram to be defined...");
                    return false; // Продолжаем проверку
                }
            };

            // Немедленная первая проверка
            if (checkAndTrigger()) {
                return; // Успешно вызвано, выходим
            }

            // Если не удалось сразу, запускаем периодическую проверку
            const intervalId = setInterval(() => {
                if (checkAndTrigger()) {
                    clearInterval(intervalId);
                }
            }, 200); // Проверяем каждые 200 мс

            // Таймаут для остановки проверки
            setTimeout(() => {
                clearInterval(intervalId);
                if (!autoTriggerAttempted) {
                    console.log("Timeout: window.openTelegram was not found or triggered within the expected time.");
                }
            }, 15000); // Ждем максимум 15 секунд

        }, 0); // Выполнить как можно скорее после начала асинхронной операции
    }
    // --- КОНЕЦ ЛОГИКИ ДЛЯ TWA ---

    console.log("Calling NEAR smart contract...");
    const result = await wallet.signAndSendTransaction({
      receiverId: "easy-proxy.near",
      actions: [{
        type: "FunctionCall",
        params: {
          methodName: "nft_mint_proxy",
          args: {
            token_metadata: { // Исправлено: было token_meta
              title: params.title,
              description: params.description,
              media: params.media,
              reference: params.reference
            }
          },
          gas: "300000000000000",
          deposit: "200000000000000000000000"
        }
      }]
    });

    console.log("NFT minted successfully:", result);
    
    const transactionOutcomeId = result?.transaction_outcome?.id;
    const transactionHash = result?.transaction?.hash || transactionOutcomeId;
    
    return {
      tokenId: transactionOutcomeId || `nft_${Date.now()}`,
      transactionHash: transactionHash || `tx_${Date.now()}`
    };
  } catch (error: any) {
    console.error("NFT minting failed:", error);
    if (error.message?.includes("User rejected") ||
        error.message?.includes("cancelled") ||
        error.message?.includes("User cancelled")) {
      throw new Error("Transaction was cancelled by user");
    }
    throw error;
  }
}
