-- ============================================================================
-- TRIGGERS for updated_at timestamps
-- ============================================================================
-- This migration creates triggers that automatically update the updated_at
-- timestamp column when rows are updated.
--
-- Prerequisites:
--   - Tables must exist (from 001_schema.sql)
--   - Function update_updated_at_column() must exist (from 001_schema.sql)
--
-- All triggers are idempotent - they can be run multiple times safely.
-- ============================================================================

-- Apply triggers (drop first to make idempotent)
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_races_updated_at ON races;
CREATE TRIGGER update_races_updated_at BEFORE UPDATE ON races
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_training_preferences_updated_at ON training_preferences;
CREATE TRIGGER update_training_preferences_updated_at BEFORE UPDATE ON training_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workouts_updated_at ON workouts;
CREATE TRIGGER update_workouts_updated_at BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workout_logs_updated_at ON workout_logs;
CREATE TRIGGER update_workout_logs_updated_at BEFORE UPDATE ON workout_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_equipment_updated_at ON equipment;
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_training_zones_updated_at ON training_zones;
CREATE TRIGGER update_training_zones_updated_at BEFORE UPDATE ON training_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_personal_records_updated_at ON personal_records;
CREATE TRIGGER update_personal_records_updated_at BEFORE UPDATE ON personal_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
