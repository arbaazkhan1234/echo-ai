ALTER TABLE user_question_log
  ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'main';
