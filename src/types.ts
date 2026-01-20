export interface PartyData {
  name: string;
  budget: string;
  criteria: string;
  guests: string[];
  assignments: Record<string, string>;
  createdAt: string;
  guestLinks: Record<string, string>; // guestName -> guestId
}

export interface CreatePartyRequest {
  name: string;
  budget?: string;
  criteria?: string;
  guests: string[];
}

export interface AssignRequest {
  guestName: string;
}

export interface AssignmentResponse {
  assignment: string;
  partyName: string;
}

// KV storage type for guest ID mapping
export interface GuestMapping {
  partyId: string;
  guestName: string;
}

// Wishlist storage note:
// Wishlists are stored as simple strings in Durable Object storage
// using per-guest keys: `wishlist:${guestId}` format
// No separate WishlistData interface needed - just string values
