import net from "node:net";
import { lookup } from "node:dns/promises";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata",
  "metadata.google.internal",
  "host.docker.internal",
]);

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;

  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;

  return false;
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();

  if (normalized === "::" || normalized === "::1") {
    return true;
  }

  if (normalized.startsWith("::ffff:")) {
    return isPrivateIpv4(normalized.slice("::ffff:".length));
  }

  if (normalized.startsWith("fe80:")) {
    return true;
  }

  const firstSegment = normalized.split(":")[0] || "";

  return firstSegment.startsWith("fc") || firstSegment.startsWith("fd");
}

export function isPrivateIpAddress(address: string): boolean {
  const version = net.isIP(address);

  if (version === 4) {
    return isPrivateIpv4(address);
  }

  if (version === 6) {
    return isPrivateIpv6(address);
  }

  return true;
}

export function assertHttpUrl(rawUrl: string): URL {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error("URL không hợp lệ.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Chỉ hỗ trợ URL http hoặc https.");
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error("URL có thông tin đăng nhập không được phép.");
  }

  return parsedUrl;
}

export async function assertSafePublicHttpUrl(rawUrl: string): Promise<URL> {
  const parsedUrl = assertHttpUrl(rawUrl);
  const hostname = parsedUrl.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".local")) {
    throw new Error("Hostname nội bộ không được phép phân tích.");
  }

  if (net.isIP(hostname) && isPrivateIpAddress(hostname)) {
    throw new Error("Địa chỉ IP nội bộ không được phép phân tích.");
  }

  if (!net.isIP(hostname)) {
    const resolved = await lookup(hostname, { all: true, verbatim: true });

    if (resolved.length === 0) {
      throw new Error("Không thể phân giải hostname.");
    }

    if (resolved.some((entry) => isPrivateIpAddress(entry.address))) {
      throw new Error("Hostname trỏ tới mạng nội bộ, yêu cầu bị từ chối.");
    }
  }

  return parsedUrl;
}
