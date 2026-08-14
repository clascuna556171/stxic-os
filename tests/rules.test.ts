import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  initializeTestEnvironment,
  assertFails,
  type RulesTestEnvironment,
  type RulesTestContext,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, type Firestore } from "firebase/firestore";

// Requires the Firestore emulator: run `npm run test:rules`.
let env: RulesTestEnvironment;

/** Cast a rules-unit-testing Firestore to the modular SDK type. */
function fs(ctx: RulesTestContext): Firestore {
  return ctx.firestore() as unknown as Firestore;
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-stxic",
    firestore: { host: "127.0.0.1", port: 8080 },
  });
  await env.clearFirestore();
});

afterAll(async () => {
  await env.cleanup();
});

describe("firestore.rules — deny-all / own-uid only", () => {
  it("denies unauthenticated read and write", async () => {
    const unauth = env.unauthenticatedContext();
    const ref = doc(fs(unauth), "users/anyone");
    await assertFails(getDoc(ref));
    await assertFails(setDoc(ref, { email: "hacker@x.com" }));
  });

  it("denies cross-user access", async () => {
    const a = env.authenticatedContext("user-a");
    const b = env.authenticatedContext("user-b");

    await setDoc(doc(fs(a), "users/user-a"), {
      email: "a@x.com",
    });
    await assertFails(getDoc(doc(fs(b), "users/user-a")));
    await assertFails(setDoc(doc(fs(b), "users/user-a"), { hacked: true }));
  });

  it("allows own read/write including subcollections", async () => {
    const a = env.authenticatedContext("user-a");
    await setDoc(doc(fs(a), "users/user-a/settings/main"), {
      theme: "dark",
    });
    await setDoc(doc(fs(a), "users/user-a/vault/cred1"), {
      name: "GitHub",
    });
    const settings = await getDoc(doc(fs(a), "users/user-a/settings/main"));
    const vault = await getDoc(doc(fs(a), "users/user-a/vault/cred1"));
    expect(settings.data()?.theme).toBe("dark");
    expect(vault.data()?.name).toBe("GitHub");
  });

  it("allows authenticated writes in the sandboxed demo namespace", async () => {
    const a = env.authenticatedContext("user-a");
    await setDoc(doc(fs(a), "demo/user-a"), { hello: true });
    const snap = await getDoc(doc(fs(a), "demo/user-a"));
    expect(snap.data()?.hello).toBe(true);
  });
});
