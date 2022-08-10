/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {
  createTag, getIcon, getIconElement, getMetadata,
} from '../../scripts/scripts.js';

/**
 * Determine the mobile operating system.
 * This function returns one of 'iOS', 'Android', 'Windows Phone', or 'unknown'.
 *
 * @returns {String}
 */

function createStandardImage(src, alt = '', eager = false, breakpoints = [{ media: '(min-width: 400px)', width: '2000' }, { width: '750' }]) {
  const url = new URL(src, window.location.origin);
  const picture = document.createElement('picture');
  const { pathname } = url;
  const ext = pathname.substring(pathname.lastIndexOf('.') + 1);

  // webp
  breakpoints.forEach((br) => {
    const source = document.createElement('source');
    if (br.media) source.setAttribute('media', br.media);
    source.setAttribute('type', 'image/webp');
    source.setAttribute('srcset', `${pathname}?width=${br.width}&format=webply&optimize=medium`);
    picture.appendChild(source);
  });

  // fallback
  breakpoints.forEach((br, i) => {
    if (i < breakpoints.length - 1) {
      const source = document.createElement('source');
      if (br.media) source.setAttribute('media', br.media);
      source.setAttribute('srcset', `${pathname}?width=${br.width}&format=${ext}&optimize=medium`);
      picture.appendChild(source);
    } else {
      const img = document.createElement('img');
      img.setAttribute('loading', eager ? 'eager' : 'lazy');
      img.setAttribute('alt', alt);
      picture.appendChild(img);
      img.setAttribute('src', `${pathname}?width=${br.width}&format=${ext}&optimize=medium`);
    }
  });

  return picture;
}

function buildStandardPayload($block, payload) {
  const $subHeading = createTag('p');
  const $copy = createTag('p');
  const $orToLink = createTag('a', { href: 'bit.ly/3uWjWJC' });

  payload.heading = 'Create on the go with the Adobe Express app';
  $subHeading.textContent = 'Scan QR code to download';
  $copy.textContent = 'Or, go to ';
  $orToLink.textContent = 'bit.ly/3uWjWJC';
  $copy.append($orToLink);
  payload.copyParagraphs.push($subHeading, $copy);
  payload.ratingScore = getMetadata('app-rating-score');
  payload.ratingCount = getMetadata('app-rating-count');
  payload.image = createStandardImage('express/blocks/app-store-blade/generic-foreground-image.png');
  payload.image.classList.add('foreground-image');
  payload.QRCode = createStandardImage('express/blocks/app-store-blade/qr-code.png');
  payload.QRCode.classList.add('qr-code');
  payload.badgeLink = 'https://adobesparkpost.app.link/d9EzZEpk4rb';
}

function buildPayloadFromBlock($block, payload) {
  Array.from($block.children).forEach(($row) => {
    const $divs = $row.querySelectorAll('div');
    switch ($divs[0].textContent) {
      default:
        payload.other.push($divs);
        break;
      case 'Heading':
        payload.heading = $divs[1].textContent;
        break;
      case 'Copy':
        payload.copyParagraphs = $divs[1].querySelectorAll('p');
        break;
      case 'Show Rating?':
        payload.showRating = $divs[1].textContent.toLowerCase() === 'yes' || $divs[1].textContent.toLowerCase() === 'true';
        break;
      case 'Rating Score':
        payload.ratingScore = parseFloat($divs[1].textContent);
        payload.ratingCount = $divs[3].textContent;
        break;
      case 'Image':
        payload.image = $divs[1].querySelector('picture');
        payload.image.classList.add('foreground-image');
        break;
      case 'QR Code':
        payload.QRCode = $divs[1].querySelector('picture');
        payload.QRCode.classList.add('qr-code');
        break;
      case 'Badge Link':
        payload.badgeLink = $divs[1].textContent;
        break;
    }
  });
}

function buildTamplateTitle($block) {
  const $heading = $block.querySelector('.heading');
  $heading.innerHTML = $heading.innerHTML.replace('{{', '<span>');
  $heading.innerHTML = $heading.innerHTML.replace('}}', '</span>');
}

function handleClipboard($block) {
  const $orToLink = $block.querySelector('.or-to-link');
  const $innerAnchor = $orToLink.querySelector('a');
  if (!$orToLink.classList.contains('copied')) {
    navigator.clipboard.writeText($innerAnchor.href);
  }
  $orToLink.classList.toggle('copied');
}

function decorateRatings($block, payload) {
  const $ratingWrapper = $block.querySelector('.rating-wrapper');

  if (payload.showRating) {
    const star = getIcon('star');
    const starHalf = getIcon('star-half');
    const starEmpty = getIcon('star-empty');
    const $stars = createTag('span', { class: 'rating-stars' });
    const ratingRoundedHalf = Math.round(payload.ratingScore * 2) / 2;
    const filledStars = Math.floor(ratingRoundedHalf);
    const halfStars = (filledStars === ratingRoundedHalf) ? 0 : 1;
    const emptyStars = (halfStars === 1) ? 4 - filledStars : 5 - filledStars;
    $stars.innerHTML = `${star.repeat(filledStars)}${starHalf.repeat(halfStars)}${starEmpty.repeat(emptyStars)} `;
    const $votes = createTag('span', { class: 'rating-votes' });
    $votes.textContent = `${payload.ratingScore} • ${payload.ratingCount} Ratings`;
    $stars.appendChild($votes);
    const $editorChoice = createTag('img', { class: 'icon-editor-choice', src: '/express/icons/editor-choice.png', alt: 'editor-choice' });
    $ratingWrapper.append($editorChoice);
    $ratingWrapper.append($stars);
  }
}

function decorateBlade($block, payload) {
  const $mainContainer = createTag('div', { class: 'main-container' });
  const $heading = createTag('h3', { class: 'heading' });
  const $body = createTag('div', { class: 'body' });
  const $bodyContentWrapper = createTag('div', { class: 'body-content-wrapper' });
  const $copyWrapper = createTag('div', { class: 'copy-wrapper' });
  const $badgesWrapper = createTag('div', { class: 'badges-wrapper' });
  const $ratingWrapper = createTag('div', { class: 'rating-wrapper' });

  $heading.textContent = payload.heading;
  for (let i = 0; i < payload.copyParagraphs.length; i += 1) {
    const paragraph = payload.copyParagraphs[i];
    $copyWrapper.append(paragraph);
    if (i === 0) {
      paragraph.classList.add('heading-small');
    }

    if (paragraph.querySelector('a')) {
      paragraph.classList.add('or-to-link');
      paragraph.append(getIconElement('copy'));
      const $clipboardTag = createTag('span', { class: 'clipboard-tag' });
      $clipboardTag.textContent = 'Copied to clipboard';
      paragraph.append($clipboardTag);

      paragraph.addEventListener('click', () => {
        handleClipboard($block);
      });
    }
  }

  $badgesWrapper.append(getIconElement('apple-store'), getIconElement('google-store'));
  $bodyContentWrapper.append($copyWrapper, $badgesWrapper, $ratingWrapper);
  $body.append(payload.QRCode, $bodyContentWrapper);
  $mainContainer.append($heading, $body, payload.image);
  $block.append($mainContainer);

  buildTamplateTitle($block);

  decorateRatings($block, payload);
}

export default function decorate($block) {
  const payload = {
    heading: '',
    copyParagraphs: [],
    showRating: true,
    ratingScore: 0,
    ratingCount: '',
    image: '',
    QRCode: '',
    badgeLinks: {
      ios: '',
      android: '',
    },
    // other contains unwanted elements authored by mistake;
    other: [],
  };

  if (['yes', 'true', 'on'].includes(getMetadata('show-standard-app-store-blocks').toLowerCase())) {
    buildStandardPayload($block, payload);
  } else {
    buildPayloadFromBlock($block, payload);
  }

  $block.innerHTML = '';

  decorateBlade($block, payload);
}
