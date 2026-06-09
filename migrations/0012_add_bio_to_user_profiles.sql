-- Migration: Add bio column to user_profiles
ALTER TABLE user_profiles ADD COLUMN bio text;
