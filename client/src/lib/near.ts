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

    // --- ЛОГИКА ДЛЯ TWA: Принудительный вызов HOT Wallet ---
    // @ts-ignore
    const isTWA = typeof window !== 'undefined' && typeof window.Telegram?.WebApp !== 'undefined';

    let originalHOTRequest: Function | undefined;
    let hotWalletLink: string | null = null;
    let isRequestInProgress = false;

    if (isTWA) {
        console.log("TWA environment detected for mintNFT, preparing direct wallet call...");
        try {
            // 1. Получаем доступ к классу HOT (он должен быть уже загружен, так как используется в библиотеке)
            // @ts-ignore
            const HOTClass = (await import("@hot-labs/near-connect")).HOT; // HOT.shared - это синглтон HOTClass.shared
            if (!HOTClass || !HOTClass.shared) {
                throw new Error("HOT class or HOT.shared not found");
            }

            // 2. Сохраняем оригинальный метод request
            originalHOTRequest = HOTClass.shared.request;

            // 3. Подменяем метод request
            HOTClass.shared.request = async function (method: string, request: any) {
                console.log("Intercepted HOT.shared.request:", method, request);
                
                if (isRequestInProgress) {
                   // На случай, если метод вызывается рекурсивно или несколько раз
                   console.log("HOT request already in progress, calling original...");
                   // @ts-ignore
                   return originalHOTRequest.apply(this, arguments);
                }
                
                isRequestInProgress = true;

                try {
                    // 4. Вычисляем requestId и link, как это делается в оригинальном коде
                    // (частично копируем логику из wallets/hotwallet/index.ts HOT.request)
                    const requestId = await this.createRequest({ method, request });
                    const link = `hotcall-${requestId}`;
                    const fullTelegramLink = `https://t.me/hot_wallet/app?startapp=${link}`;
                    hotWalletLink = fullTelegramLink; // Сохраняем для логгирования/отладки

                    console.log("Computed HOT Wallet link:", fullTelegramLink);

                    // 5. НЕ вызываем renderUI()!
                    // renderUI(); // <-- ЭТО УБИРАЕМ

                    // 6. НЕ создаем QR-код!
                    // const qr = document.querySelector(".qr-code"); // <-- ЭТО УБИРАЕМ
                    
                    // 7. НЕ определяем window.openTelegram и т.д.!
                    // window.openTelegram = ... // <-- ЭТО УБИРАЕМ

                    // 8. Сразу вызываем window.selector.open с ссылкой!
                    // @ts-ignore
                    if (typeof window.selector?.open === 'function') {
                        console.log("Calling window.selector.open directly...");
                        // @ts-ignore
                        window.selector.open(fullTelegramLink);
                        console.log("window.selector.open called successfully.");
                    } else {
                        console.error("window.selector.open is not available for direct call.");
                        // Если window.selector.open недоступен, попробуем window.open, 
                        // но это менее предпочтительно и может не сработать в TWA
                        // window.open(fullTelegramLink, '_blank');
                    }

                    // 9. Запускаем poolResponse как обычно (он будет ждать результата)
                    const poolResponse = async () => {
                      // Копируем wait из оригинального кода или реализуем простую версию
                      const wait = (timeout: number) => new Promise<void>((resolve) => setTimeout(resolve, timeout));
                      
                      await wait(3000); // Начальная задержка
                      const data: any = await this.getResponse(requestId).catch(() => null);
                      if (data == null) return await poolResponse(); // Рекурсивный вызов
                      if (data.success) return data.payload;
                      // @ts-ignore - предполагаем, что RequestFailed доступен
                      throw new (await import("@hot-labs/near-connect")).RequestFailed(data.payload);
                    };

                    const result = await poolResponse();
                    console.log("HOT request completed with result:", result);
                    return result;

                } catch (interceptError) {
                    console.error("Error in intercepted HOT request:", interceptError);
                    throw interceptError;
                } finally {
                    isRequestInProgress = false;
                }
            };

            console.log("HOT.shared.request successfully intercepted.");

        } catch (patchError) {
            console.error("Failed to patch HOT.shared.request:", patchError);
            // Если не удалось подменить, продолжаем как обычно (с окном)
        }
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

    // --- ВОССТАНОВЛЕНИЕ оригинального метода ---
    if (isTWA && originalHOTRequest) {
        try {
            // @ts-ignore
            const HOTClass = (await import("@hot-labs/near-connect")).HOT;
            if (HOTClass && HOTClass.shared) {
                HOTClass.shared.request = originalHOTRequest;
                console.log("Original HOT.shared.request restored.");
            }
        } catch (restoreError) {
            console.error("Failed to restore original HOT.shared.request:", restoreError);
        }
    }
    // --- КОНЕЦ ВОССТАНОВЛЕНИЯ ---

    console.log("NFT minted successfully:", result);
    
    const transactionOutcomeId = result?.transaction_outcome?.id;
    const transactionHash = result?.transaction?.hash || transactionOutcomeId;
    
    return {
      tokenId: transactionOutcomeId || `nft_${Date.now()}`,
      transactionHash: transactionHash || `tx_${Date.now()}`
    };
  } catch (error: any) {
    // --- ВОССТАНОВЛЕНИЕ оригинального метода в случае ошибки ---
    // @ts-ignore
    const isTWA = typeof window !== 'undefined' && typeof window.Telegram?.WebApp !== 'undefined';
    if (isTWA) {
         try {
            // @ts-ignore
            const HOTClass = (await import("@hot-labs/near-connect")).HOT;
            // @ts-ignore
            if (HOTClass && HOTClass.shared && originalHOTRequest) {
                HOTClass.shared.request = originalHOTRequest;
                console.log("Original HOT.shared.request restored after error.");
            }
         } catch (restoreError) {
            console.error("Failed to restore original HOT.shared.request after error:", restoreError);
         }
    }
    // --- КОНЕЦ ВОССТАНОВЛЕНИЯ ---
    
    console.error("NFT minting failed:", error);
    if (error.message?.includes("User rejected") ||
        error.message?.includes("cancelled") ||
        error.message?.includes("User cancelled")) {
      throw new Error("Transaction was cancelled by user");
    }
    throw error;
  }
}
