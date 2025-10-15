type PendingGridAuth = {
  user: any;
  sessionSecrets: any;
  createdAt: number;
  userData?: {
    email: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    phoneNumber?: string | null;
  };
  adminData?: {
    email: string;
    firstName: string;
    lastName: string;
    permissions: string[];
  };
};

export const PENDING_TTL_MS = 1000 * 60 * 10; // 10 minutes

const pending = new Map<string, PendingGridAuth>();

export const savePending = async (key: string, value: PendingGridAuth) => {
  pending.set(key, value);
};

export const getPending = async (key: string) => {
  return pending.get(key) ?? null;
};

export const removePending = async (key: string) => {
  pending.delete(key);
};

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of pending.entries()) {
    if (now - v.createdAt > PENDING_TTL_MS) pending.delete(k);
  }
}, 1000 * 60).unref();

export default pending;
