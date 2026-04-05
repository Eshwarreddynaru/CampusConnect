# Privacy-Based Matching - Setup Checklist

Follow these steps to implement the privacy-based matching feature:

## ✅ Step 1: Database Setup

- [ ] Open Supabase Dashboard
- [ ] Go to SQL Editor
- [ ] Run `supabase-privacy-matching.sql`
- [ ] Verify no errors in execution
- [ ] Check that new tables/columns exist:
  - [ ] `reports.is_private` column
  - [ ] `reports.matched_with` column
  - [ ] `reports.match_score` column
  - [ ] `matches` table created

## ✅ Step 2: Verify Extensions

- [ ] Check that `pg_trgm` extension is enabled
  ```sql
  SELECT * FROM pg_extension WHERE extname = 'pg_trgm';
  ```
- [ ] If not enabled, run:
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  ```

## ✅ Step 3: Test Database Functions

- [ ] Test the matching function:
  ```sql
  SELECT * FROM find_matches_for_report('some-report-id');
  ```
- [ ] Verify RLS policies:
  ```sql
  SELECT * FROM pg_policies WHERE tablename IN ('reports', 'matches');
  ```

## ✅ Step 4: Environment Variables

- [ ] Verify `.env.local` has:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  ```
- [ ] Service role key is required for admin features

## ✅ Step 5: Test API Endpoints

- [ ] Start development server: `npm run dev`
- [ ] Test endpoints:
  - [ ] GET `/api/reports` - Returns user's reports
  - [ ] GET `/api/reports/matches?reportId=xxx` - Returns matches
  - [ ] PATCH `/api/reports/matches` - Updates match status
  - [ ] GET `/api/admin/reports` - Admin view (requires admin role)

## ✅ Step 6: Test User Flow

### Create Lost Item
- [ ] Login as User A
- [ ] Create a lost item report
- [ ] Verify report is created
- [ ] Check that report is private (not in public feed)
- [ ] View report detail page
- [ ] Verify "Potential Matches" section appears

### Create Matching Found Item
- [ ] Login as User B (different account)
- [ ] Create a found item with similar details
- [ ] Verify automatic matching triggered
- [ ] Check User A's matches list
- [ ] Check User B's matches list
- [ ] Verify both users can see each other's reports

### Confirm Match
- [ ] As User A, view matches
- [ ] Click "Confirm" on a match
- [ ] Verify status updates to "confirmed"
- [ ] Test "Reject" functionality

## ✅ Step 7: Test Admin Features

- [ ] Login as admin
- [ ] Navigate to Admin → Lost & Found
- [ ] Verify all reports are visible
- [ ] Check statistics display correctly:
  - [ ] Total Reports
  - [ ] Private Reports
  - [ ] Matched Reports
  - [ ] Total Matches
- [ ] Test search functionality
- [ ] Test type filters (all/lost/found)

## ✅ Step 8: Verify Privacy

- [ ] Create a private report as User A
- [ ] Login as User C (no match)
- [ ] Verify User C cannot see User A's report
- [ ] Create matching report as User C
- [ ] Verify both users can now see each other's reports

## ✅ Step 9: Edge Cases

- [ ] Test with no matches (low similarity)
- [ ] Test with multiple matches
- [ ] Test with same user creating both lost and found
- [ ] Test match score calculation accuracy
- [ ] Test with missing optional fields (description, location)

## ✅ Step 10: Performance Check

- [ ] Create 10+ reports
- [ ] Verify matching completes quickly (< 2 seconds)
- [ ] Check database indexes are used
- [ ] Monitor query performance in Supabase

## 🎯 Success Criteria

Your implementation is successful when:

1. ✅ New reports are private by default
2. ✅ Automatic matching works on report creation
3. ✅ Users can only see their own reports and matched reports
4. ✅ Admins can see all reports
5. ✅ Match scores are calculated correctly (50-100%)
6. ✅ Users can confirm/reject matches
7. ✅ Feed page respects privacy rules
8. ✅ Admin dashboard shows all reports and statistics

## 🐛 Common Issues

### Issue: Matches not appearing
**Fix:** Check match threshold (default 50%), lower if needed

### Issue: RLS blocking queries
**Fix:** Verify policies are created correctly, check user authentication

### Issue: Admin can't see all reports
**Fix:** Ensure service role key is set and admin role is assigned

### Issue: Trigger not firing
**Fix:** Check trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_auto_match_reports';`

## 📚 Documentation

- Full guide: `PRIVACY_MATCHING_GUIDE.md`
- Database schema: `supabase-privacy-matching.sql`
- API routes: `src/app/api/reports/`
- Components: `src/components/matches/`

## 🚀 Next Steps

After successful setup:
1. Test with real users
2. Monitor match quality
3. Adjust match threshold if needed
4. Consider adding notifications
5. Implement image-based matching (future)

---

**Need Help?** Check the console logs and Supabase logs for detailed error messages.
