/**
 * Better Join Button - Display session type on join button
 */

import features from '../feature-manager.js';
import { observe } from '../helpers/selector-observer.js';
import { findProps } from '../helpers/react-resolver.js';
import { $ } from 'select-dom';
import './better-join-button.css';

const selector = '.css-qlxuh7 .btn-success';

const userRoles = {
  0: 'Race',
  2: 'Spectate',
  4: 'Spot',
};

function init(signal) {
  observe(selector, (joinBtnEl) => {
    const joinProps = findProps(joinBtnEl);

    if (!joinProps?.registrationStatus) {
      return;
    }

    let label1 = '';
    let label2 = '';

    if (joinProps.registrationStatus.user_role !== 0) {
      if (userRoles[joinProps.registrationStatus.user_role] !== undefined) {
        label1 = userRoles[joinProps.registrationStatus.user_role];
      }
    } else {
      if (joinProps.registrationStatus.event_type === 5) {
        label1 = 'Race';
      } else {
        label1 = 'Practice';
      }

      if (joinProps.registrationStatus.will_be_scored) {
        label2 = '';
      } else {
        label2 = ' (Unscored)';
      }
    }

    joinBtnEl.innerHTML = label1;

    // Update series label if available
    const joinSeriesLabel =
      window.irefIndex &&
      joinProps.registrationStatus.season_id in window.irefIndex
        ? window.irefIndex[joinProps.registrationStatus.season_id]
        : false;

    if (joinSeriesLabel) {
      const seriesLabelEl = $('.chakra-text.css-1ap4k1m');
      if (seriesLabelEl) {
        seriesLabelEl.innerText = joinSeriesLabel;
      }
    }
  }, { signal });
}

void features.add('better-join-button', {
  init
});
