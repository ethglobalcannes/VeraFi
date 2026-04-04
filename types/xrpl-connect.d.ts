declare module "xrpl-connect" {
  export class WalletManager {
    connect(adapter: unknown): Promise<void>;
    disconnect(): Promise<void>;
    on(event: string, cb: (data: unknown) => void): void;
    off(event: string, cb: (data: unknown) => void): void;
  }

  export class XamanAdapter {}
  export class CrossmarkAdapter {}
  export class GemWalletAdapter {}
}
