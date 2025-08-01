// client/src/lib/near.ts
// Импортируем HOT, чтобы получить доступ к proxyApi и uuid4
import { HOT } from "@hot-labs/near-connect/build/wallets/hotwallet/"; // Путь может отличаться, проверьте node_modules

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

// --- НОВАЯ ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ LINK ---
// Вынесем логику получения ссылки в отдельную функцию
const getHotWalletLink = async (transactionPayload: any): Promise<string> => {
  // Создаем временный экземпляр HOT для вычисления requestId и query
  const tempHOT = new HOT(); // HOT.shared - это синглтон, но мы можем создать временный для расчетов
  const method = "near:signAndSendTransactions";
  const request = { transactions: [transactionPayload] }; // Формат запроса как в index.ts

  // --- Копируем логику из HOT.request до renderUI ---
  const requestId = await tempHOT.createRequest({ method, request });
  const link = `hotcall-${requestId}`;
  return link;
};
// --- КОНЕЦ НОВОЙ ФУНКЦИИ ---

export async function mintNFT(params: MintParams, wallet?: any): Promise<MintResult> {
  try {
    console.log("Minting NFT with params:", params);
    if (!wallet) {
      throw new Error("Wallet not connected");
    }
    if (typeof wallet.signAndSendTransaction !== 'function') {
        throw new Error("Connected wallet does not support signAndSendTransaction");
    }

    // Проверим, находимся ли мы в Telegram Web App
    // @ts-ignore
    const isTWA = typeof window !== 'undefined' && typeof window.Telegram?.WebApp !== 'undefined';

    // --- ЛОГИКА ДЛЯ TWA ---
    let originalRenderUI: Function | undefined;
    let linkToOpen: string | null = null;
    let autoTriggerAttempted = false;

    if (isTWA) {
        console.log("TWA detected, preparing direct wallet open...");
        try {
            // 1. Сохраняем оригинальную renderUI
            // @ts-ignore - доступ к внутреннему модулю
            originalRenderUI = (await import("@hot-labs/near-connect/dist/wallets/hotwallet/index.js")).renderUI;
            
            // 2. Подменяем renderUI на пустую функцию
            // @ts-ignore
            (await import("@hot-labs/near-connect/dist/wallets/hotwallet/index.js")).renderUI = () => {
                console.log("renderUI overridden - doing nothing");
            };
            console.log("renderUI overridden successfully.");

            // 3. Вычисляем ссылку заранее (альтернативный способ, если предыдущий не сработает)
            // const transactionPayload = {
            //   receiverId: "easy-proxy.near",
            //   actions: [{
            //     type: "FunctionCall",
            //     params: {
            //       methodName: "nft_mint_proxy",
            //       args: {
            //         token_metadata: {
            //           title: params.title,
            //           description: params.description,
            //           media: params.media,
            //           reference: params.reference
            //         }
            //       },
            //       gas: "300000000000000",
            //       deposit: "200000000000000000000000"
            //     }
            //   }]
            // };
            // linkToOpen = await getHotWalletLink(transactionPayload);
            // console.log("Pre-calculated link:", linkToOpen);

        } catch (overrideError) {
            console.error("Failed to override renderUI:", overrideError);
        }
    }
    // --- КОНЕЦ ЛОГИКИ ДЛЯ TWA ---

    console.log("Calling NEAR smart contract...");
    
    // --- АВТО-ТРИГГЕР ---
    if (isTWA) {
        // Запускаем попытку авто-открытия немедленно после начала запроса
        setTimeout(async () => {
            if (autoTriggerAttempted) return;
            autoTriggerAttempted = true;
            
            try {
                 // Попробуем получить ссылку, если она не была вычислена заранее
                 if (!linkToOpen) {
                    // Ждем немного, чтобы HOT.shared.request успел выполниться и определить window.openTelegram
                    // Это менее надежно, чем предварительное вычисление
                    await new Promise(resolve => setTimeout(resolve, 500)); 
                    
                    // Проверяем, доступна ли функция window.openTelegram
                    // @ts-ignore
                    if (typeof window.openTelegram === 'function') {
                        console.log("Found window.openTelegram, attempting to extract link...");
                        // Тут сложно напрямую получить ссылку, так как она внутри замыкания HOT.request
                        // Поэтому мы надеемся, что window.selector.open будет вызван внутри window.openTelegram
                    } else {
                        console.log("window.openTelegram not found for auto-trigger.");
                        // Если не нашли, попробуем вызвать напрямую window.selector.open
                        // Но для этого нужно знать ссылку, которую мы не можем легко получить
                        // Остаемся на вызове window.openTelegram, который должен быть определен
                    }
                 }
                 
                 // Попытка вызова window.openTelegram (должна быть определена внутри HOT.request)
                 // @ts-ignore
                 if (typeof window.openTelegram === 'function') {
                    console.log("Auto-triggering HOT Wallet via Telegram...");
                    // @ts-ignore
                    window.openTelegram(); // Это должно вызвать window.selector.open с правильной ссылкой
                    console.log("HOT Wallet Telegram link triggered automatically (via window.openTelegram).");
                 } else {
                    console.log("window.openTelegram still not available for auto-trigger.");
                    // Альтернативный способ: если мы смогли вычислить ссылку заранее
                    if (linkToOpen) {
                        const fullLink = `https://t.me/hot_wallet/app?startapp=${linkToOpen}`;
                        console.log("Attempting direct window.selector.open with pre-calculated link:", fullLink);
                         // @ts-ignore
                        if (typeof window.selector?.open === 'function') {
                            // @ts-ignore
                            window.selector.open(fullLink);
                            console.log("Direct window.selector.open called.");
                        } else {
                            console.log("window.selector.open is not available for direct call.");
                        }
                    }
                 }
            } catch (triggerError) {
                console.error("Failed during auto-trigger attempt:", triggerError);
                autoTriggerAttempted = false; // Позволим повторную попытку в случае ошибки?
            }
        }, 0); // Выполнить как можно скорее
    }
    // --- КОНЕЦ АВТО-ТРИГГЕРА ---

    const result = await wallet.signAndSendTransaction({
      receiverId: "easy-proxy.near",
      actions: [{
        type: "FunctionCall",
        params: {
          methodName: "nft_mint_proxy",
          args: {
            token_metadata: {
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

    // --- ВОССТАНОВЛЕНИЕ renderUI ---
    if (isTWA && originalRenderUI) {
        try {
            // @ts-ignore
            (await import("@hot-labs/near-connect/dist/wallets/hotwallet/index.js")).renderUI = originalRenderUI;
            console.log("Original renderUI restored.");
        } catch (restoreError) {
            console.error("Failed to restore original renderUI:", restoreError);
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
    // --- ВОССТАНОВЛЕНИЕ renderUI в случае ошибки ---
    // @ts-ignore
    const isTWA = typeof window !== 'undefined' && typeof window.Telegram?.WebApp !== 'undefined';
    // @ts-ignore
    if (isTWA) {
         try {
            const mod = await import("@hot-labs/near-connect/dist/wallets/hotwallet/index.js");
            // @ts-ignore
            if (mod.renderUI && mod.renderUI.name !== 'renderUI') { // Простая проверка, что она была подменена
                // @ts-ignore
                mod.renderUI = (await import("@hot-labs/near-connect/dist/wallets/hotwallet/index.js")).renderUI;
                console.log("Original renderUI restored after error.");
            }
         } catch (restoreError) {
            console.error("Failed to restore original renderUI after error:", restoreError);
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
