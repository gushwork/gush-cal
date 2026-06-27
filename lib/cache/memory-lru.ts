type Entry<V> = {
  value: V;
  expiresAt: number;
};

export type MemoryLruOptions = {
  maxSize: number;
  ttlMs: number;
};

export class MemoryLru<V> {
  private map = new Map<string, Entry<V>>();

  constructor(private readonly options: MemoryLruOptions) {}

  get(key: string): V | undefined {
    const entry = this.map.get(key);
    if (!entry) {
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.options.maxSize) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) {
        this.map.delete(oldest);
      }
    }
    this.map.set(key, {
      value,
      expiresAt: Date.now() + this.options.ttlMs,
    });
  }

  clear(): void {
    this.map.clear();
  }
}
