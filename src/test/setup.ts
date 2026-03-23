import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// Mock import.meta.env
vi.stubGlobal('import', { meta: { env: { VITE_API_URL: 'http://localhost:3000/api', DEV: true } } });

// Mock window.location
const locationMock = {
  ...window.location,
  href: '',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
};
Object.defineProperty(window, 'location', {
  value: locationMock,
  writable: true,
});

// Mock sessionStorage and localStorage
const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
};

Object.defineProperty(window, 'sessionStorage', { value: createStorageMock() });
Object.defineProperty(window, 'localStorage', { value: createStorageMock() });

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class IntersectionObserverMock {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: ReadonlyArray<number> = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
}
vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('ResizeObserver', ResizeObserverMock);

// Mock indexedDB (for Dexie offline storage)
const indexedDBMock = {
  open: vi.fn(),
  deleteDatabase: vi.fn().mockReturnValue({
    onsuccess: null,
    onerror: null,
    onblocked: null,
  }),
  cmp: vi.fn(),
  databases: vi.fn().mockResolvedValue([]),
};
Object.defineProperty(window, 'indexedDB', { value: indexedDBMock });
