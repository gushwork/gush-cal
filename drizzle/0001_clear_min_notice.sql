-- Minimum notice is no longer enforced; clear any stored values (e.g. 24h).
UPDATE calendars SET min_notice_hours = 0;
