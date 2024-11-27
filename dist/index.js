"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const http_1 = __importDefault(require("http"));
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
                    console.log(parsedMessage.payload);
                    socketRooms.set(ws, {
                        roomId,
                        userName: parsedMessage.payload.username,
                    });
                    console.log(`User joined room ${roomId}`);
                    sockets.forEach((socket) => {
                        if (socket.readyState === ws_1.WebSocket.OPEN) {
                            socket.send(JSON.stringify({
                                type: "joined",
                                payload: {
                                    roomId,
                                    users: Array.from(sockets).map((s) => { var _a; return (_a = socketRooms.get(s)) === null || _a === void 0 ? void 0 : _a.userName; }),
                                    username: parsedMessage.payload.username,
                                },
                            }));
                        }
                    });
                    break;
                }
                case "chat": {
                    const roomDetails = socketRooms.get(ws);
                    if (roomDetails) {
                        const sockets = allSockets.get(roomDetails === null || roomDetails === void 0 ? void 0 : roomDetails.roomId);
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
        const roomDetails = socketRooms.get(ws);
        if (roomDetails) {
            const sockets = allSockets.get(roomDetails.roomId);
            if (sockets) {
                sockets.delete(ws);
                if (sockets.size === 0) {
                    allSockets.delete(roomDetails.roomId);
                }
                sockets.forEach((socket) => {
                    if (socket !== ws && socket.readyState === ws_1.WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            type: "leave",
                            payload: {
                                roomId: roomDetails.roomId,
                                users: Array.from(sockets).map((s) => { var _a; return (_a = socketRooms.get(s)) === null || _a === void 0 ? void 0 : _a.userName; }),
                                username: roomDetails.userName,
                            },
                        }));
                    }
                });
            }
            socketRooms.delete(ws);
        }
    });
});
const server = http_1.default.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
    }
    else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
    }
});
server.listen(8081, () => {
    console.log("HTTP server listening on port 8081");
});
