/* eslint-disable import/no-unresolved */
/* eslint-disable unicorn/prefer-query-selector */
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import Mousetrap from 'mousetrap';
import 'photoswipe/photoswipe.css';
import '../../styles/shared/lighbox.scss';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { faCompress, faExpand } from '@fortawesome/free-solid-svg-icons';
import { getFullscreenAPI } from '../utils/fullscreen';
import { Icon } from '../components/fontawesome-icons';

const prevHotKeys = ['a', 'ф', 'h', 'р', '4'];
const nextHotKeys = ['d', 'в', 'k', 'л', '6'];
const fullScreenHotKeys = ['f', 'а'];

export function openLightbox(index, dataSource) {
  initLightbox().loadAndOpen(index, dataSource);
}

const fsApi = getFullscreenAPI();

const expandIconHTML = renderToString(createElement(Icon, { icon: faExpand }));
const compressIconHTML = renderToString(createElement(Icon, { icon: faCompress }));

function initLightbox() {
  const lightbox = new PhotoSwipeLightbox({
    clickToCloseNonZoomable: false,
    pswpModule: () => import('photoswipe'),
  });

  // Add fullscreen button
  lightbox.on('uiRegister', () => {
    if (!fsApi) {
      return;
    }
    lightbox.pswp.ui.registerElement({
      name: 'fs',
      ariaLabel: 'Full screen',
      order: 9,
      isButton: true,
      html: expandIconHTML,
      onClick: () => {
        if (fsApi.isFullscreen()) {
          fsApi.exit();
        } else {
          fsApi.request(lightbox.pswp.element);
        }
      },
    });

    const h = () => {
      const btn = document.querySelector('.pswp__button--fs');
      btn.innerHTML = fsApi.isFullscreen() ? compressIconHTML : expandIconHTML;
    };

    document.addEventListener(fsApi.changeEvent, h);
    lightbox.on('destroy', () => document.removeEventListener(fsApi.changeEvent, h));
    lightbox.on('close', () => fsApi.isFullscreen() && fsApi.exit());
  });

  // Add filters for the correct open/close animation
  lightbox.addFilter('placeholderSrc', (placeholderSrc, content) => {
    const thumb = document.getElementById(content.data.pid);
    return thumb?.src ?? placeholderSrc;
  });
  lightbox.addFilter('thumbEl', (thumbnail, itemData) => {
    const thumb = document.getElementById(itemData.pid);
    // offsetParent is not null when the element is visible
    return thumb?.offsetParent ? thumb : thumbnail;
  });

  // Handle back button
  let closedByNavigation = false;
  const close = () => {
    lightbox.pswp.close();
    closedByNavigation = true;
  };
  lightbox.on('beforeOpen', () => {
    window.addEventListener('popstate', close);
    history.pushState(null, '');
  });
  lightbox.on('destroy', () => {
    window.removeEventListener('popstate', close);
    if (!closedByNavigation) {
      history.back();
    }
  });

  // Handle keyboard navigation
  lightbox.on('beforeOpen', () => {
    Mousetrap.bind(prevHotKeys, () => lightbox.pswp.prev());
    Mousetrap.bind(nextHotKeys, () => lightbox.pswp.next());
    Mousetrap.bind(fullScreenHotKeys, () => document.querySelector('.pswp__button--fs')?.click());
  });
  lightbox.on('destroy', () => {
    Mousetrap.unbind(prevHotKeys);
    Mousetrap.unbind(nextHotKeys);
    Mousetrap.unbind(fullScreenHotKeys);
  });

  // Fix dimensions for images without known width/height
  lightbox.on('contentLoadImage', ({ content }) => {
    const { data, index } = content;
    if (data.autoSize) {
      delete data.autoSize;
      whenImageAndPswpLoaded(data.src, lightbox, (image, pswp) => {
        data.width = image.width;
        data.height = image.height;
        pswp.refreshSlideContent(index);
      });
    }
  });

  // Mount/unmount HTML content. This content can contain interactive players,
  // so for reliable playback stopping we need to unmount it when the slide
  // deactivates.
  lightbox.on('contentActivate', ({ content }) => {
    const { data, element } = content;
    data.onActivate?.call(data, element);
  });
  lightbox.on('contentDeactivate', ({ content }) => {
    const { data, element } = content;
    data.onDeactivate?.call(data, element);
  });

  // Init
  lightbox.init();
  return lightbox;
}

function whenImageAndPswpLoaded(src, lightbox, action) {
  const image = new Image();
  image.addEventListener('load', () => {
    if (lightbox.pswp) {
      action(image, lightbox.pswp);
    } else {
      lightbox.on('afterInit', () => action(image, lightbox.pswp));
    }
  });
  image.src = src;
}
