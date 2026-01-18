# Plan 01-02: Write tests for utility functions and API endpoints

**Phase**: 1 - Testing Foundation
**Status**: pending
**Dependencies**: 01-01
**Estimated Time**: 2-3 hours

## Objective

Write comprehensive tests for utility functions (src/utils.ts), KV operations (src/kv.ts), and API endpoints (src/index.ts).

## Tasks

### Test generateAssignments (src/utils.ts)

- [ ] Test valid assignments
  - [ ] 2 guests: proper shuffling and no self-assignment
  - [ ] Multiple guests (3, 5, 10): proper shuffling, no self-assignment
  - [ ] All guests assigned exactly once

- [ ] Test edge cases
  - [ ] Minimum 2 guests: works correctly
  - [ ] Maximum 50 guests: works correctly

- [ ] Test invalid input
  - [ ] < 2 guests: throws error
  - [ ] Empty array: throws error
  - [ ] Single guest: throws error

- [ ] Test property invariants
  - [ ] No self-assignment (for any input size)
  - [ ] All guests appear as givers
  - [ ] All guests appear as receivers
  - [ ] Assignment is deterministic given same random seed (if applicable)

### Test KV Functions (src/kv.ts)

- [ ] Test storeGuestMappings
  - [ ] Stores all mappings correctly to KV
  - [ ] Uses correct key format (guest:guestId)
  - [ ] Stores proper JSON structure (partyId, guestName)
  - [ ] Includes metadata (partyId, guestName)
  - [ ] Handles empty mappings array
  - [ ] Handles large number of mappings

- [ ] Test getGuestMapping
  - [ ] Retrieves correct mapping for existing guestId
  - [ ] Returns null for non-existent guestId
  - [ ] Parses JSON correctly
  - [ ] Handles malformed JSON in KV

- [ ] Test error handling
  - [ ] KV put failures handled gracefully
  - [ ] KV get failures handled gracefully

### Test API Endpoints (src/index.ts)

- [ ] Test POST /api/parties
  - [ ] Valid request: creates party, returns correct structure
  - [ ] Returns partyId and guestUrls with correct format
  - [ ] Returns party object with all fields
  - [ ] Validation: missing name returns 400
  - [ ] Validation: < 2 guests returns 400
  - [ ] Validation: > 50 guests returns 400
  - [ ] Validation: duplicate guest names returns 400
  - [ ] CORS headers present
  - [ ] Handles budget and criteria optional fields
  - [ ] Generates unique guest IDs
  - [ ] Stores guest mappings in KV

- [ ] Test GET /api/guest/:id/assignment
  - [ ] Valid guestId: returns assignment and party info
  - [ ] Invalid guestId format (not UUID): returns 400
  - [ ] Non-existent guestId: returns 404
  - [ ] Returns guestName, assignment, party details
  - [ ] CORS headers present
  - [ ] Handles DO errors gracefully

- [ ] Test GET /guest/:id
  - [ ] Valid guestId: serves HTML page
  - [ ] Invalid guestId format: returns 400 text
  - [ ] Non-existent guestId: returns 404 text
  - [ ] Returns HTML with correct content type
  - [ ] HTML includes inline script with guestId

- [ ] Test CORS handling
  - [ ] OPTIONS request returns correct headers
  - [ ] All endpoints include CORS headers
  - [ ] CORS allows all origins (*)

- [ ] Test error handling
  - [ ] Invalid JSON in request body
  - [ ] Unexpected errors return 500
  - [ ] 404 for undefined routes

## Success Criteria

- [ ] All utility function tests pass (target: 90%+ coverage)
- [ ] All KV function tests pass
- [ ] All API endpoint tests pass (happy paths + error cases)
- [ ] Test execution time < 5 seconds
- [ ] Coverage report shows good coverage of tested modules

## Notes

- Tests will validate current behavior including inline HTML workaround
- Use mock utilities from 01-01 for Env and ExecutionContext
- Test the inline HTML at src/index.ts:181-289 to establish baseline for Phase 2
- Focus on critical paths: party creation, guest assignment lookup
- Consider table-driven tests for validation cases
