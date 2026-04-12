-- Trigger: insert a notification for the recipient whenever a message is sent.
-- Uses SECURITY DEFINER so it can write to notifications regardless of RLS.

CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id uuid;
  sender_name  text;
  preview      text;
BEGIN
  -- Find the other person in the pair
  SELECT CASE
    WHEN p.mistress_id = NEW.sender_id THEN p.slave_id
    ELSE p.mistress_id
  END INTO recipient_id
  FROM pairs p WHERE p.id = NEW.pair_id;

  IF recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Sender's display name
  SELECT display_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;

  -- Truncate long messages for the body preview
  preview := LEFT(NEW.content, 120);

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    recipient_id,
    'message',
    COALESCE(sender_name, 'Your partner') || ' sent a message',
    preview,
    jsonb_build_object(
      'pair_id',    NEW.pair_id,
      'message_id', NEW.id,
      'sender_id',  NEW.sender_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop first so re-running is safe
DROP TRIGGER IF EXISTS message_notification_trigger ON messages;

CREATE TRIGGER message_notification_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_message();
