import { WebSocket, WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 });

const allSockets = new Map<string, Set<WebSocket>>();

interface BaseMessage {
  type: "join" | "leave" | "message" | "chat";
}

interface JoinMessage extends BaseMessage {
  type: "join";
  payload: {
    roomId: string;
  };
}

interface ChatMessage extends BaseMessage {
  type: "chat";
  payload: {
    content: string;
    sender: string;
  };
}

type Message = JoinMessage | ChatMessage;

const socketRooms = new Map<WebSocket, string>();

wss.on("connection", (ws: WebSocket) => {
  ws.on("message", (msg) => {
    try {
      const parsedMessage = JSON.parse(msg.toString()) as Message;

      switch (parsedMessage.type) {
        case "join": {
          const roomId = parsedMessage.payload.roomId;
          const sockets = allSockets.get(roomId) || new Set<WebSocket>();
          sockets.add(ws);
          allSockets.set(roomId, sockets);
          socketRooms.set(ws, roomId);
          console.log(`User joined room ${roomId}`);
          break;
        }
        case "chat": {
          const roomId = socketRooms.get(ws);
          if (roomId) {
            const sockets = allSockets.get(roomId);
            if (sockets) {
              sockets.forEach((socket) => {
                if (socket.readyState === WebSocket.OPEN) {
                  if (socket !== ws) socket.send(JSON.stringify(parsedMessage));
                }
              });
            }
          }
          break;
        }
      }
    } catch (error) {
      console.error("Failed to parse message:", error);
    }
  });

  ws.on("close", () => {
    const roomId = socketRooms.get(ws);
    if (roomId) {
      const sockets = allSockets.get(roomId);
      if (sockets) {
        sockets.delete(ws);
        if (sockets.size === 0) {
          allSockets.delete(roomId);
        }
      }
      socketRooms.delete(ws);
    }
  });
});
