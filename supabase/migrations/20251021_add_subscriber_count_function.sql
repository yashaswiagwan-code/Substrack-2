-- Function to increment subscriber count
CREATE OR REPLACE FUNCTION increment_subscriber_count(plan_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE subscription_plans
  SET subscriber_count = subscriber_count + 1
  WHERE id = plan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement subscriber count
CREATE OR REPLACE FUNCTION decrement_subscriber_count(plan_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE subscription_plans
  SET subscriber_count = GREATEST(subscriber_count - 1, 0)
  WHERE id = plan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update subscriber count on status change
CREATE OR REPLACE FUNCTION update_subscriber_count_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes from active to cancelled/failed
  IF OLD.status = 'active' AND NEW.status IN ('cancelled', 'failed') THEN
    PERFORM decrement_subscriber_count(NEW.plan_id);
  END IF;
  
  -- When status changes from cancelled/failed to active
  IF OLD.status IN ('cancelled', 'failed') AND NEW.status = 'active' THEN
    PERFORM increment_subscriber_count(NEW.plan_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_subscriber_count ON subscribers;
CREATE TRIGGER trigger_update_subscriber_count
  AFTER UPDATE OF status ON subscribers
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriber_count_on_status_change();