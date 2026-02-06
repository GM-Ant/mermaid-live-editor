import { beforeAll, vi } from 'vitest';

// TODO: Remove once https://github.com/sveltejs/kit/issues/6259 is closed.
beforeAll(() => {
  vi.mock('$app/environment', () => ({
    browser: 'window' in globalThis,
    dev: true
  }));

  if (typeof window !== 'undefined' && !window.localStorage) {
    const mockStorage: Record<string, string> = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        clear: vi.fn(() => {
          for (const key in mockStorage) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete mockStorage[key];
          }
        }),
        getItem: vi.fn((key: string) => mockStorage[key] ?? null),
        key: vi.fn((index: number) => Object.keys(mockStorage)[index] ?? null),
        length: 0,
        removeItem: vi.fn((key: string) => {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete mockStorage[key];
        }),
        setItem: vi.fn((key: string, value: string) => {
          mockStorage[key] = value;
        })
      },
      writable: true
    });
    Object.defineProperty(window.localStorage, 'length', {
      get: () => Object.keys(mockStorage).length
    });
  }
});
