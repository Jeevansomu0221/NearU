import crypto from "crypto";

// Mock OTP service - replace with Twilio/TextLocal in production
export class OTPService {
  // Generate 6-digit OTP
  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Store OTP temporarily (use Redis in production)
  static otpStore = new Map<string, { otp: string; expiresAt: Date }>();

  static async sendOTP(phone: string): Promise<{ otp: string; success: boolean }> {
    try {
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      // Store OTP
      this.otpStore.set(phone, { otp, expiresAt });
      
      // In production: Send via SMS service
      console.log(`OTP for ${phone}: ${otp}`);
      
      return { otp, success: true };
    } catch (error) {
      console.error("Error sending OTP:", error);
      throw error;
    }
  }

  static async verifyOTP(phone: string, userOtp: string): Promise<boolean> {
    const stored = this.otpStore.get(phone);
    
    if (!stored) {
      return false;
    }
    
    // Check if OTP expired
    if (new Date() > stored.expiresAt) {
      this.otpStore.delete(phone);
      return false;
    }
    
    // Check OTP match
    if (stored.otp !== userOtp) {
      return false;
    }
    
    // OTP verified, remove from store
    this.otpStore.delete(phone);
    return true;
  }
}