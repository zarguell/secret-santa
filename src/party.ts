import { DurableObject } from 'cloudflare:workers';
import { PartyData, AssignRequest, AssignmentResponse } from './types';
import { generateAssignments } from './utils';

export class Party extends DurableObject {
  // Create a new party and persist to storage
  async createParty(data: Omit<PartyData, 'assignments' | 'guestLinks' | 'createdAt'>): Promise<{ 
    partyId: string; 
    guestUrls: Record<string, string>;
    guestMappings: Array<{ guestId: string; guestName: string }>;
  }> {
    const assignments = generateAssignments(data.guests);
    
    // Generate unique guest IDs
    const guestLinks: Record<string, string> = {};
    const guestMappings = [];
    
    data.guests.forEach(guest => {
      const guestId = crypto.randomUUID();
      guestLinks[guest] = guestId;
      guestMappings.push({ guestId, guestName: guest });
    });
    
    const partyData: PartyData = {
      ...data,
      assignments,
      guestLinks,
      createdAt: new Date().toISOString()
    };
    
    // Store all party data atomically
    await this.ctx.storage.put({
      party: partyData,
      assignments,
      guestLinks,
      metadata: {
        guestCount: data.guests.length,
        createdAt: partyData.createdAt
      }
    });
    
    // Return guest URLs and mappings
    return {
      partyId: this.ctx.id.toString(),
      guestUrls: Object.fromEntries(
        Object.entries(guestLinks).map(([guest, id]) => [guest, `/guest/${id}`])
      ),
      guestMappings
    };
  }
  
  // Get assignment for a specific guest
  async getGuestAssignment(guestId: string): Promise<{ 
    guestName: string; 
    assignment: string; 
    party: Omit<PartyData, 'assignments' | 'guestLinks'> 
  }> {
    const partyData = await this.ctx.storage.get<PartyData>('party');
    
    if (!partyData) {
      throw new Error('Party not found');
    }
    
    // Find guest name from guestId
    const guestName = Object.entries(partyData.guestLinks)
      .find(([_, id]) => id === guestId)?.[0];
    
    if (!guestName) {
      throw new Error('Invalid guest link');
    }
    
    if (!partyData.assignments[guestName]) {
      throw new Error('Assignment not found for guest');
    }
    
    return {
      guestName,
      assignment: partyData.assignments[guestName],
      party: {
        name: partyData.name,
        budget: partyData.budget,
        criteria: partyData.criteria,
        guests: partyData.guests,
        createdAt: partyData.createdAt
      }
    };
  }
  
  // Assign Secret Santa for a specific guest (ensures assignments exist)
  async assignGift(req: AssignRequest): Promise<AssignmentResponse> {
    const partyData = await this.ctx.storage.get<PartyData>('party');
    
    if (!partyData) {
      throw new Error('Party not found');
    }
    
    if (!partyData.guests.includes(req.guestName)) {
      throw new Error('Guest not found in party');
    }
    
    // If assignments don't exist, regenerate them
    if (!partyData.assignments || Object.keys(partyData.assignments).length === 0) {
      const assignments = generateAssignments(partyData.guests);
      partyData.assignments = assignments;
      await this.ctx.storage.put({ party: partyData, assignments });
    }
    
    return {
      assignment: partyData.assignments[req.guestName],
      partyName: partyData.name
    };
  }
  
  // Get full party details (for admin/reference)
  async getParty(): Promise<PartyData> {
    const partyData = await this.ctx.storage.get<PartyData>('party');
    
    if (!partyData) {
      throw new Error('Party not found');
    }
    
    return partyData;
  }
}
