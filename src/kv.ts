import { GuestMapping } from "./types";

export async function storeGuestMappings(
  kv: KVNamespace,
  guestMappings: Array<{ guestId: string; guestName: string }>,
  partyId: string,
): Promise<void> {
  const promises = guestMappings.map(({ guestId, guestName }) =>
    kv.put(`guest:${guestId}`, JSON.stringify({ partyId, guestName }), {
      metadata: { partyId, guestName },
    }),
  );

  await Promise.all(promises);
}

export async function getGuestMapping(
  kv: KVNamespace,
  guestId: string,
): Promise<GuestMapping | null> {
  const data = await kv.get(`guest:${guestId}`);
  return data ? JSON.parse(data) : null;
}
