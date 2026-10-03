export type SocketState = "connecting" | "live" | "reconnecting";

const HL_WS = "wss://api.hyperliquid.xyz/ws";
/** No message for this long means the socket is dead even if it says it is open. */
const STALE_MS = 20_000;

/**
 * Opens Hyperliquid's public WebSocket, subscribes, and keeps it alive:
 * exponential backoff on failure, a watchdog for silent stalls, a ping so the
 * server does not drop an idle stream, and a pause while the tab is hidden.
 * Returns a function that tears everything down.
 */
export function connectHyperliquid(opts: {
  subscriptions: object[];
  onMessage: (channel: string, data: unknown) => void;
  onState: (state: SocketState) => void;
}): () => void {
  let ws: WebSocket | null = null;
  let disposed = false;
  let paused = false;
  let attempt = 0;
  let live = false;
  let lastMessageAt = 0;
  let retry: ReturnType<typeof setTimeout> | undefined;

  const teardown = () => {
    if (!ws) return;
    ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
    ws.close();
    ws = null;
  };

  const reconnect = () => {
    teardown();
    if (disposed || paused) return;
    live = false;
    opts.onState("reconnecting");
    retry = setTimeout(open, Math.min(30_000, 1_000 * 2 ** attempt++));
  };

  function open() {
    if (disposed || paused) return;
    const socket = new WebSocket(HL_WS);
    ws = socket;
    lastMessageAt = Date.now();
    socket.onopen = () => {
      for (const subscription of opts.subscriptions) socket.send(JSON.stringify({ method: "subscribe", subscription }));
    };
    socket.onmessage = (event) => {
      lastMessageAt = Date.now();
      let msg: { channel?: string; data?: unknown };
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }
      if (!msg.channel || msg.channel === "subscriptionResponse" || msg.channel === "pong") return;
      if (!live) {
        live = true;
        attempt = 0;
        opts.onState("live");
      }
      opts.onMessage(msg.channel, msg.data);
    };
    socket.onerror = () => socket.close();
    socket.onclose = reconnect;
  }

  const keepAlive = setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ method: "ping" }));
    if (ws && Date.now() - lastMessageAt > STALE_MS) reconnect();
  }, 15_000);

  const onVisibility = () => {
    if (document.hidden) {
      paused = true;
      clearTimeout(retry);
      teardown();
    } else if (paused) {
      paused = false;
      attempt = 0;
      opts.onState("reconnecting");
      open();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);
  open();

  return () => {
    disposed = true;
    clearTimeout(retry);
    clearInterval(keepAlive);
    document.removeEventListener("visibilitychange", onVisibility);
    teardown();
  };
}
