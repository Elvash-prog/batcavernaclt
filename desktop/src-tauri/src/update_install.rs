use std::sync::atomic::{AtomicBool, Ordering};

static INSTALLING: AtomicBool = AtomicBool::new(false);

/// Shared by every window. An error or a dropped command releases the next attempt.
pub struct InstallGuard;
impl InstallGuard {
    pub fn acquire() -> Result<Self, String> {
        INSTALLING.compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .map(|_| Self)
            .map_err(|_| "Uma atualização já está em andamento. Aguarde a conclusão.".into())
    }
}
impl Drop for InstallGuard {
    fn drop(&mut self) { INSTALLING.store(false, Ordering::Release); }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn serializes_installations_and_releases_after_an_error() {
        let guard = InstallGuard::acquire().unwrap();
        assert!(InstallGuard::acquire().is_err());
        drop(guard);
        let result: Result<(), String> = (|| {
            let _guard = InstallGuard::acquire()?;
            Err("download failed".into())
        })();
        assert!(result.is_err());
        assert!(InstallGuard::acquire().is_ok());
    }
}
