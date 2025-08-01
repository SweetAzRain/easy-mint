import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // IPFS proxy endpoints (if needed for CORS or additional processing)
  app.post("/api/ipfs/upload", async (req, res) => {
    try {
      // This could be used as a proxy to Filebase if needed
      // For now, we'll handle IPFS uploads directly from the frontend
      res.json({ message: "IPFS upload should be handled client-side" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Contract info endpoint
  app.get("/api/contract/info", (req, res) => {
    res.json({
      contractId: "monkey_proxy.testnet",
      networkId: "testnet",
      storageDeposit: "0.01",
      mintingCost: "0.2"
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
