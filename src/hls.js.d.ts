declare module 'hls.js' {
  interface HlsConfig {
    startLevel?: number;
    enableWorker?: boolean;
  }

  interface HlsEvents {
    MANIFEST_PARSED: string;
    ERROR: string;
  }

  class Hls {
    static isSupported(): boolean;
    static readonly Events: HlsEvents;
    constructor(config?: Partial<HlsConfig>);
    loadSource(url: string): void;
    attachMedia(media: HTMLMediaElement): void;
    on(event: string, callback: (...args: unknown[]) => void): void;
    destroy(): void;
  }

  export default Hls;
}
