# Requirements: Secret Santa v1.1 Wishlist Feature

**Defined:** 2026-01-19
**Core Value:** Every guest must be able to reliably view their Secret Santa assignment from their unique link.

## v1 Requirements

Requirements for v1.1 milestone. Each maps to roadmap phases.

### Data Storage (STOR)

- [ ] **STOR-01**: Party Durable Object stores wishlists using `wishlists: Record<string, string>` field
- [ ] **STOR-02**: System uses per-guest storage key pattern `wishlist:{guestId}` for individual wishlists
- [ ] **STOR-03**: System enforces 500 character limit on wishlist text
- [ ] **STOR-04**: System handles empty wishlist state (no wishlist set)

### API Endpoints (API)

- [ ] **API-01**: POST /api/guest/:guestId/wishlist updates guest's wishlist with validation
- [ ] **API-02**: GET /api/guest/:guestId/wishlist returns guest's current wishlist or empty string
- [ ] **API-03**: GET /api/guest/:guestId/assignment response includes recipientWishlist field
- [ ] **API-04**: API validates input (sanitizes, enforces 500 char limit)

### User Interface (UI)

- [ ] **UI-01**: Guest page displays "My Wishlist" section with textarea form
- [ ] **UI-02**: Character counter displays current length / 500 as user types
- [ ] **UI-03**: Guest page loads and displays guest's current wishlist on page load
- [ ] **UI-04**: Assignment view displays "Recipient's Wishlist" section
- [ ] **UI-05**: UI handles empty wishlist state (no wishlist set message)

### Testing (TEST)

- [ ] **TEST-01**: Unit tests cover wishlist storage and retrieval in Party Durable Object
- [ ] **TEST-02**: Integration tests cover wishlist API endpoints
- [ ] **TEST-03**: Tests cover edge cases (empty wishlist, max length, Unicode characters)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Wishlist Enhancements

- **WISH-01**: Wishlist last-modified timestamp display
- **WISH-02**: Wishlist analytics for organizer (count of guests with wishlists)
- **WISH-03**: Character count pre-population in assignment response

### Advanced Features

- **ADV-01**: Structured wishlist items with prices and links
- **ADV-02**: Wishlist item images
- **ADV-03**: Wishlist sharing via external link
- **ADV-04**: Wishlist item claiming system
- **ADV-05**: Real-time wishlist updates

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Email notifications for wishlist updates | v1 focuses on link-based access only |
| Multiple wishlist sets per guest | Adds complexity, freeform text allows organization |
| Rich text/Markdown formatting | Adds parsing complexity and XSS risks |
| Public wishlist directory | Privacy concern, only recipient should see wishlist |
| Wishlist due dates | Adds notification system, creates unnecessary pressure |
| Authentication beyond guest links | Simple security model sufficient for non-sensitive data |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| STOR-01 | Phase 4 | Pending |
| STOR-02 | Phase 4 | Pending |
| STOR-03 | Phase 4 | Pending |
| STOR-04 | Phase 4 | Pending |
| API-01 | Phase 5 | Pending |
| API-02 | Phase 5 | Pending |
| API-03 | Phase 5 | Pending |
| API-04 | Phase 5 | Pending |
| UI-01 | Phase 6 | Pending |
| UI-02 | Phase 6 | Pending |
| UI-03 | Phase 6 | Pending |
| UI-04 | Phase 7 | Pending |
| UI-05 | Phase 7 | Pending |
| TEST-01 | Phase 4 | Pending |
| TEST-02 | Phase 5 | Pending |
| TEST-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16 ✓
- Unmapped: 0

---
*Requirements defined: 2026-01-19*
*Last updated: 2026-01-19 after initial definition*
