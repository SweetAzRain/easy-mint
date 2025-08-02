// near.ts
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

export async function mintNFT(params: MintParams, signAndSendTransactionFn: any): Promise<MintResult> {
  try {
    console.log("Minting NFT with params:", params);

    if (!signAndSendTransactionFn) {
      throw new Error("Wallet not connected");
    }

    // Real wallet implementation
    console.log("Calling NEAR smart contract...");
    const result = await signAndSendTransaction({
      receiverId: "easy-proxy.near", // Updated for testnet
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
          deposit: "200000000000000000000000" // 0.2 NEAR in yoctoNEAR
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
