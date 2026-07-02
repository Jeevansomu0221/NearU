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
    findOne: jest.fn(),
    updateOne: jest.fn()
  }
}));

jest.mock("../models/DeliveryPartner.model", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    updateOne: jest.fn()
  }
}));

describe("deleteMyAccount", () => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const res: any = { status };

  beforeEach(() => {
    jest.clearAllMocks();
    (Partner.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) })
    });
    (DeliveryPartner.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) })
    });
  });

  it("deletes only customer data when role is customer", async () => {
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
        $addToSet: { deletedRoles: "customer" },
        $inc: { sessionVersion: 1 }
      })
    );
    expect(Order.updateMany).toHaveBeenCalledWith(
      { customerId: req.user.id },
      expect.objectContaining({
        $set: expect.objectContaining({ deliveryAddress: "Deleted by user" })
      })
    );
    expect(Partner.updateOne).not.toHaveBeenCalled();
    expect(DeliveryPartner.updateOne).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(200);
  });

  it("keeps shared user login when customer has partner profile", async () => {
    (Partner.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: "partner1" }) })
    });

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
        $set: expect.not.objectContaining({
          isActive: false,
          phone: expect.stringContaining("deleted_")
        }),
        $addToSet: { deletedRoles: "customer" }
      })
    );
    expect(Partner.updateOne).not.toHaveBeenCalled();
    expect(DeliveryPartner.updateOne).not.toHaveBeenCalled();
  });

  it("deletes only partner profile when role is partner", async () => {
    const req: any = {
      user: {
        id: "64f000000000000000000001",
        role: "partner",
        phone: "9876543210",
        name: "Partner Owner",
        sessionVersion: 0
      }
    };

    await deleteMyAccount(req, res);

    expect(Partner.updateOne).toHaveBeenCalledWith(
      { userId: req.user.id },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "SUSPENDED",
          rejectionReason: "Account deleted by user"
        })
      })
    );
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      req.user.id,
      expect.objectContaining({
        $addToSet: { deletedRoles: "partner" },
        $inc: { sessionVersion: 1 }
      })
    );
    expect(Order.updateMany).not.toHaveBeenCalled();
    expect(DeliveryPartner.updateOne).not.toHaveBeenCalled();
  });

  it("deletes only delivery profile when role is delivery", async () => {
    const req: any = {
      user: {
        id: "64f000000000000000000001",
        role: "delivery",
        phone: "9876543210",
        name: "Rider",
        sessionVersion: 0
      }
    };

    await deleteMyAccount(req, res);

    expect(DeliveryPartner.updateOne).toHaveBeenCalledWith(
      { userId: req.user.id },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "INACTIVE",
          reviewComment: "Account deleted by user"
        })
      })
    );
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      req.user.id,
      expect.objectContaining({
        $addToSet: { deletedRoles: "delivery" }
      })
    );
    expect(Order.updateMany).not.toHaveBeenCalled();
    expect(Partner.updateOne).not.toHaveBeenCalled();
  });
});
