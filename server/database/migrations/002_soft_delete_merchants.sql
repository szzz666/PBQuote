-- 2026-09 商户软删除：deleted_at 为空 = 未删除
ALTER TABLE merchants ADD COLUMN deleted_at DATETIME(3) NULL DEFAULT NULL AFTER status;
