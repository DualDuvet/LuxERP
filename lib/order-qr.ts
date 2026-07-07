import QRCode from "qrcode";

function baseUrlFromEnv() {
  const raw = process.env.PUBLIC_APP_URL?.trim();

  if (!raw) {
    return "http://localhost:3000";
  }

  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export function orderStatusPath(orderId: string) {
  return `/orders/${orderId}/status`;
}

export function orderStatusUrl(orderId: string) {
  return `${baseUrlFromEnv()}${orderStatusPath(orderId)}`;
}

export async function orderStatusQrDataUrl(orderId: string) {
  return QRCode.toDataURL(orderStatusUrl(orderId), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 180
  });
}
