import { deleteMyAccount } from "./user.controller";
import User from "../models/User.model";
import { executeAccountDeletion } from "../services/accountDeletion.service";

jest.mock("../models/User.model", () => ({
  __esModule: true,
  default: {
    findByIdAndUpdate: jest.fn()
  }
}));

jest.mock("../services/accountDeletion.service", () => ({
  executeAccountDeletion: jest.fn()
}));

describe("deleteMyAccount", () => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const res: any = { status };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes customer account immediately", async () => {
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

    expect(executeAccountDeletion).toHaveBeenCalledWith(req.user.id, "customer");
    expect(status).toHaveBeenCalledWith(200);
  });

  it("requires deletion request flow for partner role", async () => {
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

    expect(executeAccountDeletion).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(400);
  });

  it("requires deletion request flow for delivery role", async () => {
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

    expect(executeAccountDeletion).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(400);
  });
});
