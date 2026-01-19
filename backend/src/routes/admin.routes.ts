import { Router, Request, Response } from "express";
import Order from "../models/Order.model";
import SubOrder from "../models/SubOrder.model";

const router = Router();

/**
 * ADMIN DASHBOARD (test)
 */
router.get("/dashboard", (req: Request, res: Response) => {
  res.json({ message: "Admin dashboard working" });
});

/**
 * 1️⃣ ADMIN CREATES PARENT ORDER
 */
router.post("/orders", async (req: Request, res: Response) => {
  const { customerId, deliveryAddress, totalAmount } = req.body;

  const order = await Order.create({
    customerId,
    deliveryAddress,
    totalAmount,
  });

  res.status(201).json(order);
});

/**
 * 2️⃣ ADMIN SPLITS ORDER INTO SUBORDERS
 */
router.post(
  "/orders/:orderId/suborders",
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { subOrders } = req.body;

    /*
      subOrders = [
        {
          partnerId,
          items,
          price
        }
      ]
    */

    const createdSubOrders = await Promise.all(
      subOrders.map((sub: any) =>
        SubOrder.create({
          orderId,
          partnerId: sub.partnerId,
          items: sub.items,
          price: sub.price,
          status: "PENDING",
        })
      )
    );

    res.status(201).json(createdSubOrders);
  }
);

export default router;
