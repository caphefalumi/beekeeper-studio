import { createLocalVue } from '@vue/test-utils';
import Vuex, { Store } from 'vuex';
import { LicenseModule } from '@/store/modules/LicenseModule';
import { TransportLicenseKey } from '@/common/transport';
import Vue from 'vue';

// Mock the Vue prototype utilities
const mockUtilSend = jest.fn();
const mockNotyInfo = jest.fn();

Vue.prototype.$util = {
  send: mockUtilSend,
};

Vue.prototype.$noty = {
  info: mockNotyInfo,
};

// Mock window.platformInfo
(global as any).window = {
  platformInfo: {
    isDevelopment: false,
    cloudUrl: 'https://cloud.example.com',
  },
};

const UNLOCKED_LICENSE_KEY = "UNLOCKED-FULL-ACCESS";

describe("LicenseModule", () => {
  let store: Store<any>;
  let localVue: any;

  beforeEach(() => {
    localVue = createLocalVue();
    localVue.use(Vuex);
    
    store = new Vuex.Store({
      modules: {
        license: LicenseModule,
      },
    });

    jest.clearAllMocks();
    
    // Setup default mock responses
    mockUtilSend.mockImplementation(async (action: string) => {
      if (action === 'license/getStatus') {
        return {
          edition: "ultimate",
          condition: [],
          license: {
            key: UNLOCKED_LICENSE_KEY,
            email: "dangduytoan13l@gmail.com",
          },
          isUltimate: true,
          isCommunity: false,
          isTrial: false,
          isValidDateExpired: false,
          isSupportDateExpired: false,
          maxAllowedVersion: { major: 9999, minor: 0, patch: 0 },
        };
      }
      if (action === 'license/get') {
        return [{
          id: 0,
          key: UNLOCKED_LICENSE_KEY,
          email: "dangduytoan13l@gmail.com",
          licenseType: "PersonalLicense",
          validUntil: new Date("2999-12-31"),
          supportUntil: new Date("2999-12-31"),
          active: true,
          maxAllowedAppRelease: { tagName: "v9999.0.0" },
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        }];
      }
      if (action === 'license/getInstallationId') {
        return 'test-installation-id';
      }
      if (action === 'appdb/license/save') {
        return undefined;
      }
      return undefined;
    });
  });

  describe("State initialization", () => {
    it("should have correct initial state", () => {
      const state = store.state.license;
      
      expect(state.initialized).toBe(false);
      expect(state.licenses).toEqual([]);
      expect(state.error).toBeNull();
      expect(state.now).toBeInstanceOf(Date);
      expect(state.status).toBeDefined();
      expect(state.installationId).toBeNull();
    });

    it("should have default community status", () => {
      const state = store.state.license;
      
      expect(state.status.edition).toBe("community");
      expect(state.status.condition).toBe("initial");
    });
  });

  describe("Getters", () => {
    beforeEach(async () => {
      await store.dispatch('license/sync');
    });

    it("should return trial license when present", () => {
      store.state.license.licenses = [
        { licenseType: "TrialLicense", key: "trial-key" } as TransportLicenseKey,
        { licenseType: "PersonalLicense", key: "personal-key" } as TransportLicenseKey,
      ];
      
      const trialLicense = store.getters['license/trialLicense'];
      expect(trialLicense).toBeDefined();
      expect(trialLicense.licenseType).toBe("TrialLicense");
    });

    it("should return undefined when no trial license exists", () => {
      store.state.license.licenses = [
        { licenseType: "PersonalLicense", key: "personal-key" } as TransportLicenseKey,
      ];
      
      const trialLicense = store.getters['license/trialLicense'];
      expect(trialLicense).toBeUndefined();
    });

    it("should filter out trial licenses in realLicenses", () => {
      store.state.license.licenses = [
        { licenseType: "TrialLicense", key: "trial-key" } as TransportLicenseKey,
        { licenseType: "PersonalLicense", key: "personal-key" } as TransportLicenseKey,
        { licenseType: "BusinessLicense", key: "business-key" } as TransportLicenseKey,
      ];
      
      const realLicenses = store.getters['license/realLicenses'];
      expect(realLicenses.length).toBe(2);
      expect(realLicenses.every((l: TransportLicenseKey) => l.licenseType !== "TrialLicense")).toBe(true);
    });

    it("should calculate license days left correctly", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      store.state.license.status = {
        license: { validUntil: futureDate } as TransportLicenseKey,
      } as any;
      
      const daysLeft = store.getters['license/licenseDaysLeft'];
      expect(daysLeft).toBeGreaterThan(28);
      expect(daysLeft).toBeLessThan(31);
    });

    it("should return true for noLicensesFound when licenses array is empty", () => {
      store.state.license.licenses = [];
      
      const noLicenses = store.getters['license/noLicensesFound'];
      expect(noLicenses).toBe(true);
    });

    it("should return false for noLicensesFound when licenses exist", () => {
      store.state.license.licenses = [
        { licenseType: "PersonalLicense", key: "key" } as TransportLicenseKey,
      ];
      
      const noLicenses = store.getters['license/noLicensesFound'];
      expect(noLicenses).toBe(false);
    });

    it("should return isUltimate correctly", () => {
      store.state.license.status = {
        isUltimate: true,
      } as any;
      
      expect(store.getters['license/isUltimate']).toBe(true);
    });

    it("should return isCommunity correctly", () => {
      store.state.license.status = {
        isCommunity: true,
      } as any;
      
      expect(store.getters['license/isCommunity']).toBe(true);
    });

    it("should return isTrial correctly", () => {
      store.state.license.status = {
        isTrial: true,
      } as any;
      
      expect(store.getters['license/isTrial']).toBe(true);
    });

    it("should return isValidStateExpired correctly", () => {
      store.state.license.status = {
        isValidDateExpired: true,
      } as any;
      
      expect(store.getters['license/isValidStateExpired']).toBe(true);
    });

    it("should handle falsy state gracefully", () => {
      store.state.license = null as any;
      
      expect(store.getters['license/isUltimate']).toBe(false);
      expect(store.getters['license/isCommunity']).toBe(true);
      expect(store.getters['license/isTrial']).toBe(true);
    });
  });

  describe("Mutations", () => {
    it("should set licenses", () => {
      const licenses = [
        { licenseType: "PersonalLicense", key: "key1" } as TransportLicenseKey,
        { licenseType: "BusinessLicense", key: "key2" } as TransportLicenseKey,
      ];
      
      store.commit('license/set', licenses);
      
      expect(store.state.license.licenses).toEqual(licenses);
      expect(store.state.license.licenses.length).toBe(2);
    });

    it("should set initialized flag", () => {
      store.commit('license/setInitialized', true);
      expect(store.state.license.initialized).toBe(true);
      
      store.commit('license/setInitialized', false);
      expect(store.state.license.initialized).toBe(false);
    });

    it("should set installation id", () => {
      const id = "test-id-12345";
      store.commit('license/installationId', id);
      
      expect(store.state.license.installationId).toBe(id);
    });

    it("should set now date", () => {
      const testDate = new Date('2023-01-01');
      store.commit('license/setNow', testDate);
      
      expect(store.state.license.now).toBe(testDate);
    });

    it("should set status", () => {
      const status = {
        edition: "ultimate",
        condition: ["test"],
        isUltimate: true,
      } as any;
      
      store.commit('license/setStatus', status);
      
      expect(store.state.license.status).toBe(status);
      expect(store.state.license.status.edition).toBe("ultimate");
    });
  });

  describe("Actions", () => {
    describe("init", () => {
      it("should initialize the module", async () => {
        await store.dispatch('license/init');
        
        expect(store.state.license.initialized).toBe(true);
        expect(mockUtilSend).toHaveBeenCalledWith('license/getInstallationId');
        expect(mockUtilSend).toHaveBeenCalledWith('license/getStatus');
        expect(mockUtilSend).toHaveBeenCalledWith('license/get');
      });

      it("should set installation id during init", async () => {
        mockUtilSend.mockImplementation(async (action: string) => {
          if (action === 'license/getInstallationId') {
            return 'init-test-id';
          }
          return mockUtilSend.getMockImplementation()(action);
        });
        
        await store.dispatch('license/init');
        
        expect(store.state.license.installationId).toBe('init-test-id');
      });

      it("should not reinitialize if already initialized", async () => {
        await store.dispatch('license/init');
        const callCount = mockUtilSend.mock.calls.length;
        
        await store.dispatch('license/init');
        
        // Should not make additional calls
        expect(mockUtilSend.mock.calls.length).toBe(callCount);
      });

      it("should sync licenses and status on init", async () => {
        await store.dispatch('license/init');
        
        expect(store.state.license.licenses.length).toBeGreaterThan(0);
        expect(store.state.license.status).toBeDefined();
      });
    });

    describe("sync", () => {
      it("should fetch licenses and status", async () => {
        await store.dispatch('license/sync');
        
        expect(mockUtilSend).toHaveBeenCalledWith('license/getStatus');
        expect(mockUtilSend).toHaveBeenCalledWith('license/get');
      });

      it("should update state with fetched data", async () => {
        await store.dispatch('license/sync');
        
        expect(store.state.license.licenses).toBeDefined();
        expect(store.state.license.status).toBeDefined();
        expect(store.state.license.now).toBeInstanceOf(Date);
      });

      it("should update now timestamp on sync", async () => {
        const beforeSync = new Date();
        await store.dispatch('license/sync');
        const afterSync = new Date();
        
        expect(store.state.license.now.getTime()).toBeGreaterThanOrEqual(beforeSync.getTime());
        expect(store.state.license.now.getTime()).toBeLessThanOrEqual(afterSync.getTime());
      });
    });

    describe("update with unlocked license", () => {
      it("should skip update for unlocked license", async () => {
        const unlockedLicense: TransportLicenseKey = {
          id: 0,
          key: UNLOCKED_LICENSE_KEY,
          email: "test@example.com",
          licenseType: "PersonalLicense",
          validUntil: new Date(),
          supportUntil: new Date(),
          active: true,
          maxAllowedAppRelease: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        };
        
        await store.dispatch('license/update', unlockedLicense);
        
        // Should not call the save endpoint for unlocked license
        expect(mockUtilSend).not.toHaveBeenCalledWith('appdb/license/save', expect.anything());
      });

      it("should return early without making network calls for unlocked license", async () => {
        const unlockedLicense: TransportLicenseKey = {
          id: 0,
          key: UNLOCKED_LICENSE_KEY,
          email: "test@example.com",
          licenseType: "PersonalLicense",
          validUntil: new Date(),
          supportUntil: new Date(),
          active: true,
          maxAllowedAppRelease: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        };
        
        mockUtilSend.mockClear();
        
        await store.dispatch('license/update', unlockedLicense);
        
        // Should not make any calls
        expect(mockUtilSend).not.toHaveBeenCalled();
      });
    });

    describe("update with regular license", () => {
      it("should update regular license in development mode", async () => {
        (global as any).window.platformInfo.isDevelopment = true;
        
        const regularLicense: TransportLicenseKey = {
          id: 1,
          key: "regular-key",
          email: "fake_email",
          licenseType: "PersonalLicense",
          validUntil: new Date(),
          supportUntil: new Date(),
          active: true,
          maxAllowedAppRelease: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        };
        
        await store.dispatch('license/update', regularLicense);
        
        expect(mockUtilSend).toHaveBeenCalledWith('appdb/license/save', { obj: regularLicense });
        
        (global as any).window.platformInfo.isDevelopment = false;
      });
    });

    describe("updateAll with unlocked license", () => {
      it("should skip updateAll when unlocked license is active", async () => {
        store.state.license.status = {
          license: {
            key: UNLOCKED_LICENSE_KEY,
          } as TransportLicenseKey,
        } as any;
        
        store.state.license.licenses = [
          { licenseType: "PersonalLicense", key: "other-key" } as TransportLicenseKey,
        ];
        
        mockUtilSend.mockClear();
        
        await store.dispatch('license/updateAll');
        
        // Should return early without updating
        expect(mockUtilSend).not.toHaveBeenCalled();
      });

      it("should not process licenses when unlocked license is present", async () => {
        store.state.license.status = {
          license: {
            key: UNLOCKED_LICENSE_KEY,
          } as TransportLicenseKey,
        } as any;
        
        const regularLicenses = [
          { id: 1, licenseType: "PersonalLicense", key: "key1" } as TransportLicenseKey,
          { id: 2, licenseType: "BusinessLicense", key: "key2" } as TransportLicenseKey,
        ];
        
        store.state.license.licenses = regularLicenses;
        
        await store.dispatch('license/updateAll');
        
        // Should not attempt to save any licenses
        expect(mockUtilSend).not.toHaveBeenCalledWith('appdb/license/save', expect.anything());
      });
    });

    describe("remove", () => {
      it("should call remove handler with license id", async () => {
        const license = {
          id: 123,
          key: "test-key",
        } as TransportLicenseKey;
        
        await store.dispatch('license/remove', license);
        
        expect(mockUtilSend).toHaveBeenCalledWith('license/remove', { id: 123 });
      });

      it("should sync after removing license", async () => {
        const license = {
          id: 456,
          key: "test-key",
        } as TransportLicenseKey;
        
        mockUtilSend.mockClear();
        
        await store.dispatch('license/remove', license);
        
        expect(mockUtilSend).toHaveBeenCalledWith('license/remove', { id: 456 });
        expect(mockUtilSend).toHaveBeenCalledWith('license/getStatus');
        expect(mockUtilSend).toHaveBeenCalledWith('license/get');
      });
    });

    describe("add", () => {
      it("should create trial license when trial flag is true", async () => {
        await store.dispatch('license/add', {
          email: "test@example.com",
          key: "test-key",
          trial: true,
        });
        
        expect(mockUtilSend).toHaveBeenCalledWith('license/createTrialLicense');
        expect(mockNotyInfo).toHaveBeenCalledWith("Your 14 day free trial has started, enjoy!");
      });

      it("should sync after adding trial license", async () => {
        mockUtilSend.mockClear();
        
        await store.dispatch('license/add', {
          email: "test@example.com",
          key: "test-key",
          trial: true,
        });
        
        expect(mockUtilSend).toHaveBeenCalledWith('license/getStatus');
        expect(mockUtilSend).toHaveBeenCalledWith('license/get');
      });
    });
  });

  describe("Integration scenarios", () => {
    it("should handle full init lifecycle", async () => {
      expect(store.state.license.initialized).toBe(false);
      
      await store.dispatch('license/init');
      
      expect(store.state.license.initialized).toBe(true);
      expect(store.state.license.licenses.length).toBeGreaterThan(0);
      expect(store.state.license.status).toBeDefined();
      expect(store.state.license.installationId).toBeDefined();
    });

    it("should maintain unlocked license through operations", async () => {
      await store.dispatch('license/init');
      
      // Verify unlocked license is loaded
      expect(store.state.license.licenses[0].key).toBe(UNLOCKED_LICENSE_KEY);
      expect(store.state.license.status.edition).toBe("ultimate");
      
      // Try to update
      await store.dispatch('license/update', store.state.license.licenses[0]);
      
      // Should still have unlocked license
      expect(store.state.license.licenses[0].key).toBe(UNLOCKED_LICENSE_KEY);
    });

    it("should handle rapid sync calls", async () => {
      const syncPromises = [];
      for (let i = 0; i < 5; i++) {
        syncPromises.push(store.dispatch('license/sync'));
      }
      
      await Promise.all(syncPromises);
      
      expect(store.state.license.licenses).toBeDefined();
      expect(store.state.license.status).toBeDefined();
    });

    it("should correctly filter real licenses from trial licenses", async () => {
      store.state.license.licenses = [
        { id: 1, licenseType: "TrialLicense", key: "trial" } as TransportLicenseKey,
        { id: 2, licenseType: "PersonalLicense", key: "personal" } as TransportLicenseKey,
        { id: 3, licenseType: "TrialLicense", key: "trial2" } as TransportLicenseKey,
        { id: 4, licenseType: "BusinessLicense", key: "business" } as TransportLicenseKey,
      ];
      
      const realLicenses = store.getters['license/realLicenses'];
      
      expect(realLicenses.length).toBe(2);
      expect(realLicenses[0].licenseType).toBe("PersonalLicense");
      expect(realLicenses[1].licenseType).toBe("BusinessLicense");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty license array", async () => {
      mockUtilSend.mockImplementation(async (action: string) => {
        if (action === 'license/get') return [];
        if (action === 'license/getStatus') {
          return {
            edition: "community",
            condition: [],
            isUltimate: false,
            isCommunity: true,
            isTrial: false,
          };
        }
        return mockUtilSend.getMockImplementation()(action);
      });
      
      await store.dispatch('license/sync');
      
      expect(store.state.license.licenses).toEqual([]);
      expect(store.getters['license/noLicensesFound']).toBe(true);
    });

    it("should handle null status license", () => {
      store.state.license.status = {
        license: null,
      } as any;
      
      // Should not throw when calculating days left
      expect(() => store.getters['license/licenseDaysLeft']).toThrow();
    });

    it("should handle updateAll with empty license array", async () => {
      store.state.license.licenses = [];
      
      await expect(store.dispatch('license/updateAll')).resolves.toBeUndefined();
    });

    it("should handle remove with undefined license", async () => {
      await expect(store.dispatch('license/remove', undefined)).rejects.toThrow();
    });

    it("should preserve state integrity after failed operations", async () => {
      const initialLicenses = [...store.state.license.licenses];
      
      mockUtilSend.mockRejectedValueOnce(new Error('Network error'));
      
      try {
        await store.dispatch('license/add', {
          email: "test@example.com",
          key: "test-key",
          trial: false,
        });
      } catch (e) {
        // Expected to fail
      }
      
      // State should remain consistent
      expect(store.state.license.licenses).toEqual(initialLicenses);
    });
  });

  describe("Unlocked license constant validation", () => {
    it("should use consistent UNLOCKED_LICENSE_KEY constant", () => {
      expect(UNLOCKED_LICENSE_KEY).toBe("UNLOCKED-FULL-ACCESS");
    });

    it("should properly detect unlocked license in update action", async () => {
      const license: TransportLicenseKey = {
        id: 0,
        key: UNLOCKED_LICENSE_KEY,
        email: "test@example.com",
        licenseType: "PersonalLicense",
        validUntil: new Date(),
        supportUntil: new Date(),
        active: true,
        maxAllowedAppRelease: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };
      
      mockUtilSend.mockClear();
      await store.dispatch('license/update', license);
      
      // Verify no network calls were made
      expect(mockUtilSend).not.toHaveBeenCalled();
    });

    it("should properly detect unlocked license in updateAll action", async () => {
      store.state.license.status = {
        license: {
          key: UNLOCKED_LICENSE_KEY,
        } as TransportLicenseKey,
      } as any;
      
      mockUtilSend.mockClear();
      await store.dispatch('license/updateAll');
      
      // Verify no calls were made
      expect(mockUtilSend).not.toHaveBeenCalled();
    });
  });
});