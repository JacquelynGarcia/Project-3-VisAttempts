
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { sliderBottom } from 'https://esm.sh/d3-simple-slider@2.0.0';
import {
  updateFocus,
  filterByMinute,
  renderScatterplot,
  data
} from './global.js';

const startOfDay = new Date(2000, 0, 1, 0, 0);
const endOfDay   = new Date(2000, 0, 1, 23, 59);
const timeFmt    = d3.timeFormat('%-I:%M %p');
const zToggle    = document.getElementById('zscoreToggle');
const wrapper    = document.getElementById('year-slider');

const svg = d3.select(wrapper)
  .append('svg')
  .attr('width', '100%')    
  .attr('height', 65);

export const g = svg.append('g').attr('transform', 'translate(30,30)');

export let timeSlide;

export function buildSlider () {
  const innerW = wrapper.clientWidth - 60;  // 30 px L + R margin

  timeSlide = sliderBottom()
    .min(startOfDay)
    .max(endOfDay)
    .step(60_000)                 // one-minute ticks
    .width(innerW)
    
    .tickFormat(timeFmt)
    .ticks(8)
    .default(startOfDay)
    .on('onchange', val => {
      d3.select('#time-label').text(timeFmt(val));
      updateFocus(val);

      const useZ = zToggle.checked;
      d3.select('#scatterplot').selectAll('*').remove();
      renderScatterplot(filterByMinute(data, val, useZ), useZ);
    });

  g.selectAll('*').remove();    
  g.call(timeSlide);
}

buildSlider();
window.addEventListener('resize', buildSlider);

d3.select('#time-label').text(timeFmt(startOfDay));


zToggle.addEventListener('change', () => {
  if (!timeSlide) return;                     // safety
  const minute = timeSlide.value();           // current Date on knob
  const useZ   = zToggle.checked;
  d3.select('#scatterplot').selectAll('*').remove();
  renderScatterplot(filterByMinute(data, minute, useZ), useZ);
});

export function setSliderDomain(minDate, maxDate) {
  timeSlide            
    .min(minDate)
    .max(maxDate);

  
  if (timeSlide.value() > minDate && timeSlide.value() > maxDate) {
    timeSlide.value(maxDate);
  }
  else if (timeSlide.value() < minDate && timeSlide.value() < maxDate) {
    timeSlide.value(minDate);
  }

  g.call(timeSlide);                           
}