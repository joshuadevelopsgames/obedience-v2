-- Trigger: notify slave when a task is assigned (status changes to 'assigned')

CREATE OR REPLACE FUNCTION notify_on_task_assigned()
RETURNS TRIGGER AS $$
DECLARE
  slave_id   uuid;
  task_title text;
BEGIN
  -- Only fire when status transitions TO 'assigned'
  IF NEW.status <> 'assigned' OR OLD.status = 'assigned' THEN
    RETURN NEW;
  END IF;

  -- Get the slave from the pair
  SELECT p.slave_id INTO slave_id
  FROM pairs p WHERE p.id = NEW.pair_id;

  IF slave_id IS NULL OR NEW.assigned_to IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    slave_id,
    'task',
    'New task assigned',
    NEW.title,
    jsonb_build_object(
      'task_id',  NEW.id,
      'pair_id',  NEW.pair_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS task_notification_trigger ON tasks;

CREATE TRIGGER task_notification_trigger
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_task_assigned();
