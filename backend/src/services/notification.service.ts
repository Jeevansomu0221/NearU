// NEARU/backend/src/services/notification.service.ts
import { Server } from "socket.io";
import { Server as HttpServer } from "http";

let io: Server;

export const initializeSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket: any) => {
    console.log("New client connected:", socket.id);

    // Partner joins their room
    socket.on("partner:join", (partnerId: string) => {
      socket.join(`partner:${partnerId}`);
      console.log(`Partner ${partnerId} joined their room`);
    });

    // Delivery joins their room
    socket.on("delivery:join", (deliveryId: string) => {
      socket.join(`delivery:${deliveryId}`);
      console.log(`Delivery ${deliveryId} joined their room`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
};

export const notifyPartner = (partnerId: string, order: any): void => {
  if (!io) return;
  
  io.to(`partner:${partnerId}`).emit("order:new", {
    type: "NEW_ORDER",
    order,
    message: `New order received! Order #${order._id.slice(-6)}`,
    timestamp: new Date()
  });
};

export const notifyOrderStatusUpdate = (orderId: string, status: string, userId: string): void => {
  if (!io) return;
  
  io.to(`partner:${userId}`).emit("order:status", {
    orderId,
    status,
    timestamp: new Date()
  });
};