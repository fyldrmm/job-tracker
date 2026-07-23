-- Manual drag-to-reorder tab order for trackers (TrackerTabs.tsx). Nullable:
-- existing rows fall back to created_at ordering client-side (see
-- byTrackerOrder in src/lib/sort.ts) until the user drags a tab, at which
-- point every tracker in that user's list gets a concrete sort_order.
alter table trackers add column sort_order integer;
