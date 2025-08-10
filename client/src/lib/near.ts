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

// ИЗМЕНЕНО: Второй аргумент теперь функция
export async function mintNFT(
  params: MintParams,
  signAndSendTransactionFn: (params: any) => Promise<any> // <-- Типизируем аргумент как функцию
): Promise<MintResult> {
  try {
    console.log("Minting NFT with params:", params);

    // ИЗМЕНЕНО: Проверяем функцию, а не объект wallet
    if (!signAndSendTransactionFn) {
      throw new Error("Wallet not connected or signAndSendTransaction function is missing");
    }

    // Убираем проверку typeof wallet.signAndSendTransaction, так как теперь это функция

    // Real wallet implementation
    console.log("Calling NEAR smart contract...");

    // ИЗМЕНЕНО: Вызываем переданную функцию напрямую
    // ИСПРАВЛЕНО: Синтаксис объекта для args
    const result = await signAndSendTransactionFn({
      receiverId: "easy-proxy.near", // Убедитесь, что это правильный адрес вашего контракта в mainnet
      actions: [{
        type: "FunctionCall",
        params: {
          methodName: "nft_mint_proxy",
          args: {
            // ВАЖНО: Исправлен синтаксис объекта и имя поля
            // ДОЛЖНО БЫТЬ token_metadata, как вы указали
            token_metadata: { // <-- Исправлено: token_metadata: { ... }
              title: params.title,
              description: params.description,
              media: params.media.trim(), // trim() для удаления случайных пробелов
              reference: params.reference.trim()
            }
          },
          gas: "300000000000000",
          deposit: "11000000000000000000000" // 0.011 NEAR in yoctoNEAR
        }
      }]
    });

    console.log("NFT minted successfully:", result);

    // Improved result parsing based on typical wallet response structure
    // Adjust based on the actual structure returned by your wallet selector library
    const transactionOutcomeId = result?.transaction_outcome?.id;
    const transactionHash = result?.transaction?.hash || transactionOutcomeId;

    if (!transactionHash) {
        console.warn("Could not extract transaction hash from result:", result);
        // Fallback, though ideally the transaction should have a hash
    }

    return {
      tokenId: transactionOutcomeId || `nft_${Date.now()}`, // Often the outcome ID is used
      transactionHash: transactionHash || `tx_${Date.now()}`
    };

  } catch (error: any) {
    console.error("NFT minting failed:", error);
    if (error.message?.includes("User rejected") ||
        error.message?.includes("cancelled") ||
        error.message?.includes("User cancelled")) {
      throw new Error("Transaction was cancelled by user");
    }
    // Re-throw the original error or a new one with a clearer message
    throw error; // Or: throw new Error(error.message || "Failed to mint NFT");
  }
}
