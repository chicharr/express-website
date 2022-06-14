/*
 * Copyright 2022 Adobe. All rights reserved.
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
  createTag, getHelixEnv, getOffer,
  // eslint-disable-next-line import/no-unresolved
} from '../../scripts/scripts.js';

import { buildCarousel } from '../shared/carousel.js';

function replaceUrlParam(url, paramName, paramValue) {
  const params = url.searchParams;
  params.set(paramName, paramValue);
  url.search = params.toString();
  return url;
}

function buildUrl(optionUrl, country, language) {
  const currentUrl = new URL(window.location.href);
  let planUrl = new URL(optionUrl);

  if (!planUrl.hostname.includes('commerce')) {
    return planUrl.href;
  }
  planUrl = replaceUrlParam(planUrl, 'co', country);
  planUrl = replaceUrlParam(planUrl, 'lang', language);
  let rUrl = planUrl.searchParams.get('rUrl');
  if (currentUrl.searchParams.has('host')) {
    const hostParam = currentUrl.searchParams.get('host');
    if (hostParam === 'express.adobe.com') {
      planUrl.hostname = 'commerce.adobe.com';
      if (rUrl) rUrl = rUrl.replace('express.adobe.com', hostParam);
    } else if (hostParam.includes('qa.adobeprojectm.com')) {
      planUrl.hostname = 'commerce.adobe.com';
      if (rUrl) rUrl = rUrl.replace('express.adobe.com', hostParam);
    } else if (hostParam.includes('.adobeprojectm.com')) {
      planUrl.hostname = 'commerce-stg.adobe.com';
      if (rUrl) rUrl = rUrl.replace('adminconsole.adobe.com', 'stage.adminconsole.adobe.com');
      if (rUrl) rUrl = rUrl.replace('express.adobe.com', hostParam);
    }
  }

  const env = getHelixEnv();
  if (env && env.commerce && planUrl.hostname.includes('commerce')) planUrl.hostname = env.commerce;
  if (env && env.spark && rUrl) {
    const url = new URL(rUrl);
    url.hostname = env.spark;
    rUrl = url.toString();
  }

  if (rUrl) {
    rUrl = new URL(rUrl);

    if (currentUrl.searchParams.has('touchpointName')) {
      rUrl = replaceUrlParam(rUrl, 'touchpointName', currentUrl.searchParams.get('touchpointName'));
    }
    if (currentUrl.searchParams.has('destinationUrl')) {
      rUrl = replaceUrlParam(rUrl, 'destinationUrl', currentUrl.searchParams.get('destinationUrl'));
    }
    if (currentUrl.searchParams.has('srcUrl')) {
      rUrl = replaceUrlParam(rUrl, 'srcUrl', currentUrl.searchParams.get('srcUrl'));
    }
  }

  if (currentUrl.searchParams.has('code')) {
    planUrl.searchParams.set('code', currentUrl.searchParams.get('code'));
  }

  if (currentUrl.searchParams.get('rUrl')) {
    rUrl = currentUrl.searchParams.get('rUrl');
  }

  if (rUrl) planUrl.searchParams.set('rUrl', rUrl.toString());
  return planUrl.href;
}

function pushPricingAnalytics(adobeEventName, sparkEventName, plan) {
  const url = new URL(window.location.href);
  const sparkTouchpoint = url.searchParams.get('touchpointName');

  digitalData._set('primaryEvent.eventInfo.eventName', adobeEventName);
  digitalData._set('spark.eventData.eventName', sparkEventName);
  digitalData._set('spark.eventData.contextualData4', `billingFrequency:${plan.frequency}`);
  digitalData._set('spark.eventData.contextualData6', `commitmentType:${plan.frequency}`);
  digitalData._set('spark.eventData.contextualData7', `currencyCode:${plan.currency}`);
  digitalData._set('spark.eventData.contextualData9', `offerId:${plan.offerId}`);
  digitalData._set('spark.eventData.contextualData10', `price:${plan.price}`);
  digitalData._set('spark.eventData.contextualData12', `productName:${plan.name} - ${plan.frequency}`);
  digitalData._set('spark.eventData.contextualData14', 'quantity:1');
  digitalData._set('spark.eventData.trigger', sparkTouchpoint);

  _satellite.track('event', {
    digitalData: digitalData._snapshot(),
  });

  digitalData._delete('primaryEvent.eventInfo.eventName');
  digitalData._delete('spark.eventData.eventName');
  digitalData._delete('spark.eventData.contextualData4');
  digitalData._delete('spark.eventData.contextualData6');
  digitalData._delete('spark.eventData.contextualData7');
  digitalData._delete('spark.eventData.contextualData9');
  digitalData._delete('spark.eventData.contextualData10');
  digitalData._delete('spark.eventData.contextualData12');
  digitalData._delete('spark.eventData.contextualData14');
}

async function fetchPlan(planUrl) {
  if (!window.pricingPlans) {
    window.pricingPlans = {};
  }

  let plan = window.pricingPlans[planUrl];

  if (!plan) {
    plan = {};
    const link = new URL(planUrl);
    const params = link.searchParams;

    plan.url = planUrl;
    plan.country = 'us';
    plan.language = 'en';
    plan.price = '9.99';
    plan.currency = 'US';
    plan.symbol = '$';

    if (planUrl.includes('/sp/')) {
      plan.offerId = 'FREE0';
      plan.frequency = 'monthly';
      plan.name = 'Free';
      plan.stringId = 'free-trial';
    } else {
      plan.offerId = params.get('items[0][id]');
      plan.frequency = null;
      plan.name = 'Premium';
      plan.stringId = '3-month-trial';
    }

    if (plan.offerId === '70C6FDFC57461D5E449597CC8F327CF1' || plan.offerId === 'CFB1B7F391F77D02FE858C43C4A5C64F') {
      plan.frequency = 'Monthly';
    } else if (plan.offerId === 'E963185C442F0C5EEB3AE4F4AAB52C24' || plan.offerId === 'BADDACAB87D148A48539B303F3C5FA92') {
      plan.frequency = 'Annual';
    } else {
      plan.frequency = null;
    }

    const countryOverride = new URLSearchParams(window.location.search).get('country');
    const offer = await getOffer(plan.offerId, countryOverride);

    if (offer) {
      plan.currency = offer.currency;
      plan.price = offer.unitPrice;
      plan.formatted = `${offer.unitPriceCurrencyFormatted}`;
      plan.country = offer.country;
      plan.vatInfo = offer.vatInfo;
      plan.language = offer.lang;
      plan.rawPrice = offer.unitPriceCurrencyFormatted.match(/[\d\s,.+]+/g);
      plan.formatted = plan.formatted.replace(plan.rawPrice[0], `<strong>${plan.rawPrice[0]}</strong>`);
    }

    window.pricingPlans[planUrl] = plan;
  }

  return plan;
}

async function selectPlan($card, planUrl, sendAnalyticEvent) {
  const plan = await fetchPlan(planUrl);

  if (plan) {
    const $pricingCta = $card.querySelector('.puf-card-top a');
    const $pricingHeader = createTag('h2', { class: 'puf-pricing-header' });

    $pricingHeader.innerHTML = plan.formatted;
    $pricingHeader.classList.add(plan.currency.toLowerCase());
    $pricingCta.href = buildUrl(plan.url, plan.country, plan.language);
    $pricingCta.dataset.planUrl = planUrl;
    $pricingCta.id = plan.stringId;

    $pricingCta.parentNode.insertBefore($pricingHeader, $pricingCta);
  }

  if (sendAnalyticEvent) {
    const adobeEventName = 'adobe.com:express:pricing:commitmentType:selected';
    const sparkEventName = 'pricing:commitmentTypeSelected';
    pushPricingAnalytics(adobeEventName, sparkEventName, plan);
  }
}

function decorateCard($block, cardClass) {
  const $cardContainer = createTag('div', { class: 'puf-card-container' });
  const $card = createTag('div', { class: `puf-card ${cardClass}` });
  const $cardTop = $block.children[0].children[0];
  const $cardBottom = $block.children[1].children[0];
  const $cardCta = createTag('a', { class: 'button large reverse' });

  $cardTop.classList.add('puf-card-top');
  $cardBottom.classList.add('puf-card-bottom');

  $card.append($cardTop);
  $card.append($cardBottom);

  const $svg = $cardTop.querySelector('svg');
  const $header = $cardTop.querySelector('h3');
  $header.prepend($svg);

  const $ctaTextContainer = $cardTop.querySelector('strong');
  if ($ctaTextContainer) {
    $cardCta.textContent = $ctaTextContainer.textContent;
    $ctaTextContainer.parentNode.remove();
  } else {
    $cardCta.textContent = 'Start your trial';
  }
  $header.parentNode.insertBefore($cardCta, $header.nextSibling);

  const $plans = $cardTop.querySelectorAll('li a');

  if ($plans.length) {
    selectPlan($card, $plans[0].href);
    $cardTop.querySelector('ul').remove();
  }

  $cardContainer.append($card);

  return $cardContainer;
}

function updateHeightPUFCarousel($block, $leftCard, $rightCard) {
  const $carouselPlatform = $block.querySelector('.carousel-platform');
  const $carouselContainer = $block.querySelector('.carousel-container');
  setTimeout(() => {
    $carouselContainer.style.maxHeight = `${40 + $leftCard.offsetHeight}px`;
  }, 1000);
  $carouselPlatform.addEventListener('scroll', () => {
    if ($carouselPlatform.scrollLeft < ($carouselPlatform.scrollWidth / 4)) {
      $carouselContainer.style.maxHeight = `${40 + $leftCard.offsetHeight}px`;
    } else {
      $carouselContainer.style.maxHeight = `${40 + $rightCard.offsetHeight}px`;
    }
  });
}

export default function decorate($block) {
  const $leftCard = decorateCard($block, 'puf-left');
  const $rightCard = decorateCard($block, 'puf-right');

  $block.innerHTML = '';

  $block.append($leftCard);
  $block.append($rightCard);

  buildCarousel('.puf-card-container', $block);
  updateHeightPUFCarousel($block, $leftCard, $rightCard);
}
