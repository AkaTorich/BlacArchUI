declare module '@novnc/novnc/lib/rfb' {
  interface RFBOptions {
    shared?: boolean;
    credentials?: { username?: string; password?: string; target?: string };
    repeaterID?: string;
    wsProtocols?: string[];
  }

  class RFB {
    constructor(target: HTMLElement, urlOrChannel: string | WebSocket, options?: RFBOptions);

    // Properties
    background: string;
    capabilities: { power: boolean };
    clipViewport: boolean;
    clippingViewport: boolean;
    compressionLevel: number;
    dragViewport: boolean;
    focusOnClick: boolean;
    qualityLevel: number;
    resizeSession: boolean;
    scaleViewport: boolean;
    securityFilter: 'auto' | 'none' | 'encrypted';
    showDotCursor: boolean;
    viewOnly: boolean;

    // Methods
    approveServer(): void;
    blur(): void;
    clipboardPasteFrom(text: string): void;
    disconnect(): void;
    focus(): void;
    getImageData(): ImageData;
    machineReboot(): void;
    machineReset(): void;
    machineShutdown(): void;
    sendCredentials(credentials: { username?: string; password?: string; target?: string }): void;
    sendCtrlAltDel(): void;
    sendKey(keysym: number, code: string | null, down?: boolean): void;
    toBlob(callback: (blob: Blob) => void, type?: string, quality?: number): void;
    toDataURL(type?: string, encoderOptions?: number): string;

    // Events
    addEventListener(type: 'bell', listener: () => void): void;
    addEventListener(type: 'capabilities', listener: (e: CustomEvent<{ capabilities: { power: boolean } }>) => void): void;
    addEventListener(type: 'clipboard', listener: (e: CustomEvent<{ text: string }>) => void): void;
    addEventListener(type: 'clippingviewport', listener: (e: CustomEvent<boolean>) => void): void;
    addEventListener(type: 'connect', listener: (e: CustomEvent) => void): void;
    addEventListener(type: 'credentialsrequired', listener: (e: CustomEvent<{ types: string[] }>) => void): void;
    addEventListener(type: 'desktopname', listener: (e: CustomEvent<{ name: string }>) => void): void;
    addEventListener(type: 'disconnect', listener: (e: CustomEvent<{ clean: boolean }>) => void): void;
    addEventListener(type: 'securityfailure', listener: (e: CustomEvent<{ status: number; reason: string }>) => void): void;
    addEventListener(type: 'serververification', listener: (e: CustomEvent) => void): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  }

  export default RFB;
}
