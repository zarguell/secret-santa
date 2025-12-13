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
