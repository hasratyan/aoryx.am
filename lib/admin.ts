type AdminIdentity = {
  id?: string | null;
  email?: string | null;
};

const parseList = (value: string | undefined): Set<string> => {
  if (!value) return new Set();
  return new Set(
    value
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0)
  );
};

const adminEmails = parseList(process.env.ADMIN_EMAILS);
const adminUserIds = parseList(process.env.ADMIN_USER_IDS);
const adminDomains = parseList(process.env.ADMIN_EMAIL_DOMAINS);

export const hasAdminConfig = () =>
  adminEmails.size > 0 || adminUserIds.size > 0 || adminDomains.size > 0;

export const isAdminUser = (identity?: AdminIdentity | null): boolean => {
  if (!identity) return false;
  const email = identity.email?.trim().toLowerCase() ?? "";
  const id = identity.id?.trim() ?? "";
  if (id && adminUserIds.size > 0 && adminUserIds.has(id.toLowerCase())) return true;
  if (email && adminEmails.size > 0 && adminEmails.has(email)) return true;
  if (email && adminDomains.size > 0) {
    const domain = email.split("@")[1]?.toLowerCase();
    if (domain && adminDomains.has(domain)) return true;
  }
  return false;
};
