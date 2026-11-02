import { describe, expect, test } from "bun:test";
import { createAvatarCache } from "../lib/avatars.mjs";

function pngResponse() {
  return new Response(new Uint8Array([137, 80, 78, 71]), {
    status: 200,
    headers: { "content-type": "image/png" }
  });
}

function trackedFetch(delay = 10) {
  const state = { calls: 0, active: 0, peak: 0 };
  const fetchImage = async () => {
    state.calls += 1;
    state.active += 1;
    state.peak = Math.max(state.peak, state.active);
    await new Promise((resolve) => setTimeout(resolve, delay));
    state.active -= 1;
    return pngResponse();
  };
  return { state, fetchImage };
}

describe("avatar cache", () => {
  test("queues concurrent owners instead of dropping them", async () => {
    const { state, fetchImage } = trackedFetch();
    const getAvatar = createAvatarCache(fetchImage);
    const owners = Array.from({ length: 12 }, (_, index) => `owner-${index}`);
    const images = await Promise.all(owners.map((owner) => getAvatar(owner)));
    expect(images.every((image) => image?.type === "image/png")).toBe(true);
    expect(state.calls).toBe(12);
    expect(state.peak).toBeLessThanOrEqual(4);
  });

  test("deduplicates requests for the same owner", async () => {
    const { state, fetchImage } = trackedFetch();
    const getAvatar = createAvatarCache(fetchImage);
    const [first, second] = await Promise.all([
      getAvatar("octocat"),
      getAvatar("octocat")
    ]);
    expect(first).toBe(second);
    expect(state.calls).toBe(1);
  });

  test("rejects invalid owners without fetching", async () => {
    const { state, fetchImage } = trackedFetch();
    const getAvatar = createAvatarCache(fetchImage);
    expect(await getAvatar("../etc")).toBeNull();
    expect(state.calls).toBe(0);
  });
});
