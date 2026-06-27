import os from "os";

/**
 * Dynamically resolves all active local IPv4 interface addresses.
 * This is used during development to automatically whitelist local origin IPs in next.config.ts.
 */
export const getLocalIPs = (): string[] => {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(interfaces)) {
    const ifaceList = interfaces[name];
    if (ifaceList) {
      for (const iface of ifaceList) {
        if (iface.family === "IPv4" && !iface.internal) {
          ips.push(iface.address);
        }
      }
    }
  }
  return ips;
};
