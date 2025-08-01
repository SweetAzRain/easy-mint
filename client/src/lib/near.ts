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

    if (wallet.mock) {
      // Demo mode simulation
      console.log("Demo mode - simulating NEAR contract call:");
      console.log(`near call easy-proxy.near nft_mint_proxy '{"token_metadata": ${JSON.stringify({
        title: params.title,
        description: params.description,
        media: params.media,
        reference: params.reference
      })}}' --accountId user.near --deposit 0.2 --gas 300000000000000 --networkId mainnet`);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const tokenId = `nft_${Date.now()}`;
      const transactionHash = `tx_${Date.now()}`;

      console.log("Demo NFT minted successfully:", { tokenId, transactionHash });
      return { tokenId, transactionHash };
    }

    // Real wallet implementation
    console.log("Calling NEAR smart contract...");
    
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
          deposit: "200000000000000000000000" // 0.2 NEAR in yoctoNEAR
        }
      }]
    });

    console.log("Real NFT minted successfully:", result);
    
    return {
      tokenId: result.transaction_outcome?.id || `nft_${Date.now()}`,
      transactionHash: result.transaction?.hash || result.transaction_outcome?.id || `tx_${Date.now()}`
    };

  } catch (error: any) {
    console.error("NFT minting failed:", error);
    
    if (error.message?.includes("User rejected") || 
        error.message?.includes("cancelled") ||
        error.message?.includes("User cancelled")) {
      throw new Error("Transaction was cancelled by user");
    }
    
    throw new Error(error.message || "Failed to mint NFT");
  }
}
