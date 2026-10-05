"use client";

import { createContext, createElement, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import type { StoreV1 } from "@/contracts";
import { EMPTY_STORE, MIGRATIONS } from "./migrations";
import { STORE_CHANNEL, createRepository, type Repository, type StoreStatus } from "./repository";
import { defaultStorage } from "./storage";

const LOADING_STATUS: StoreStatus = {
  phase: "loading",
  readOnly: false,
  quarantined: false,
  setAsideFailed: false,
  storage: "memory",
  saveFailed: false,
};

const RepositoryContext = createContext<Repository | null>(null);

/** Gives a subtree its own repository. Used by tests; the app uses the shared browser one. */
export function StoreProvider({ repository, children }: { repository: Repository; children: ReactNode }) {
  return createElement(RepositoryContext.Provider, { value: repository }, children);
}

let browserRepository: Repository | undefined;

/** The one repository the app shares. Created on first use; nothing is read until a component mounts. */
function sharedRepository(): Repository {
  return (browserRepository ??= createRepository(defaultStorage(), MIGRATIONS, { channelName: STORE_CHANNEL }));
}

/** The repository for writes (`saveDraft` and friends), and the trigger that loads it. */
export function useRepository(): Repository {
  const repository = useContext(RepositoryContext) ?? sharedRepository();
  useEffect(() => {
    void repository.load();
  }, [repository]);
  return repository;
}

/**
 * Subscribes a component to a slice of the store. State is immutable and
 * replaced on every write, so `select` must return something already inside
 * the state (a field, a record entry), not a freshly built object, or the
 * component will re-render on every check.
 */
export function useStore<T>(select: (state: StoreV1) => T): T {
  const repository = useRepository();
  return useSyncExternalStore(
    repository.subscribe,
    () => select(repository.getState()),
    () => select(EMPTY_STORE),
  );
}

/** Whether the store has loaded, and what shape it is in (read-only, quarantined, memory-only, save failed). */
export function useStoreStatus(): StoreStatus {
  const repository = useRepository();
  return useSyncExternalStore(repository.subscribe, repository.getStatus, () => LOADING_STATUS);
}
