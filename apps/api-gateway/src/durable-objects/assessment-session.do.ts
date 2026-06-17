import { DurableObject } from "cloudflare:workers";
import type { Env } from "../types/env";

export class AssessmentSessionDO extends DurableObject {
  private sessions: Set<WebSocket> = new Set();

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const { 0: client, 1: server } = new WebSocketPair();

    this.ctx.acceptWebSocket(server);
    this.sessions.add(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    // In the future: handle incoming client messages (e.g. ping)
  }

  webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    this.sessions.delete(ws);
  }

  webSocketError(ws: WebSocket, error: unknown) {
    this.sessions.delete(ws);
  }

  /**
   * Broadcast an event to all connected clients for this assessment.
   * Can be called by internal services / workflows.
   */
  async broadcast(event: any) {
    const payload = JSON.stringify(event);
    for (const session of this.sessions) {
      try {
        session.send(payload);
      } catch (err) {
        this.sessions.delete(session);
      }
    }
  }
}
