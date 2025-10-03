import { TransportLicenseKey } from "@/common/transport";
import { LicenseStatus } from "@/lib/license";
import { InstallationId } from "@/common/appdb/models/installation_id";

const UNLOCKED_LICENSE_KEY = "UNLOCKED-FULL-ACCESS";

function farFutureDate() {
  return new Date("2999-12-31T23:59:59.999Z");
}

function createUnlockedLicense(): TransportLicenseKey {
  const now = new Date();
  const forever = farFutureDate();
  return {
    id: 0,
    createdAt: now,
    updatedAt: now,
    version: 1,
    email: "dangduytoan13l@gmail.com",
    key: UNLOCKED_LICENSE_KEY,
    validUntil: forever,
    supportUntil: forever,
    licenseType: "PersonalLicense",
    active: true,
    maxAllowedAppRelease: { tagName: "v9999.0.0" },
  };
}

function createUnlockedStatus(): LicenseStatus {
  const status = new LicenseStatus();
  status.edition = "ultimate";
  status.condition = [];
  status.license = createUnlockedLicense();

  return {
    ...status,
    // Ensure the serialized object still exposes the computed helpers the
    // renderer expects (electron will drop the class prototype/getters).
    isUltimate: status.isUltimate,
    isCommunity: status.isCommunity,
    isTrial: status.isTrial,
    isValidDateExpired: status.isValidDateExpired,
    isSupportDateExpired: status.isSupportDateExpired,
    maxAllowedVersion: status.maxAllowedVersion,
  } as LicenseStatus;
}

export function isUnlockedLicense(license: TransportLicenseKey | undefined | null) {
  return license?.key === UNLOCKED_LICENSE_KEY;
}

export interface ILicenseHandlers {
  "license/createTrialLicense": () => Promise<void>;
  "license/getStatus": () => Promise<LicenseStatus>;
  "license/get": () => Promise<TransportLicenseKey[]>;
  "license/remove": (({ id }: { id: number }) => Promise<void>);
  "license/wipe": () => Promise<void>;
  "license/getInstallationId": () => Promise<string>;
}

export const LicenseHandlers: ILicenseHandlers = {
  "license/createTrialLicense": async function () {
    return;
  },
  "license/remove": async function() {
    return;
  },
  "license/getStatus": async function () {
    return createUnlockedStatus();
  },
  "license/get": async function () {
    return [createUnlockedLicense()];
  },
  "license/wipe": async function() {
    return;
  },
  "license/getInstallationId": async function() {
    // Make sure we return a string, not null
    const id = await InstallationId.get();
    return id || "";
  }
};
