import { io, type Socket } from "socket.io-client";
import { getToken } from "./api";

let socket: Socket | null = null;

export function getQueueSocket(): Socket {
  if (!socket) {
    socket = io({
      path: "/socket.io/",
      autoConnect: false,
      auth: { token: getToken() ?? "" },
    });
  }
  return socket;
}

export function resetQueueSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
