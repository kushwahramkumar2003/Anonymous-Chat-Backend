"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const wss = new ws_1.WebSocketServer({ port: 8080 });
const allSockets = new Map();
const socketRooms = new Map();
wss.on("connection", (ws) => {
    ws.on("message", (msg) => {
        try {
            const parsedMessage = JSON.parse(msg.toString());
            switch (parsedMessage.type) {
                case "join": {
                    const roomId = parsedMessage.payload.roomId;
                    const sockets = allSockets.get(roomId) || new Set();
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
                                if (socket.readyState === ws_1.WebSocket.OPEN) {
                                    if (socket !== ws)
                                        socket.send(JSON.stringify(parsedMessage));
                                }
                            });
                        }
                    }
                    break;
                }
            }
        }
        catch (error) {
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
