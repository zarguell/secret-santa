# Plan 01-03: Write tests for Durable Objects behavior

**Phase**: 1 - Testing Foundation
**Status**: pending
**Dependencies**: 01-01
**Estimated Time**: 2-3 hours

## Objective

Write comprehensive tests for Party Durable Object behavior including state management, storage operations, and all DO methods.

## Tasks

### Set up DO Testing Utilities

- [ ] Create mock DurableObject storage
  - [ ] Implement mock storage with get/put/delete methods
  - [ ] Implement mock transaction support if needed
  - [ ] Implement mock alarm support if needed
- [ ] Create mock ExecutionContext for DO
  - [ ] Mock ctx.storage interface
  - [ ] Mock ctx.waitUntil if used
- [ ] Create test utilities for DO instantiation
  - [ ] Factory function to create Party DO instance with mock context
  - [ ] Helper to reset storage between tests

### Test Party.createParty

- [ ] Test successful party creation
  - [ ] Creates party data with all fields
  - [ ] Generates assignments using generateAssignments
  - [ ] Generates unique guest IDs for each guest
  - [ ] Stores party data atomically in storage
  - [ ] Stores assignments in storage
  - [ ] Stores guestLinks in storage
  - [ ] Stores metadata in storage
  - [ ] Returns partyId (string)
  - [ ] Returns guestUrls (guestName -> /guest/guestId)
  - [ ] Returns guestMappings (array of {guestId, guestName})

- [ ] Test storage operations
  - [ ] All writes happen atomically
  - [ ] Storage contains correct keys after creation
  - [ ] Metadata includes guestCount and createdAt

- [ ] Test edge cases
  - [ ] Minimum 2 guests: works correctly
  - [ ] Maximum 50 guests: works correctly
  - [ ] Optional budget field: defaults to empty string
  - [ ] Optional criteria field: defaults to empty string

### Test Party.getGuestAssignment

- [ ] Test successful assignment retrieval
  - [ ] Returns guestName for given guestId
  - [ ] Returns assignment (recipient name)
  - [ ] Returns party info (name, budget, criteria, guests, createdAt)
  - [ ] Handles guestId to guestName lookup correctly

- [ ] Test error cases
  - [ ] Party not found: throws error
  - [ ] Invalid guestId (not in guestLinks): throws error
  - [ ] Assignment not found for guest: throws error

- [ ] Test with different party sizes
  - [ ] Small party (2-3 guests)
  - [ ] Medium party (10-20 guests)
  - [ ] Large party (40-50 guests)

### Test Party.assignGift

- [ ] Test assignment generation
  - [ ] Returns assignment for guest
  - [ ] Returns partyName
  - [ ] Generates assignments if not present
  - [ ] Stores generated assignments in storage

- [ ] Test error cases
  - [ ] Party not found: throws error
  - [ ] Guest not found in party: throws error
  - [ ] Invalid guestName: throws error

- [ ] Test with existing assignments
  - [ ] Returns existing assignment if already present
  - [ ] Does not regenerate assignments if they exist

### Test Party.getParty

- [ ] Test successful party retrieval
  - [ ] Returns complete PartyData object
  - [ ] Includes all fields: name, budget, criteria, guests, assignments, guestLinks, createdAt
  - [ ] Assignments and guestLinks are present

- [ ] Test error cases
  - [ ] Party not found: throws error

### Test Storage Behavior

- [ ] Test state persistence
  - [ ] Data persists across DO method calls
  - [ ] Multiple DO instances don't share state (if applicable)

- [ ] Test concurrent operations
  - [ ] Multiple simultaneous createParty calls
  - [ ] Concurrent getGuestAssignment calls

- [ ] Test storage errors
  - [ ] Storage failures handled appropriately
  - [ ] Transaction conflicts if applicable

## Success Criteria

- [ ] All Party DO tests pass
- [ ] DO methods tested: createParty, getGuestAssignment, assignGift, getParty
- [ ] Storage operations thoroughly tested
- [ ] Error handling tested for all methods
- [ ] Test execution time < 5 seconds
- [ ] Coverage for src/party.ts: 85%+

## Notes

- Durable Objects testing may require specific patterns from Cloudflare Workers documentation
- Consider using specialized DO testing libraries if available
- Mock storage should behave like real DO storage (async, atomic operations)
- Tests should verify atomicity of storage operations where applicable
- Test both happy paths and error cases for each method
- Consider parameterized tests for different party sizes
