import { api, type BmsImportBatch, type IvivaSourceConfig, type MappingPointRecord, type ObixSourceConfig } from "./api";

type CacheEntry<T> = {
  data: T | null;
  inFlight: Promise<T> | null;
};

function createCacheEntry<T>(): CacheEntry<T> {
  return {
    data: null,
    inFlight: null,
  };
}

async function loadCachedValue<T>(
  entry: CacheEntry<T>,
  loader: () => Promise<T>,
  force = false,
) {
  if (!force && entry.data) {
    return entry.data;
  }

  if (!force && entry.inFlight) {
    return entry.inFlight;
  }

  const request = loader()
    .then((data) => {
      entry.data = data;
      return data;
    })
    .finally(() => {
      entry.inFlight = null;
    });

  entry.inFlight = request;
  return request;
}

const masterPointsCache = createCacheEntry<MappingPointRecord[]>();
const batchesCache = createCacheEntry<BmsImportBatch[]>();
const obixSourcesCache = createCacheEntry<ObixSourceConfig[]>();
const ivivaSourcesCache = createCacheEntry<IvivaSourceConfig[]>();

export function peekCachedMasterPoints() {
  return masterPointsCache.data;
}

export function peekCachedBatches() {
  return batchesCache.data;
}

export function peekCachedObixSources() {
  return obixSourcesCache.data;
}

export function peekCachedIvivaSources() {
  return ivivaSourcesCache.data;
}

export function invalidateMasterPointsCache() {
  masterPointsCache.data = null;
}

export function invalidateBatchesCache() {
  batchesCache.data = null;
}

export function invalidateObixSourcesCache() {
  obixSourcesCache.data = null;
}

export function invalidateIvivaSourcesCache() {
  ivivaSourcesCache.data = null;
}

export function invalidateAllBmsImportDataCaches() {
  invalidateMasterPointsCache();
  invalidateBatchesCache();
  invalidateObixSourcesCache();
  invalidateIvivaSourcesCache();
}

export async function loadCachedMasterPoints(accessToken: string, force = false) {
  return loadCachedValue(
    masterPointsCache,
    async () => {
      const response = await api.listBmsMasterPoints(accessToken, {
        page: 1,
        pageSize: 50000,
      });
      return response.items;
    },
    force,
  );
}

export async function loadCachedBatches(accessToken: string, force = false) {
  return loadCachedValue(
    batchesCache,
    async () => {
      const response = await api.listBmsImportBatches(accessToken, {
        page: 1,
        pageSize: 20,
      });
      return response.items;
    },
    force,
  );
}

export async function loadCachedObixSources(accessToken: string, force = false) {
  return loadCachedValue(
    obixSourcesCache,
    async () => {
      const response = await api.listObixSourceConfigs(accessToken, {
        page: 1,
        pageSize: 30,
      });
      return response.items;
    },
    force,
  );
}

export async function loadCachedIvivaSources(accessToken: string, force = false) {
  return loadCachedValue(
    ivivaSourcesCache,
    async () => {
      const response = await api.listIvivaSourceConfigs(accessToken, {
        page: 1,
        pageSize: 30,
      });
      return response.items;
    },
    force,
  );
}
