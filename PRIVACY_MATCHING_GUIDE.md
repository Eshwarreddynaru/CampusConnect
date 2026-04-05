# Privacy-Based Matching System - Implementation Guide

## Overview

This document explains the privacy-based matching feature for the KARE Lost & Found application. The system ensures that lost and found item posts are private by default and only become visible to users when there's a potential match.

## Key Features

### 1. **Private by Default**
- All new reports (lost/found items) are private (`is_private = TRUE`)
- Reports are NOT visible in the public feed
- Only the report owner can see their own reports initially

### 2. **Automatic Matching**
- When a user creates a report, the system automatically searches for potential matches
- Matching algorithm considers:
  - **Category** (40 points) - Must be the same category
  - **Title Similarity** (30 points) - Uses fuzzy text matching
  - **Description Similarity** (15 points) - Compares descriptions
  - **Location Similarity** (10 points) - Matches location descriptions
  - **Date Proximity** (5 points) - Items reported within 7 days get higher scores
- Minimum match threshold: **50% score**

### 3. **Visibility Rules**
Users can see a report if:
- They created the report (owner)
- They have a matched report (automatic visibility)
- They are an admin (can see all reports)

### 4. **Match Management**
- Users receive a list of potential matches for their reports
- Each match shows a match score (50-100%)
- Users can:
  - **Confirm** a match (status: confirmed)
  - **Reject** a match (status: rejected)
  - Leave as **Pending** for later review

## Database Schema

### New Fields in `reports` Table
```sql
is_private BOOLEAN DEFAULT TRUE          -- Privacy flag
matched_with UUID                        -- Best match report ID
match_score NUMERIC(5,2)                 -- Best match score
```

### New `matches` Table
```sql
id UUID PRIMARY KEY
lost_report_id UUID                      -- Reference to lost item
found_report_id UUID                     -- Reference to found item
match_score NUMERIC(5,2)                 -- Match percentage
status TEXT                              -- pending/confirmed/rejected
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

## Implementation Steps

### Step 1: Run Database Migration

Execute the SQL migration file in Supabase Dashboard → SQL Editor:

```bash
kare_lost_found_v2/supabase-privacy-matching.sql
```

This will:
- Add new fields to the reports table
- Create the matches table
- Update RLS policies for privacy
- Create matching functions and triggers
- Enable automatic matching on report creation

### Step 2: API Endpoints

The following API endpoints have been created:

#### `/api/reports` (GET)
- Returns reports visible to the current user
- Admins see all reports
- Regular users see only their reports and matched reports

#### `/api/reports/matches` (GET)
- Query param: `reportId`
- Returns all matches for a specific report
- Only accessible by report owner or admin

#### `/api/reports/matches` (PATCH)
- Updates match status (confirm/reject)
- Body: `{ matchId, status }`
- Only accessible by users involved in the match

#### `/api/admin/reports` (GET)
- Admin-only endpoint
- Returns all reports and matches with statistics
- Bypasses RLS using service role key

### Step 3: Frontend Components

#### `MatchesList` Component
Location: `src/components/matches/MatchesList.tsx`

Displays potential matches for a report with:
- Match score visualization
- Report details (title, category, location, date)
- Action buttons (Confirm/Reject)
- Status badges (Pending/Confirmed/Rejected)

#### Report Detail Page
Location: `src/app/(app)/report/[id]/page.tsx`

Shows:
- Full report details
- Privacy indicator
- Matches list (only for owner)
- Privacy notice for matched users

#### Admin Lost & Found Page
Location: `src/app/admin/lost-found/page.tsx`

Admin dashboard showing:
- Statistics (total reports, private reports, matches)
- All reports table with privacy indicators
- Match scores and status
- Search and filter functionality

### Step 4: Update Feed Page

The feed page has been updated to use the new `/api/reports` endpoint which respects privacy rules. Users will only see:
- Their own reports
- Reports they're matched with
- (Admins see everything)

## Matching Algorithm Details

### Scoring Breakdown

```javascript
Total Score = Category Match (40) 
            + Title Similarity (30)
            + Description Similarity (15)
            + Location Similarity (10)
            + Date Proximity (5)
```

### Example Matches

**High Match (85%)**
- Lost: "Black iPhone 13 Pro"
- Found: "iPhone 13 Pro Black"
- Same category: Electronics ✓
- Similar title ✓
- Same location ✓
- Posted same day ✓

**Medium Match (65%)**
- Lost: "Blue Wallet"
- Found: "Wallet with blue cover"
- Same category: Wallet ✓
- Partial title match ✓
- Different location ✗
- Posted 3 days apart ✓

**Low Match (45% - Not shown)**
- Lost: "Red Backpack"
- Found: "Bag"
- Different category ✗
- Weak title match ✗
- Below threshold

## Security & Privacy

### Row Level Security (RLS)

All tables have RLS enabled with policies:

**Reports Table:**
- Users can view their own reports
- Users can view reports they're matched with
- Users can create/update/delete their own reports
- Admins bypass all restrictions (via service role)

**Matches Table:**
- Users can view matches involving their reports
- Users can update match status for their reports
- Admins can view all matches

### Admin Access

Admins have full visibility through:
1. Service role key (bypasses RLS)
2. Special admin API endpoints
3. Admin dashboard with all reports

## Testing the Feature

### Test Scenario 1: Create Lost Item
1. User A logs in
2. Creates a "Lost iPhone" report
3. Report is private, not visible in feed
4. System searches for matches automatically

### Test Scenario 2: Create Matching Found Item
1. User B logs in
2. Creates a "Found iPhone" report
3. System detects match with User A's report
4. Both users can now see each other's reports
5. Both users see the match in their matches list

### Test Scenario 3: Confirm Match
1. User A views their report
2. Sees User B's found item as a match
3. Clicks "Confirm" on the match
4. Match status updates to "confirmed"
5. Users can now communicate via claims/chat

### Test Scenario 4: Admin View
1. Admin logs in
2. Goes to Admin → Lost & Found
3. Sees all reports (private and public)
4. Sees all matches with scores
5. Can monitor the matching system

## Configuration

### Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For admin access
```

### Matching Threshold

To adjust the minimum match score, edit the function in the SQL file:

```sql
-- Line ~180 in supabase-privacy-matching.sql
AND calculate_match_score(...) >= 50  -- Change this value (0-100)
```

Lower values = more matches (less strict)
Higher values = fewer matches (more strict)

## Troubleshooting

### Issue: No matches appearing
**Solution:** 
- Check if match threshold is too high
- Verify pg_trgm extension is enabled
- Check if reports are in opposite types (lost vs found)

### Issue: Users can't see matched reports
**Solution:**
- Verify RLS policies are applied correctly
- Check if matched_with field is populated
- Ensure API endpoint is using correct query

### Issue: Admin can't see all reports
**Solution:**
- Verify SUPABASE_SERVICE_ROLE_KEY is set correctly
- Check admin role in profiles table
- Ensure admin API endpoint is being used

## Future Enhancements

Potential improvements:
1. **Image-based matching** - Use AI to compare item images
2. **Location-based scoring** - Use GPS coordinates for better location matching
3. **Notification system** - Alert users when new matches are found
4. **Match confidence levels** - Show "High/Medium/Low" confidence badges
5. **Bulk matching** - Re-run matching for existing reports
6. **Match history** - Track all match interactions and decisions

## Support

For issues or questions:
1. Check the console logs for errors
2. Verify database migrations ran successfully
3. Test with simple cases first (same category, similar titles)
4. Check RLS policies in Supabase dashboard

---

**Last Updated:** March 2026
**Version:** 1.0.0
