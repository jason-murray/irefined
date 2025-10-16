import features from '../feature-manager.js';
import { observe } from '../helpers/selector-observer.js';
import { findReact } from '../helpers/react-resolver.js';
import React from 'dom-chef';
import { $ } from 'select-dom';

const selector = '#test-drive-modal';

function init(signal) {
  // Watch for test drive modal appearance
  observe(selector, (modalEl) => {

    const modalState = findReact($(selector), 1, "state");

    const getJsonUpload = () =>
        new Promise(resolve => {
            const inputFileElement = document.createElement('input')
            inputFileElement.setAttribute('type', 'file')
            inputFileElement.setAttribute('accept', '.json')

            inputFileElement.addEventListener(
                'change',
                async (event) => {
                    const { files } = event.target
                    if (!files) {
                        return
                    }

                    const filePromises = [...files].map(file => file.text())

                    resolve(await Promise.all(filePromises))
                },
                false,
            )
            inputFileElement.click()
        })

    const handleUpload = async () => {
        const json = await getJsonUpload();
        modalState.setState(JSON.parse(json[0]));
    }

    function getJsonDownload(text, name) {
        const a = document.createElement('a');
        const type = name.split(".").pop();
        a.href = URL.createObjectURL(new Blob([text], { type: `text/${type === "txt" ? "plain" : type}` }));
        a.download = name;
        a.click();
    }

    const handleDownload = async () => {
        const sessionVars = {
            carId: modalState.state.carId,
            carClassId: modalState.state.carClassId,
            climateChange: modalState.state.climateChange,
            damageModel: modalState.state.damageModel,
            timeOfDay: modalState.state.timeOfDay,
            trackId: modalState.state.trackId,
            trackState: modalState.state.trackState,
            weather: modalState.state.weather
        }

        const date = new Date();
        const dateString = date.toISOString().substring(0, 10);
        getJsonDownload(JSON.stringify(sessionVars), `testing-conditions-${dateString}.json`);
    }

    const buttonEl = (
        <div style={{display: "inline"}}>
            <button id="upload-button" onClick={handleUpload} class="btn btn-sm btn-primary pull-xs-left">
                Upload
            </button>
            <button id="download-button" onClick={handleDownload} class="btn btn-sm btn-primary pull-xs-left">
                Download
            </button>
        </div>
    );

    modalEl.querySelector('.modal-footer > .centered-horizontal').prepend(buttonEl);
  }, { signal });
}

void features.add('share-test-session', {
  init
});
