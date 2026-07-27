CREATE TEMP TABLE `__catalog_cutover_guard` (`ok` integer);--> statement-breakpoint
CREATE TEMP TRIGGER `__catalog_cutover_guard_check`
BEFORE INSERT ON `__catalog_cutover_guard`
WHEN (
  (SELECT count(*) FROM `books`) > 0
  AND (
    (SELECT count(*) FROM `works`) = 0
    OR (SELECT count(*) FROM `editions`) = 0
    OR EXISTS (
      SELECT 1
      FROM `books` legacy_book
      WHERE NOT EXISTS (
        SELECT 1
        FROM `source_records` source_record
        JOIN `metadata_sources` source
          ON source.id = source_record.source_id
        WHERE source.key = 'legacy_catalog'
          AND source_record.record_key = legacy_book.id
          AND EXISTS (
            SELECT 1
            FROM `source_record_links` work_link
            JOIN `works` normalized_work
              ON normalized_work.id = work_link.entity_id
            WHERE work_link.source_record_id = source_record.id
              AND work_link.entity_type = 'work'
              AND work_link.state = 'active'
              AND EXISTS (
                SELECT 1
                FROM `source_record_links` edition_link
                JOIN `editions` normalized_edition
                  ON normalized_edition.id = edition_link.entity_id
                WHERE edition_link.source_record_id = source_record.id
                  AND edition_link.entity_type = 'edition'
                  AND edition_link.state = 'active'
                  AND normalized_edition.work_id = normalized_work.id
              )
          )
      )
    )
  )
)
BEGIN
  SELECT RAISE(ABORT, 'normalized catalog evidence is incomplete; legacy tables were not dropped');
END;--> statement-breakpoint
INSERT INTO `__catalog_cutover_guard` (`ok`) VALUES (1);--> statement-breakpoint
DROP TRIGGER `__catalog_cutover_guard_check`;--> statement-breakpoint
DROP TABLE `__catalog_cutover_guard`;--> statement-breakpoint
DROP TABLE IF EXISTS `book_metrics`;--> statement-breakpoint
DROP TABLE IF EXISTS `books`;
