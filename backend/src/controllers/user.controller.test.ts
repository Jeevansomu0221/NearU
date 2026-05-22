import { deleteMyAccount } from "./user.controller";
import User from "../models/User.model";
import Order from "../models/Order.model";
import Partner from "../models/Partner.model";
import DeliveryPartner from "../models/DeliveryPartner.model";

jest.mock("../models/User.model", () => ({
  __esModule: true,
  default: {
    findByIdAndUpdate: jest.fn()
  }
}));

jest.mock("../models/Order.model", () => ({
  __esModule: true,
  default: {
    updateMany: jest.fn()
  }
}));

jest.mock("../models/Partner.model", () => ({
  __esModule: true,
  default: {
    updateOne: jest.fn()
  }
}));

jest.mock("../models/DeliveryPartner.model", () => ({
  __esModule: true,
  default: {
    updateOne: jest.fn()
  }
}));

describe("deleteMyAccount", () => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const res: any = { status };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("anonymizes user-owned records and invalidates sessions", async () => {
    const req: any = {
      user: {
        id: "64f000000000000000000001",
        role: "customer",
        phone: "9876543210",
        name: "Customer",
        sessionVersion: 0
      }
    };

    await deleteMyAccount(req, res);

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      req.user.id,
      expect.objectContaining({
        $set: expect.objectContaining({
          name: "Deleted User",
          isActive: false
        }),
        $inc: { sessionVersion: 1 }
      })
    );
    expect(Order.updateMany).toHaveBeenCalledWith(
      { customerId: req.user.id },
      expect.objectContaining({
        $set: expect.objectContaining({ deliveryAddress: "Deleted by user" })
      })
    );
    expect(Partner.updateOne).toHaveBeenCalled();
    expect(DeliveryPartner.updateOne).toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(200);
  });
});
