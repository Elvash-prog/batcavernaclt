use std::collections::VecDeque;

pub const WINDOW_MS: u64 = 30_000;
pub const MIN_TRACK_MS: u64 = 10_000;
pub const REFRESH_MS: u64 = 60_000;
pub const RATE_COOLDOWN_MS: u64 = 60_000;
#[derive(Debug, PartialEq, Eq)]
pub enum Push { Track, Untrack }

/// Four pushes per rolling window, reserving the last slot for an immediate hide.
/// Timestamps are deliberately absent from the semantic key supplied by the caller.
#[derive(Default)]
pub struct Sender {
    sent: VecDeque<u64>,
    tracked: bool,
    key: String,
    last_track: Option<u64>,
    last_send: Option<u64>,
}
impl Sender {
    pub fn next(&mut self, key: &str, visible: bool, now: u64) -> Option<Push> {
        while self.sent.front().is_some_and(|t| now.saturating_sub(*t) > WINDOW_MS) { self.sent.pop_front(); }
        if !visible {
            if !self.tracked { return None; }
            self.tracked = false;
            self.sent.push_back(now);
            self.last_send = Some(now);
            return Some(Push::Untrack);
        }
        let unchanged = self.tracked && self.key == key;
        if unchanged && self.last_send.is_some_and(|t| now.saturating_sub(t) < REFRESH_MS) { return None; }
        if self.sent.len() >= 3 || self.last_track.is_some_and(|t| now.saturating_sub(t) < MIN_TRACK_MS) { return None; }
        self.tracked = true;
        self.key = key.to_owned();
        self.last_track = Some(now);
        self.last_send = Some(now);
        self.sent.push_back(now);
        Some(Push::Track)
    }
}
pub fn rate_limited(message: &str) -> bool {
    let text = message.to_ascii_lowercase();
    text.contains("clientpresenceratelimitreached") || text.contains("client presence rate limit")
        || text.contains("too many presence messages")
}
pub fn retry_ms(failures: u32, limited: bool) -> u64 {
    let normal = (5_000u64 * (1u64 << failures.min(3))).min(30_000);
    if limited { normal.max(RATE_COOLDOWN_MS) } else { normal }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn idle_connection_refreshes_once_a_minute_instead_of_every_tick() {
        let mut sender = Sender::default();
        let sent: Vec<_> = (0..=180_000).step_by(5_000).filter(|t| sender.next("online", true, *t).is_some()).collect();
        assert_eq!(sent, vec![0, 60_000, 120_000, 180_000]);
    }
    #[test]
    fn rapid_changes_and_hide_never_exceed_the_server_window() {
        let mut sender = Sender::default();let mut sent = Vec::new();
        for now in 0..=120_000 {
            let visible = now % 2 == 0;
            if sender.next(&now.to_string(), visible, now).is_some() { sent.push(now); }
        }
        for t in &sent { assert!(sent.iter().filter(|x| **x >= t.saturating_sub(WINDOW_MS) && **x <= *t).count() <= 4); }
    }
    #[test]
    fn hidden_is_not_republished_and_latest_change_survives_a_burst() {
        let mut sender=Sender::default();
        assert_eq!(sender.next("hidden",false,0),None);
        assert_eq!(sender.next("old",true,0),Some(Push::Track));
        assert_eq!(sender.next("new",true,1),None);
        assert_eq!(sender.next("latest",true,10_000),Some(Push::Track));
        assert_eq!(sender.next("hidden",false,10_001),Some(Push::Untrack));
        assert_eq!(sender.next("hidden",false,20_000),None);
        assert_eq!(sender.next("latest",true,20_001),None);
        assert_eq!(sender.next("latest",true,30_001),Some(Push::Track));
    }
    #[test]
    fn sleep_does_not_create_catch_up_pushes_and_rate_errors_back_off() {
        let mut sender=Sender::default();sender.next("online",true,0);
        assert_eq!(sender.next("online",true,3_600_000),Some(Push::Track));
        assert_eq!(sender.next("online",true,3_600_000),None);
        assert!(rate_limited("ClientPresenceRateLimitReached"));
        assert!(rate_limited("Client presence rate limit exceeded"));
        assert!(!rate_limited("Subscribed to PostgreSQL"));
        assert_eq!(retry_ms(0,true),60_000);assert_eq!(retry_ms(20,false),30_000);
    }
}
