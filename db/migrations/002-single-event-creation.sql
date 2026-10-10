-- Prevent two concurrent setup requests from creating two installation events.
CREATE UNIQUE INDEX IF NOT EXISTS events_single_installation ON events ((true));
-- statement-breakpoint
CREATE OR REPLACE FUNCTION keep_event_access_mode() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.access_mode IS DISTINCT FROM NEW.access_mode THEN
    RAISE EXCEPTION 'La modalidad del evento no se puede modificar';
  END IF;
  RETURN NEW;
END;
$$;
-- statement-breakpoint
DROP TRIGGER IF EXISTS events_access_mode_immutable ON events;
-- statement-breakpoint
CREATE TRIGGER events_access_mode_immutable BEFORE UPDATE OF access_mode ON events
FOR EACH ROW EXECUTE FUNCTION keep_event_access_mode();
