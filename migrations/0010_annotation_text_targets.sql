-- 0009 already creates these columns. Validate them without changing existing data,
-- including databases where the original 0010 failed after 0009 was recorded.
-- Keep this migration name so Wrangler can finish that interrupted history.
SELECT start_text_offset, end_text_offset, selected_text
FROM annotation_line_ranges
LIMIT 0;
