/** Error codes emitted by the Astalanty SDK. */
export type AstalantyErrorCode =
  | "INVALID_CONFIG"
  | "INVALID_ADDRESS"
  | "WALLET_NOT_CONNECTED"
  | "SMART_ACCOUNT_NOT_FOUND"
  | "TRANSACTION_FAILED"
  | "UNSUPPORTED_OPERATION";

/** Base SDK error with a stable machine-readable code. */
export class AstalantySDKError extends Error {
  public readonly code: AstalantyErrorCode;
  public readonly cause?: unknown;

  constructor(code: AstalantyErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "AstalantySDKError";
    this.code = code;
    this.cause = cause;
  }
}

/** Wraps unknown errors into the SDK error shape without hiding the original cause. */
export function toAstalantyError(
  code: AstalantyErrorCode,
  message: string,
  cause: unknown
): AstalantySDKError {
  if (cause instanceof AstalantySDKError) {
    return cause;
  }

  return new AstalantySDKError(code, message, cause);
}
