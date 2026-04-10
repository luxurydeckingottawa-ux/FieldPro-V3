-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/jcxvkyfmoiwayxfmgnif/sql)
-- This creates the table for storing incoming SMS messages from Twilio

CREATE TABLE IF NOT EXISTS incoming_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  message_body TEXT NOT NULL,
  twilio_sid TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE incoming_messages ENABLE ROW LEVEL SECURITY;

-- Allow anon key to insert (Twilio webhook needs this)
CREATE POLICY "Allow insert from webhook" ON incoming_messages
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow anon key to read (front-end polling needs this)
CREATE POLICY "Allow read for authenticated" ON incoming_messages
  FOR SELECT TO anon
  USING (true);

-- Allow anon key to update read/processed status
CREATE POLICY "Allow update read status" ON incoming_messages
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- Index for fast polling queries
CREATE INDEX idx_incoming_messages_unprocessed ON incoming_messages (processed, received_at DESC);
CREATE INDEX idx_incoming_messages_from ON incoming_messages (from_number);
