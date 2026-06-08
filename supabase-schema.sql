-- ============================================
-- NOTE: Apply this entire SQL in Supabase SQL Editor.
-- Tables are already assumed to exist per the original schema.
-- This migration adds the new tables + RLS + triggers.
--
-- IMPORTANT: 
-- If orders table does NOT have 'revision' status, run:
--   ALTER TABLE orders DROP CONSTRAINT orders_status_check;
--   ALTER TABLE orders ADD CONSTRAINT orders_status_check
--     CHECK (status = ANY (ARRAY['pending','accepted','in_progress','revision','completed','cancelled']));
-- ============================================

-- 1) PROJECT PROGRESS
CREATE TABLE IF NOT EXISTS project_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_progress_order ON project_progress(order_id);

-- 2) PORTFOLIO
CREATE TABLE IF NOT EXISTS portfolio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  freelancer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  project_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_freelancer ON portfolio(freelancer_id);

-- 3) NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- =======================
-- RLS POLICIES
-- =======================
ALTER TABLE project_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- project_progress: freelancer manages progress for their orders; customer can view progress for orders they own
CREATE POLICY "project_progress_view_customer" ON project_progress
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = project_progress.order_id
      AND orders.customer_id = auth.uid()
  )
);

CREATE POLICY "project_progress_manage_freelancer" ON project_progress
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = project_progress.order_id
      AND orders.freelancer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = project_progress.order_id
      AND orders.freelancer_id = auth.uid()
  )
);

-- portfolio: freelancer can CRUD their own portfolio; others can view freelancer's portfolio
CREATE POLICY "portfolio_manage_own" ON portfolio
FOR ALL
USING (freelancer_id = auth.uid())
WITH CHECK (freelancer_id = auth.uid());

CREATE POLICY "portfolio_public_select" ON portfolio
FOR SELECT
USING (true);

-- notifications: user can view and update read state on their own notifications
CREATE POLICY "notifications_select_own" ON notifications
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON notifications
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_insert_own" ON notifications
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- =======================
-- TRIGGERS for auto notifications
-- =======================
-- Helper function: insert notification for a user.
CREATE OR REPLACE FUNCTION push_notification(p_user_id UUID, p_title TEXT, p_message TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications(user_id, title, message, is_read)
  VALUES (p_user_id, p_title, p_message, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Order created notification
CREATE OR REPLACE FUNCTION notify_order_created()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.freelancer_id IS NOT NULL THEN
    PERFORM push_notification(
      NEW.freelancer_id,
      'Order Received',
      'New order has been created and is waiting for your approval.'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_order_created ON orders;
CREATE TRIGGER trg_notify_order_created
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_order_created();

-- Order status changed notification
CREATE OR REPLACE FUNCTION notify_order_status_changed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'accepted' THEN
      PERFORM push_notification(NEW.customer_id, 'Order Accepted', 'Your order has been accepted by the freelancer.');
    ELSIF NEW.status = 'in_progress' THEN
      PERFORM push_notification(NEW.customer_id, 'Order In Progress', 'Your project is currently in progress.');
    ELSIF NEW.status = 'revision' THEN
      PERFORM push_notification(NEW.customer_id, 'Revision Requested', 'The freelancer requested a revision.');
    ELSIF NEW.status = 'completed' THEN
      PERFORM push_notification(NEW.customer_id, 'Order Completed', 'Your order has been completed.');
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM push_notification(NEW.customer_id, 'Order Cancelled', 'Your order was cancelled.');
    END IF;
  END IF;

  IF NEW.freelancer_id IS NOT NULL AND NEW.status = 'cancelled' AND NEW.freelancer_id IS DISTINCT FROM OLD.freelancer_id THEN
    PERFORM push_notification(NEW.freelancer_id, 'Order Cancelled', 'An order was cancelled.');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_order_status_changed ON orders;
CREATE TRIGGER trg_notify_order_status_changed
AFTER UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_order_status_changed();

-- Message created notification
CREATE OR REPLACE FUNCTION notify_message_created()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receiver_id IS NOT NULL THEN
    PERFORM push_notification(
      NEW.receiver_id,
      'New Message',
      'You received a new chat message.'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_message_created ON messages;
CREATE TRIGGER trg_notify_message_created
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_message_created();

-- Review created notification
CREATE OR REPLACE FUNCTION notify_review_created()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reviewed_id IS NOT NULL THEN
    PERFORM push_notification(
      NEW.reviewed_id,
      'New Review',
      'You received a new review from a customer.'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_review_created ON reviews;
CREATE TRIGGER trg_notify_review_created
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION notify_review_created();

-- 4) FAVORITES (saved services per user)
CREATE TABLE IF NOT EXISTS favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_service ON favorites(service_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_created ON favorites(user_id, created_at DESC);

-- RLS for favorites
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- User can manage (SELECT/INSERT/DELETE) only their own favorites
CREATE POLICY "favorites_manage_own" ON favorites
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 5) ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON activity_logs(user_id, created_at DESC);

-- RLS for activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- User can only view their own activity logs
CREATE POLICY "activity_logs_select_own" ON activity_logs
FOR SELECT
USING (user_id = auth.uid());

-- User can insert their own activity logs
CREATE POLICY "activity_logs_insert_own" ON activity_logs
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Helper function to log activity
CREATE OR REPLACE FUNCTION log_activity(p_user_id UUID, p_action TEXT, p_target_type TEXT DEFAULT NULL, p_target_id UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  INSERT INTO activity_logs(user_id, action, target_type, target_id)
  VALUES (p_user_id, p_action, p_target_type, p_target_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Realtime publication for new tables (uncomment if needed)
-- ALTER PUBLICATION supabase_realtime ADD TABLE project_progress, notifications, favorites, activity_logs;

-- ============================================
-- 6) CATEGORIES RLS (CRITICAL FIX)
-- ============================================
-- The categories table needs explicit SELECT policy so authenticated
-- users can read categories in dropdowns. Without this, the
-- Manajemen Jasa form's category dropdown appears empty.

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Everyone (anon + authenticated) can SELECT categories
DROP POLICY IF EXISTS "categories_public_select" ON categories;
CREATE POLICY "categories_public_select" ON categories
FOR SELECT
USING (true);

-- Only authenticated users with role='admin' can INSERT/UPDATE/DELETE
-- (Adjust to your needs; this example allows only admins)
DROP POLICY IF EXISTS "categories_admin_manage" ON categories;
CREATE POLICY "categories_admin_manage" ON categories
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);