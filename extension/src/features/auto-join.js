/**
 * Auto Join - Automatically click join button for scored race sessions
 */

import features from '../feature-manager.js';
import { observe } from '../helpers/selector-observer.js';
import { findProps } from '../helpers/react-resolver.js';
import { $ } from 'select-dom';
import { log } from './logger.js';

const selector = '.css-qlxuh7 .btn-success';
const regBarSelector = '#scroll > .css-c980m3';

function init(signal) {
  const settings = JSON.parse(localStorage.getItem('iref_settings') || '{}');
  const type = settings['auto-join-type'] || 'race';

  // Watch for join button appearance
  observe(selector, (joinBtn) => {
    const lastJoined = parseInt(localStorage.getItem('iref_last_joined') || '0');
    const joinProps = findProps(joinBtn);

    if (!joinProps?.registrationStatus) {
      return;
    }

    if (joinProps.registrationStatus.subsession_id !== lastJoined) {
      localStorage.setItem('iref_last_joined', joinProps.registrationStatus.subsession_id);

      if (
        type !== 'race' ||
        (type === 'race' &&
          joinProps.registrationStatus.event_type === 5 &&
          joinProps.registrationStatus.will_be_scored)
      ) {
        log(`🏁 Auto joining session: ${joinProps.registrationStatus.subsession_id}`);
        joinBtn.click();
      } else {
        log(`⛔ Not joining unscored session: ${joinProps.registrationStatus.subsession_id}`);
      }
    } else {
      log(`⛔ Already joined ${lastJoined} once, skipping`);
    }
  }, { signal });

  // Monitor for session transitions (sim running)
  const intervalId = setInterval(() => {
    const regBarEl = $(regBarSelector);
    if (regBarEl) {
      const regBarProps = findProps(regBarEl);
      const lastJoined = parseInt(localStorage.getItem('iref_last_joined') || '0');

      if (
        regBarProps?.simStatus?.status === 'Sim Running' &&
        regBarProps?.registrationStatus?.subsession_id !== lastJoined
      ) {
        log(
          `🏁 Session transition detected, last session is now ${regBarProps.registrationStatus.subsession_id}`
        );
        localStorage.setItem(
          'iref_last_joined',
          regBarProps.registrationStatus.subsession_id
        );
      }
    }
  }, 1000);

  // Cleanup interval on abort
  signal.addEventListener('abort', () => {
    clearInterval(intervalId);
  });
}

void features.add('auto-join', {
  init
});
