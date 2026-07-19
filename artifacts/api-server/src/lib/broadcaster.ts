import type { Response } from "express";

// Set of all currently connected SSE response objects
const clients = new Set<Response>();

export function addClient(res: Response): void {
  clients.add(res);
}

export function removeClient(res: Response): void {
  clients.delete(res);
}

/**
 * Broadcast a named SSE event to every connected client.
 * Clients that have disconnected are silently dropped.
 */
export function broadcast(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}

export function clientCount(): number {
  return clients.size;
}
