declare module "react-native-customui" {
  type CustomUiOptions = Record<string, string | number | boolean>;

  type CustomUiSuccess = Record<string, string>;

  const Razorpay: {
    open(options: CustomUiOptions): Promise<CustomUiSuccess>;
    getAppsWhichSupportUPI(callback?: (data: unknown) => void): Promise<unknown>;
    initRazorpay(key: string): Promise<void>;
    validateOptions(options: CustomUiOptions): Promise<unknown>;
  };

  export default Razorpay;
}
