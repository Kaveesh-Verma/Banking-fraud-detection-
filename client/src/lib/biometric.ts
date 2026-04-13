export const BIOMETRIC_CRED_KEY = "finshield_biometric_cred";

export function isBiometricSupported(): boolean {
  return !!(window.PublicKeyCredential && navigator.credentials);
}

export async function registerBiometric(userId: string): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "FinShield AI", id: window.location.hostname },
        user: {
          id: new TextEncoder().encode(userId),
          name: userId,
          displayName: userId,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" },
        ],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 60000,
      },
    }) as PublicKeyCredential | null;
    if (!credential) return false;
    localStorage.setItem(BIOMETRIC_CRED_KEY, JSON.stringify({
      id: credential.id, userId,
      rawId: Array.from(new Uint8Array(credential.rawId)),
    }));
    return true;
  } catch {
    return false;
  }
}

export async function authenticateBiometric(): Promise<boolean> {
  try {
    const stored = localStorage.getItem(BIOMETRIC_CRED_KEY);
    if (!stored) return false;
    const { rawId } = JSON.parse(stored) as { rawId: number[] };
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: new Uint8Array(rawId), type: "public-key" }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    return !!assertion;
  } catch {
    return false;
  }
}

export function hasBiometricRegistered(): boolean {
  return !!localStorage.getItem(BIOMETRIC_CRED_KEY);
}
