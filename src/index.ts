import { WebSocket, WebSocketServer } from "ws";
import http from "http";

const wss = new WebSocketServer({ port: 8080 });

const allSockets = new Map<string, Set<WebSocket>>();

interface BaseMessage {
  type: "join" | "leave" | "message" | "chat";
}

interface JoinMessage extends BaseMessage {
  type: "join";
  payload: {
    roomId: string;
    username: string;
  };
}

interface ChatMessage extends BaseMessage {
  type: "chat";
  payload: {
    content: string;
    sender: string;
  };
}

interface LeaveMessage extends BaseMessage {
  type: "leave";
  payload: {
    roomId: string;
  };
}

type Message = JoinMessage | ChatMessage | LeaveMessage;
interface socketRoomsValue {
  roomId: string;
  userName: string;
}
const socketRooms = new Map<WebSocket, socketRoomsValue>();

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
          console.log(parsedMessage.payload);
          socketRooms.set(ws, {
            roomId,
            userName: parsedMessage.payload.username,
          });
          console.log(`User joined room ${roomId}`);
          sockets.forEach((socket) => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(
                JSON.stringify({
                  type: "joined",
                  payload: {
                    roomId,
                    users: Array.from(sockets).map(
                      (s) => socketRooms.get(s)?.userName
                    ),
                    username: parsedMessage.payload.username,
                  },
                })
              );
            }
          });
          break;
        }
        case "chat": {
          const roomDetails = socketRooms.get(ws);
          if (roomDetails) {
            const sockets = allSockets.get(roomDetails?.roomId);
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
    const roomDetails = socketRooms.get(ws);
    if (roomDetails) {
      const sockets = allSockets.get(roomDetails.roomId);
      if (sockets) {
        sockets.delete(ws);
        if (sockets.size === 0) {
          allSockets.delete(roomDetails.roomId);
        }
        sockets.forEach((socket) => {
          if (socket !== ws && socket.readyState === WebSocket.OPEN) {
            socket.send(
              JSON.stringify({
                type: "leave",
                payload: {
                  roomId: roomDetails.roomId,
                  users: Array.from(sockets).map(
                    (s) => socketRooms.get(s)?.userName
                  ),
                  username: roomDetails.userName,
                },
              })
            );
          }
        });
      }
      socketRooms.delete(ws);
    }
  });
});
const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

server.listen(8081, () => {
  console.log("HTTP server listening on port 8081");
});
