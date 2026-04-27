import { OTPService } from "./otp.service";

describe("OTPService", () => {
  it("rejects an invalid OTP in memory mode", async () => {
    await OTPService.sendOTP("9876543210");
    await expect(OTPService.verifyOTP("9876543210", "000000")).resolves.toBe(false);
  });
});
