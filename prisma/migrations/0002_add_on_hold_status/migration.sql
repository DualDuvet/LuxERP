DO $$
BEGIN
  ALTER TYPE "OrderStatus" ADD VALUE 'on_hold';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
