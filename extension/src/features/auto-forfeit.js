/**
 * Auto Forfeit - Automatically forfeit session after timeout
 */

import features from '../feature-manager.js';
import { observe } from '../helpers/selector-observer.js';
import { findProps } from '../helpers/react-resolver.js';
import ws from '../helpers/websockets.js';
import { $ } from 'select-dom';
import { log } from './logger.js';

const selector = '.css-qlxuh7 .btn-danger';

function init(signal) {
  const settings = JSON.parse(localStorage.getItem('iref_settings') || '{}');
  const timeout = settings['auto-forfeit-m'] || 13;

  observe(selector, (forfeitBtn) => {
    const forfeitProps = findProps(forfeitBtn);

    if (!forfeitProps?.registrationStatus) {
      return;
    }

    const forfeitCheck = forfeitProps.registrationStatus.subsession_id;
    log(`🛑 Forfeit button seen, beginning ${timeout} minute countdown`);

    // Set timeout to forfeit
    const timeoutId = setTimeout(() => {
      const forfeitBtn2 = $(selector);
      if (!forfeitBtn2) {
        log('🛑 Forfeit button not available');
        return;
      }

      const forfeitProps2 = findProps(forfeitBtn2);

      if (!forfeitProps2) {
        log('🛑 Forfeit button not available');
        return;
      }

      if (forfeitProps2.simStatus?.status !== 'Sim Running') {
        log('🛑 Sim not running, skipping forfeit');
        return;
      }

      if (forfeitCheck !== forfeitProps2.registrationStatus.subsession_id) {
        log('🛑 Session changed, skipping forfeit');
        return;
      }

      log(`🛑 Forfeiting session ${forfeitCheck}`);
      ws.withdraw();
    }, timeout * 1000 * 60);

    // Cleanup timeout on abort
    signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
    });
  }, { signal });
}

void features.add('auto-forfeit', {
  init
});
