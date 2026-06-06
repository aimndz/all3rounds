ALTER TABLE annotation_line_ranges ADD COLUMN start_text_offset INTEGER;
ALTER TABLE annotation_line_ranges ADD COLUMN end_text_offset INTEGER;
ALTER TABLE annotation_line_ranges ADD COLUMN selected_text TEXT;
