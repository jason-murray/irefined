# Python to Rust Migration Guide

## Overview

The iRefined launcher has been rewritten in Rust to improve:
- **Performance**: Faster startup and lower memory usage
- **Reliability**: Stronger type safety and error handling
- **Maintainability**: Easier to build and distribute
- **Size**: Smaller executable (~3MB vs ~15MB with Python)

## Feature Parity

All features from the Python launcher are preserved:

| Feature | Python | Rust | Notes |
|---------|--------|------|-------|
| System tray icon | ✅ | ✅ | Same behavior |
| CDP WebSocket injection | ✅ | ✅ | Same 1-second polling |
| Config file (INI) | ✅ | ✅ | Same format, same location |
| iRacing path detection | ✅ | ✅ | Same logic |
| Startup shortcut | ✅ | ✅ | Same Windows shortcut API |
| local.json installation | ✅ | ✅ | Same UAC elevation |
| Velopack updates | ✅ | ✅ | Same update mechanism |
| Discord link | ✅ | ✅ | Opens in default browser |
| Reload injection | ✅ | ✅ | Clears seen URLs |

## User Impact

**Zero migration needed for users!**

- Existing config files work as-is
- Startup shortcuts continue working
- Auto-update delivers new Rust version seamlessly
- No UI changes

## Developer Impact

### Build Process

**Python:**
```bash
cd launcher
pipenv install
pipenv run cxfreeze build --target-dir=dist
```

**Rust:**
```bash
cd launcher-rs
cargo build --release
```

### Dependencies

**Python (removed):**
- Python 3.13 runtime (~50MB)
- cx_Freeze
- requests, websockets, pystray, pywin32, velopack
- Pipenv for environment management

**Rust (new):**
- Rust toolchain (dev only)
- Dependencies compiled into single binary
- No runtime dependencies

### CI/CD

- Old workflow: `.github/workflows/launcher.yml` (disabled)
- New workflow: `.github/workflows/launcher-rs.yml`
- Tag-based releases unchanged

## Rollback Plan

If critical issues arise:

1. Re-enable Python workflow:
   ```yaml
   # .github/workflows/launcher.yml
   if: false  # Change to: if: github.ref_type == 'tag'
   ```

2. Create new tag with older Python version:
   ```bash
   git checkout <last-python-commit>
   git tag 1.5.5-py
   git push origin 1.5.5-py
   ```

3. Users will auto-update back to Python version

## Testing Checklist

Before releasing Rust version:

- [ ] All automated tests pass (`cargo test`)
- [ ] Manual testing completed (see `TESTING.md`)
- [ ] Tested on clean Windows install
- [ ] Tested with iRacing UI injection
- [ ] Tested update mechanism (downgrade to Python, then update to Rust)
- [ ] Verified no memory leaks (run for 24 hours)
- [ ] Verified CPU usage is low (< 1% when idle)

## Timeline

1. **Development**: Complete all 12 tasks in this plan
2. **Internal Testing**: Run Rust version for 1 week alongside Python
3. **Beta Release**: Tag as `1.6.0-beta` for opt-in testing
4. **Full Release**: Tag as `1.6.0` for auto-update rollout
5. **Monitor**: Watch Discord for user feedback
6. **Deprecation**: Remove Python code after 2 stable releases

## Questions?

- Codebase questions → `CLAUDE.md`
- Build questions → `README.md`
- Testing questions → `TESTING.md`
