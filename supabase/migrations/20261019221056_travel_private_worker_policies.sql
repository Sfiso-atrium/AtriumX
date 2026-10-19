-- Explicit server-only policies document the private access model.
CREATE POLICY travel_events_service ON atriumx_private.travel_events FOR ALL TO service_role USING(true) WITH CHECK(true);
CREATE POLICY travel_subscriptions_service ON atriumx_private.travel_alert_subscriptions FOR ALL TO service_role USING(true) WITH CHECK(true);
CREATE POLICY travel_jobs_service ON atriumx_private.travel_mail_jobs FOR ALL TO service_role USING(true) WITH CHECK(true);
CREATE POLICY travel_status_service ON atriumx_private.travel_mail_status FOR ALL TO service_role USING(true) WITH CHECK(true);
