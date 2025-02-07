/* global CONFIG */
import DropzoneComponent from 'react-dropzone-component';

import { getToken } from '../services/auth';
import { useServerInfo } from './hooks/server-info';

// DropzoneJS configuration
const dropzoneComponentConfig = { postUrl: `${CONFIG.api.root}/v1/attachments` };
const dropzoneConfig = {
  dictDefaultMessage: 'Drop files here', // The message that gets displayed before any files are dropped.
  previewsContainer: '.dropzone-previews', // Define the container to display the previews.
  timeout: 0, // default is 30000 miliseconds which is too low for some cases
  previewTemplate: `
    <div class="dz-preview dz-file-preview">
      <div class="dz-preview-container">
        <div class="dz-image"><img data-dz-thumbnail /></div>
        <div class="dz-details" data-dz-remove title="Remove file">
          <div class="dz-size"><span data-dz-size></span></div>
          <div class="dz-filename"><span data-dz-name></span></div>
        </div>
        <div class="dz-progress"><span class="dz-upload" data-dz-uploadprogress></span></div>
        <div class="dz-success-mark"><svg width="54px" height="54px" viewBox="0 0 54 54" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:sketch="http://www.bohemiancoding.com/sketch/ns"><title>Check</title><defs></defs><g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" sketch:type="MSPage"><path d="M23.5,31.8431458 L17.5852419,25.9283877 C16.0248253,24.3679711 13.4910294,24.366835 11.9289322,25.9289322 C10.3700136,27.4878508 10.3665912,30.0234455 11.9283877,31.5852419 L20.4147581,40.0716123 C20.5133999,40.1702541 20.6159315,40.2626649 20.7218615,40.3488435 C22.2835669,41.8725651 24.794234,41.8626202 26.3461564,40.3106978 L43.3106978,23.3461564 C44.8771021,21.7797521 44.8758057,19.2483887 43.3137085,17.6862915 C41.7547899,16.1273729 39.2176035,16.1255422 37.6538436,17.6893022 L23.5,31.8431458 Z M27,53 C41.3594035,53 53,41.3594035 53,27 C53,12.6405965 41.3594035,1 27,1 C12.6405965,1 1,12.6405965 1,27 C1,41.3594035 12.6405965,53 27,53 Z" id="Oval-2" stroke-opacity="0.198794158" stroke="#747474" fill-opacity="0.816519475" fill="#FFFFFF" sketch:type="MSShapeGroup"></path></g></svg></div>
        <div class="dz-error-mark"><svg width="54px" height="54px" viewBox="0 0 54 54" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:sketch="http://www.bohemiancoding.com/sketch/ns"><title>Error</title><defs></defs><g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" sketch:type="MSPage"><g id="Check-+-Oval-2" sketch:type="MSLayerGroup" stroke="#747474" stroke-opacity="0.198794158" fill="#FFFFFF" fill-opacity="0.816519475"><path d="M32.6568542,29 L38.3106978,23.3461564 C39.8771021,21.7797521 39.8758057,19.2483887 38.3137085,17.6862915 C36.7547899,16.1273729 34.2176035,16.1255422 32.6538436,17.6893022 L27,23.3431458 L21.3461564,17.6893022 C19.7823965,16.1255422 17.2452101,16.1273729 15.6862915,17.6862915 C14.1241943,19.2483887 14.1228979,21.7797521 15.6893022,23.3461564 L21.3431458,29 L15.6893022,34.6538436 C14.1228979,36.2202479 14.1241943,38.7516113 15.6862915,40.3137085 C17.2452101,41.8726271 19.7823965,41.8744578 21.3461564,40.3106978 L27,34.6568542 L32.6538436,40.3106978 C34.2176035,41.8744578 36.7547899,41.8726271 38.3137085,40.3137085 C39.8758057,38.7516113 39.8771021,36.2202479 38.3106978,34.6538436 L32.6568542,29 Z M27,53 C41.3594035,53 53,41.3594035 53,27 C53,12.6405965 41.3594035,1 27,1 C12.6405965,1 1,12.6405965 1,27 C1,41.3594035 12.6405965,53 27,53 Z" id="Oval-2" sketch:type="MSShapeGroup"></path></g></g></svg></div>
      </div>
      <div class="dz-error-message"><span data-dz-errormessage></span></div>
    </div>
  `,
  clickable: '.dropzone-trigger', // Define the element that should be used as click trigger to select files.
  headers: { 'Cache-Control': null },
  maxFilesize: 1, // in MiB (1000 * 1000 bytes). Dropzone's default is 256
};

const dropzoneEventHandlers = (props) => ({
  init: props.onInit,

  // DropzoneJS uses stopPropagation() for dragenter and drop events, so
  // they are not being propagated to window and it breaks crafty handling
  // of those events we have in the Layout component. So here we have to
  // re-dispatch them to let event handlers in Layout work as they should.
  // The events don't need to be real, just mimic some important parts.
  dragenter(e) {
    const dragEnterEvent = new Event('dragenter');
    if (e.dataTransfer && e.dataTransfer.types) {
      dragEnterEvent.dataTransfer = { types: e.dataTransfer.types };
    }
    window.dispatchEvent(dragEnterEvent);
  },
  drop(e) {
    const dropEvent = new Event('drop');
    if (e.dataTransfer && e.dataTransfer.types) {
      dropEvent.dataTransfer = { types: e.dataTransfer.types };
    }
    window.dispatchEvent(dropEvent);
  },

  sending(file, xhr /*, form*/) {
    xhr.setRequestHeader('X-Authentication-Token', getToken());
    props.onSending();
  },

  success(file, response) {
    // Remove file preview after upload
    this.removeFile(file);

    // Add uploaded attachment to the post
    // 'attachments' in this response will be an attachment object, not an array of objects
    props.addAttachmentResponse(response.attachments);
  },

  error(file, message, xhrs) {
    if (typeof message === 'object' && 'err' in message) {
      let { err } = message;
      console.error('File upload failed', file.name, err);
      err = err.replace(/[\r\n].*/g, ''); // First line of multiline message
      if (err.length > 150) {
        err = `${err.slice(0, 100)}…`;
      }
      file.previewElement.querySelector('[data-dz-errormessage]').textContent = err;
    } else if (xhrs[0].status === 413) {
      // Entity too large
      file.previewElement.querySelector(
        '[data-dz-errormessage]',
      ).textContent = `The file you're uploading is too big`;
    } else if (xhrs[0].status === 0) {
      // Cannot read server response, probably CORS issue
      file.previewElement.querySelector(
        '[data-dz-errormessage]',
      ).textContent = `An unexpected error occurred during upload`;
    }
  },

  queuecomplete: props.onQueueComplete,
});

export default (props) => {
  const [serverInfo, serverInfoStatus] = useServerInfo();

  if (serverInfoStatus.success && serverInfo.attachments?.fileSizeLimit) {
    const fileSizeLimitInMibs = (serverInfo.attachments.fileSizeLimit / (1000 * 1000)).toFixed(2);
    dropzoneConfig.maxFilesize = fileSizeLimitInMibs;
  }

  return (
    <DropzoneComponent
      config={dropzoneComponentConfig}
      djsConfig={dropzoneConfig}
      eventHandlers={dropzoneEventHandlers(props)}
    />
  );
};
