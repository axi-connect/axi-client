"use client";

import { io, type Socket } from "socket.io-client";
import { WS_BASE_URL } from "@/core/config/env";
import {
  REALTIME_NAMESPACES,
  type ClientEventsOf,
  type RealtimeNamespace,
  type ServerEventsOf,
  type WsAck,
} from "./events";

/**
 * Gestor de conexiones Socket.IO — un socket singleton por namespace.
 *
 * - El access token (15 min) se obtiene del BFF (`GET /api/auth/token`), que lo
 *   refresca si está por expirar; el browser nunca toca la cookie HttpOnly.
 * - Socket.IO no re-negocia `auth` en caliente: antes de que el token del
 *   handshake caduque se agenda una rotación (nuevo token → `disconnect()` +
 *   `connect()`); los rooms `company_/user_` se re-unen solos, los rooms de
 *   conversación los re-une el hook del slice en el evento `connect`.
 * - En `connect_error` por token inválido se pide un token fresco y se
 *   reintenta con backoff (1s → 2s → 5s → … tope 30s).
 */

type TokenResponse = {
  token: string;
  /** Epoch en milisegundos en que expira el access token. */
  expires_at: number;
};

/** Margen antes de la expiración para rotar el token del handshake. */
const ROTATE_MARGIN_MS = 60_000;
const BACKOFF_STEPS_MS = [1_000, 2_000, 5_000, 10_000, 30_000];

export type TypedSocket<N extends RealtimeNamespace> = Socket<
  ServerEventsOf<N>,
  ClientEventsOf<N>
>;

type ManagedConnection = {
  socket: Socket;
  rotateTimer: ReturnType<typeof setTimeout> | null;
  retryTimer: ReturnType<typeof setTimeout> | null;
  retryAttempt: number;
};

async function fetchToken(): Promise<TokenResponse> {
  const res = await fetch("/api/auth/token", { cache: "no-store" });
  if (!res.ok) throw new Error(`No fue posible obtener el token del WS (HTTP ${res.status})`);
  return (await res.json()) as TokenResponse;
}

class SocketManager {
  private readonly connections = new Map<RealtimeNamespace, ManagedConnection>();

  /**
   * Conexiones en curso. `connect()` espera un token antes de poder registrar
   * nada en `connections`, así que dos consumidores que montan en el mismo
   * commit (p.ej. la campana de notificaciones del layout y la vista del inbox)
   * pasaban los dos el chequeo de "¿ya existe?" y abrían DOS sockets al mismo
   * namespace. Solo uno quedaba registrado; el otro seguía conectado como
   * zombi, duplicando entregas y peticiones de token.
   */
  private readonly pending = new Map<RealtimeNamespace, Promise<Socket>>();

  /**
   * F15: tras `company.suspended` el token está bumpeado — reconectar solo
   * martillea el server. `halt()` corta todo y bloquea nuevos `connect()`
   * hasta `reset()` (login exitoso) o una recarga completa de la página.
   */
  private halted = false;

  halt(): void {
    this.halted = true;
    this.disconnectAll();
  }

  reset(): void {
    this.halted = false;
  }

  /** Devuelve (creando si es necesario) el socket del namespace, ya conectando. */
  async connect<N extends RealtimeNamespace>(namespace: N): Promise<TypedSocket<N>> {
    if (this.halted) throw new Error("Tiempo real detenido: empresa suspendida");
    const existing = this.connections.get(namespace);
    if (existing) return existing.socket as TypedSocket<N>;

    // Se memoiza ANTES del primer await: los consumidores concurrentes comparten
    // el mismo socket en vez de abrir uno cada uno.
    const inFlight = this.pending.get(namespace);
    if (inFlight) return (await inFlight) as TypedSocket<N>;

    const attempt = this.openConnection(namespace).finally(() => {
      this.pending.delete(namespace);
    });
    this.pending.set(namespace, attempt);
    return (await attempt) as TypedSocket<N>;
  }

  private async openConnection(namespace: RealtimeNamespace): Promise<Socket> {
    const { token, expires_at } = await fetchToken();
    const socket = io(`${WS_BASE_URL}/${namespace}`, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
    });

    const connection: ManagedConnection = {
      socket,
      rotateTimer: null,
      retryTimer: null,
      retryAttempt: 0,
    };
    this.connections.set(namespace, connection);

    socket.on("connect", () => {
      connection.retryAttempt = 0;
    });
    socket.on("connect_error", () => {
      this.handleConnectError(namespace, connection);
    });

    this.scheduleTokenRotation(namespace, connection, expires_at);
    return socket;
  }

  /** Socket ya creado para el namespace (o null si no se ha conectado). */
  getSocket<N extends RealtimeNamespace>(namespace: N): TypedSocket<N> | null {
    return (this.connections.get(namespace)?.socket as TypedSocket<N>) ?? null;
  }

  isConnected(namespace: RealtimeNamespace): boolean {
    return this.connections.get(namespace)?.socket.connected ?? false;
  }

  disconnect(namespace: RealtimeNamespace): void {
    // Una conexión a medio abrir ya no interesa a nadie: se descarta la
    // memoización para que el próximo `connect()` empiece de cero.
    this.pending.delete(namespace);
    const connection = this.connections.get(namespace);
    if (!connection) return;
    this.clearTimers(connection);
    connection.socket.removeAllListeners();
    connection.socket.disconnect();
    this.connections.delete(namespace);
  }

  disconnectAll(): void {
    for (const namespace of Object.values(REALTIME_NAMESPACES)) {
      this.disconnect(namespace);
    }
  }

  /**
   * Emite un comando y espera su ack tipado. Rechaza con timeout si el
   * backend no responde (socket caído a mitad de emisión, etc.).
   */
  emitWithAck<TData>(
    socket: Socket,
    event: string,
    payload: unknown,
    timeoutMs = 10_000,
  ): Promise<WsAck<TData>> {
    return socket
      .timeout(timeoutMs)
      .emitWithAck(event, payload) as Promise<WsAck<TData>>;
  }

  // -------------------------------------------------------------------------

  /** Rota el token del handshake antes de que caduque (Socket.IO no re-negocia auth en vivo). */
  private scheduleTokenRotation(
    namespace: RealtimeNamespace,
    connection: ManagedConnection,
    expiresAt: number,
  ): void {
    if (connection.rotateTimer) clearTimeout(connection.rotateTimer);
    const delay = Math.max(5_000, expiresAt - Date.now() - ROTATE_MARGIN_MS);
    connection.rotateTimer = setTimeout(async () => {
      try {
        const { token, expires_at } = await fetchToken();
        connection.socket.auth = { token };
        if (connection.socket.connected) {
          connection.socket.disconnect();
          connection.socket.connect();
        }
        this.scheduleTokenRotation(namespace, connection, expires_at);
      } catch {
        // Sin token nuevo (sesión caída): el connect_error posterior aplica el backoff.
        this.handleConnectError(namespace, connection);
      }
    }, delay);
  }

  /** Backoff con token fresco: cubre el caso de handshake rechazado por token expirado. */
  private handleConnectError(
    namespace: RealtimeNamespace,
    connection: ManagedConnection,
  ): void {
    if (connection.retryTimer) return; // ya hay un reintento agendado
    const step = Math.min(connection.retryAttempt, BACKOFF_STEPS_MS.length - 1);
    connection.retryAttempt += 1;
    connection.retryTimer = setTimeout(async () => {
      connection.retryTimer = null;
      try {
        const { token, expires_at } = await fetchToken();
        connection.socket.auth = { token };
        connection.socket.connect();
        this.scheduleTokenRotation(namespace, connection, expires_at);
      } catch {
        this.handleConnectError(namespace, connection);
      }
    }, BACKOFF_STEPS_MS[step]);
  }

  private clearTimers(connection: ManagedConnection): void {
    if (connection.rotateTimer) clearTimeout(connection.rotateTimer);
    if (connection.retryTimer) clearTimeout(connection.retryTimer);
    connection.rotateTimer = null;
    connection.retryTimer = null;
  }
}

/** Singleton de la app. Los slices lo consumen vía hooks (`use-socket`), nunca directo desde UI. */
export const socketManager = new SocketManager();
