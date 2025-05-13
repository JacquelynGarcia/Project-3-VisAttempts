import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { timeSlide } from './slider.js'
export const startOfDay = new Date(2000, 0, 1, 0, 0);   // 00:00
export const endOfDay = new Date(2000, 0, 1, 23, 59);   // 23:59

let svg;                     // will hold the one <svg>
let xScale, yScale;          // left panel   (Activity)
let xScale2, yScale2;        // right panel  (Temperature)
let focusGroup;              // <g> that carries the vertical line + dots
let actDot1, actDot2, tempDot1, tempDot2;  
let leftCursor, rightCursor;   // the two rulers
let map1 = [], map2 = []; 
let actLabel1, tempLabel1, actLabel2, tempLabel2; 
const initTime = timeSlide.value();               // == startOfDay
updateFocus(initTime);   
export async function loadData() {
    const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
    const data = await d3.csv('female.csv', (row) => ({
        ...row,
        Temp: +row.Temp,
        Act: +row.Act,
        id: +row.id,
        minutes: +row.minutes,
        days: +row.days,
        total_minutes: +row.total_minutes,
        date: parseTime(row.date)
    }));
  
    return data;
}

function formatTime(minutes) {
    const date = new Date(2000, 0, 1, 0, minutes); // Set hours & minutes
    return date.toLocaleString('en-US', { timeStyle: 'short' }); // Format as HH:MM AM/PM
}

function dropboxFiltering() {
    const proestrus = [1, 5, 9, 13];
    const estrus = [2, 6, 10, 14];
    const metestrus = [3, 7, 11];
    const diestrus = [4, 8, 12];
    const select = document.getElementById("dropbox-select");
    const selectedValue = select.value;
    if (selectedValue === 'o1') {
        for (let i = 1; i <= 13; i++){
            document.getElementById(`f${i}`).checked = true;
            if (estrus.includes(i)) {
                document.getElementById(`p${i}`).checked = true;
                document.getElementById(`g${i}`).checked = false;
            }
            else {
                document.getElementById(`p${i}`).checked = false;
                document.getElementById(`g${i}`).checked = true;
            }
        }
        document.getElementById("p14").checked = true;
        document.getElementById("g14").checked = false;
    } else if (selectedValue === 'o2') {
        for (let i = 1; i <= 13; i++){
            document.getElementById(`f${i}`).checked = true;
            if (diestrus.includes(i)) {
                document.getElementById(`p${i}`).checked = true;
                document.getElementById(`g${i}`).checked = false;
            }
            else if (proestrus.includes(i)) {
                document.getElementById(`p${i}`).checked = false;
                document.getElementById(`g${i}`).checked = true;
            }
            else {
                document.getElementById(`p${i}`).checked = false;
                document.getElementById(`g${i}`).checked = false;
            }
        }
        document.getElementById("p14").checked = false;
        document.getElementById("g14").checked = false;
    } else {
        for (let i = 1; i <= 13; i++){
            document.getElementById(`f${i}`).checked = false;
            document.getElementById(`p${i}`).checked = false;
            document.getElementById(`g${i}`).checked = false;
        }
        document.getElementById("p14").checked = false;
        document.getElementById("g14").checked = false;
    }
}

export function filterByMinute(data, dateVal, useZScore = false) {
    const minuteIndex = dateVal.getHours()*60 + dateVal.getMinutes();

    const femaleIds = [...document.querySelectorAll('#mouse-selector input:checked')]
                      .map(cb => +cb.id.slice(1));
    const line1Days = [...document.querySelectorAll('#pink  input:checked')].map(cb => +cb.id.slice(1));
    const line2Days = [...document.querySelectorAll('#green input:checked')].map(cb => +cb.id.slice(1));

    const dots   = [];
    const unique = [];
    
    let stats = {};
    if (useZScore) {
        stats = d3.rollups(
            data,
            v => ({
                tMean : d3.mean(v, d => d.Temp),
                tStd  : d3.deviation(v, d => d.Temp) || 1,
                aMean : d3.mean(v, d => d.Act),
                aStd  : d3.deviation(v, d => d.Act) || 1
            }),
            d => d.id
        ).reduce((obj,[id,s]) => (obj[id]=s,obj),{});
    }

    data.forEach(row => {
        if ( row.minutes === minuteIndex &&
             femaleIds.includes(row.id) &&
             ( line1Days.includes(row.days+1) || line2Days.includes(row.days+1) ) ) {

            const rec = useZScore
              ? {
                    ...row,
                    Temp : (row.Temp - stats[row.id].tMean)/stats[row.id].tStd,
                    Act  : (row.Act  - stats[row.id].aMean)/stats[row.id].aStd
                }
              : row;

            dots.push(rec);
            if (!unique.includes(row.id)) unique.push(row.id);
        }
    });

    return [dots, unique];
}





function filtering(data) {
    const femaleSelected = document.querySelectorAll('#mouse-selector input[type="checkbox"]');
    const femaleIds = [];
    femaleSelected.forEach(f => {
        if (f.checked){
            femaleIds.push(+f.id.slice(1));
        } 
    });

    const line1Selected = document.querySelectorAll('#pink input[type="checkbox"]');
    const line1Days = [];
    line1Selected.forEach(p => {
        if (p.checked){
            line1Days.push(+p.id.slice(1));
        }
    });

    const line2Selected = document.querySelectorAll('#green input[type="checkbox"]');
    const line2Days = [];
    line2Selected.forEach(g => {
        if (g.checked){
            line2Days.push(+g.id.slice(1));
        }
    });
    
    let line1 = [];
    let line2 = [];
    data.forEach((row) => {
        if (femaleIds.includes(row.id) && line1Days.includes(row.days + 1)){
            line1.push(row);
        }
        if (femaleIds.includes(row.id) && line2Days.includes(row.days + 1)){
            line2.push(row);
        }
    });

    let group1 = d3.rollups(
        line1, 
        (v) => ({
            avg_temp: d3.mean(v, d => d.Temp),
            avg_act: d3.mean(v, d => d.Act)
        }),
        (d) => +d.minutes
    );
    let map1 = group1.map(([groups, values]) => {
        return {
            minutes: groups,
            avg_temp: values.avg_temp,
            avg_act: values.avg_act,
            date: new Date(2000, 0, 1, 0, groups)
        }
    });

    let group2 = d3.rollups(
        line2, 
        (v) => ({
            avg_temp: d3.mean(v, d => d.Temp),
            avg_act: d3.mean(v, d => d.Act)
        }),
        (d) => +d.minutes
    );
    let map2 = group2.map(([groups, values]) => {
        return {
            minutes: groups,
            avg_temp: values.avg_temp,
            avg_act: values.avg_act,
            date: new Date(2000, 0, 1, 0, groups)
        }
    });

    return [map1, map2];
}

export function renderScatterplot([dots, uniqueMouseIds], useZScore) {
    let mouseColorMap = {
        1: '#FDC6E6', 2: '#fdebda', 3: '#FFACAB', 4: '#ABFCFE', 5: '#a4cbb6',
        6: '#FFF6BA', 7: '#FFCEA2', 8: '#d0d0d0', 9: '#C4D1FE', 10: '#E4FEBD',
        11: '#cdc0b3', 12: '#D1FFE9', 13: '#DDC4FC'
    };

    mouseColorMap = Object.fromEntries(
        Object.entries(mouseColorMap).filter(([key]) => uniqueMouseIds.includes(+key))
    );

    // Get the phase for each day
    const phaseMap = {
        0: 'Unknown',
        1: 'Proestrus', 5: 'Proestrus', 9: 'Proestrus', 13: 'Proestrus',
        2: 'Estrus', 6: 'Estrus', 10: 'Estrus', 14: 'Estrus',
        3: 'Metestrus', 7: 'Metestrus', 11: 'Metestrus',
        4: 'Diestrus', 8: 'Diestrus', 12: 'Diestrus'
    };

    const width = 1000;
    const height = 350;
    const margin = { top: 40, right: 150, bottom: 50, left: 60 }; // Increased margins
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    // Calculate the extent of the data with padding
    const xExtent = d3.extent(dots, d => d.Act);
    const yExtent = d3.extent(dots, d => d.Temp);
    
    // Add 10% padding to the domain to ensure points don't hit the edges
    const xPadding = (xExtent[1] - xExtent[0]) * 0.05;
    const yPadding = (yExtent[1] - yExtent[0]) * 0.05;
    
    const xScale = d3.scaleLinear()
        .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
        .nice()
        .range([usableArea.left, usableArea.right]);
    
    const yScale = d3.scaleLinear()
        .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
        .nice()
        .range([usableArea.bottom, usableArea.top]);

    // Clear previous SVG content
    d3.select('#scatterplot').selectAll("*").remove();
    
    const svg = d3
        .select('#scatterplot')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    // Add a title to the scatterplot
    const timeFmt = d3.timeFormat("%-I:%M %p");
    svg.append("text")
        .attr("class", "chart-title")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text(`Mouse Data at ${timeFmt(timeSlide.value())} (${useZScore ? "Z-Score Normalized" : "Raw Values"})`);


    // Add background for better visibility
    svg.append("rect")
        .attr("x", usableArea.left)
        .attr("y", usableArea.top)
        .attr("width", usableArea.width)
        .attr("height", usableArea.height)
        .attr("fill", "#f9f9f9")
        .attr("stroke", "#ddd")
        .attr("stroke-width", 0.5);

    // X Grid lines
    svg.append("g")
        .attr("class", "x-grid")
        .attr("transform", `translate(0,${usableArea.bottom})`)
        .call(
            d3.axisBottom(xScale)
                .tickSize(-usableArea.height)
                .tickFormat("")
        )
        .selectAll("line")
        .attr("stroke", "rgba(0,0,0,0.1)");

    // Y Grid lines
    svg.append("g")
        .attr("class", "y-grid")
        .attr("transform", `translate(${usableArea.left},0)`)
        .call(
            d3.axisLeft(yScale)
                .tickSize(-usableArea.width)
                .tickFormat("")
        )
        .selectAll("line")
        .attr("stroke", "rgba(0,0,0,0.1)");

    svg.selectAll(".x-grid path, .y-grid path").remove();

    const tooltip = d3.select("#tooltip");

    // Calculate jitter amount based on domain size (smaller jitter for z-scores)
    const xJitterAmount = useZScore ? 0.05 : 1;
    const yJitterAmount = useZScore ? 0.05 : 0.1;

    svg.selectAll("circle")
        .data(dots)
        .join("circle")
        .attr("cx", d => {
            // Apply appropriate jitter based on whether we're using z-scores
            const jitter = (Math.random() - 0.5) * xJitterAmount;
            const value = d.Act + jitter;
            // Ensure the point stays within bounds
            return xScale(Math.max(xExtent[0] - xPadding/2, Math.min(value, xExtent[1] + xPadding/2)));
        })
        .attr("cy", d => {
            // Apply appropriate jitter based on whether we're using z-scores
            const jitter = (Math.random() - 0.5) * yJitterAmount;
            const value = d.Temp + jitter;
            // Ensure the point stays within bounds
            return yScale(Math.max(yExtent[0] - yPadding/2, Math.min(value, yExtent[1] + yPadding/2)));
        })
        .attr("r", 5)
        .attr("fill", d => mouseColorMap[d.id])
        .style("fill-opacity", 0.7)
        .style("stroke", "#333")  // Add border
        .style("stroke-width", 0.5)
        .on("mouseenter", (event, d) => {
            d3.select(event.currentTarget)
                .style("fill-opacity", 1)
                .attr("r", 7)
                .style("stroke-width", 1.5);

            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`
                <div style="background-color: ${mouseColorMap[d.id]}; color: white; padding: 4px 8px; margin-bottom: 4px; border-radius: 3px;">
                    <strong>Mouse ${d.id}</strong>
                </div>
                <strong>Day:</strong> ${d.days + 1} (${phaseMap[d.days + 1] || 'Unknown Phase'})<br>
                <strong>Time:</strong> ${formatTime(d.minutes)}<br>
                <strong>Temperature:</strong> ${d.Temp.toFixed(2)}${useZScore ? ' (z-score)' : ' °C'}<br>
                <strong>Activity:</strong> ${d.Act.toFixed(2)}${useZScore ? ' (z-score)' : ''}
            `).style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px")
              .style("box-shadow", "0px 2px 5px rgba(0,0,0,0.2)");
        })
        .on("mouseleave", (event) => {
            d3.select(event.currentTarget)
                .style("fill-opacity", 0.7)
                .attr("r", 5)
                .style("stroke-width", 0.5);
            tooltip.transition().duration(300).style("opacity", 0);
        });

    // Axes with better formatting
    svg.append("g")
        .attr("transform", `translate(0,${usableArea.bottom})`)
        .call(d3.axisBottom(xScale).ticks(10))
        .call(g => g.select(".domain").attr("stroke", "#333").attr("stroke-width", 1.5));

    svg.append("g")
        .attr("transform", `translate(${usableArea.left},0)`)
        .call(d3.axisLeft(yScale).ticks(8))
        .call(g => g.select(".domain").attr("stroke", "#333").attr("stroke-width", 1.5));

    // Labels with better positioning
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", usableArea.left + usableArea.width / 2)
        .attr("y", height - 10)
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text(useZScore ? "Z-Scored Activity" : "Activity");

    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", `rotate(-90)`)
        .attr("x", -usableArea.top - usableArea.height / 2)
        .attr("y", 15)
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text(useZScore ? "Z-Scored Temperature" : "Temperature (°C)");

    // Legend with improved styling - moved to the right side
    const legendBg = svg.append("rect")
        .attr("x", usableArea.right + 10)
        .attr("y", usableArea.top)
        .attr("width", 130)
        .attr("height", Object.keys(mouseColorMap).length * 20 + 30)
        .attr("fill", "white")
        .attr("stroke", "#ccc")
        .attr("stroke-width", 1)
        .attr("rx", 5)
        .attr("ry", 5);

    const legendTitle = svg.append("text")
        .attr("x", usableArea.right + 70)
        .attr("y", usableArea.top + 15)
        .attr("text-anchor", "middle")
        .text("Mouse Legend")
        .style("font-size", "12px")
        .style("font-weight", "bold");

    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${usableArea.right + 20}, ${usableArea.top + 30})`);

    Object.entries(mouseColorMap).forEach(([id, color], i) => {
        const g = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
        g.append("circle")
            .attr("r", 5)
            .attr("fill", color)
            .style("stroke", "#333")
            .style("stroke-width", 0.5);
        g.append("text")
            .attr("x", 15)
            .attr("y", 5)
            .text(`No. ${id}`)
            .style("font-size", "11px");
    });
}


function renderLinePlot(data){
    const width = 1000;
    const height = 500;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };

    let minAvgAct = 0;
    let maxAvgAct = 70;
    let minAvgTemp = 35;
    let maxAvgTemp = 40;
    let max0Act = d3.max(data[0], d => d.avg_act) ?? 0;
    let max1Act = d3.max(data[1], d => d.avg_act) ?? 0;
    if (maxAvgAct < max0Act || maxAvgAct < max1Act){
        if (max0Act > max1Act){
            maxAvgAct = max0Act;
        }
        else {
            maxAvgAct = max1Act;
        }
    }
    [map1, map2] = data; 
    svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');
    const usableArea = {
        top: margin.top,
        right: (width / 2) - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: (width / 2) - margin.left - margin.right,
        height: (height / 2) - margin.top - margin.bottom,
    };
    xScale = d3
        .scaleTime()
        .domain([startOfDay, endOfDay])
        .range([usableArea.left, usableArea.right])
        .nice();
    yScale = d3.scaleLinear().domain([minAvgAct, maxAvgAct]).range([usableArea.bottom, usableArea.top]);
    svg.append("g")
        .attr("transform", `translate(0,${usableArea.bottom})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%H:%M")));
    svg.append("g")
        .attr("transform", `translate(${usableArea.left},0)`)
        .call(d3.axisLeft(yScale));
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", usableArea.left + usableArea.width / 2)
        .attr("y", height - 5)
        .text("24-Hour Time (HH:MM)");
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", `rotate(-90)`)
        .attr("x", -height/2)
        .attr("y", 10) // To the left of the y-axis
        .text("Average Activity Level");
    svg.append("text")
        .attr("class", "chart-title")
        .attr("text-anchor", "middle")
        .attr("x", usableArea.left + usableArea.width / 2)
        .attr("y", usableArea.top / 2)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text(`Average Activity Level By Time`);

    const usableArea2 = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: (width / 2) + margin.left,
        width: (width / 2) - margin.left - margin.right,
        height: (height / 2) - margin.top - margin.bottom,
    };
    xScale2 = d3
        .scaleTime()
        .domain([startOfDay, endOfDay])
        .range([usableArea2.left, usableArea2.right])
        .nice();

    yScale2 = d3
        .scaleLinear()
        .domain([minAvgTemp, maxAvgTemp])
        .range([usableArea2.bottom, usableArea2.top]);
    svg.append("g")
        .attr("transform", `translate(0,${usableArea2.bottom})`)
        .call(d3.axisBottom(xScale2).tickFormat(d3.timeFormat("%H:%M")));
    svg.append("g")
        .attr("transform", `translate(${usableArea2.left},0)`)
        .call(d3.axisLeft(yScale2));
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", usableArea2.left + usableArea2.width / 2)
        .attr("y", height - 5)
        .text("24-Hour Time (HH:MM)");
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", `rotate(-90)`)
        .attr("x", -height/2)
        .attr("y", 5 + width/2) 
        .text("Average Temperature");
    svg.append("text")
        .attr("class", "chart-title")
        .attr("text-anchor", "middle")
        .attr("x", usableArea2.left + usableArea2.width / 2)
        .attr("y", usableArea2.top / 2)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text(`Average Temperature By Time`);
    yScale.ticks(13).forEach(tickValue =>
        svg.append("line")
            .attr("class", "grid-line")
            .attr("x1", usableArea.left)
            .attr("x2", usableArea.right)
            .attr("y1", yScale(tickValue))
            .attr("y2", yScale(tickValue))
            .attr("stroke", "rgba(0,0,0,0.1)")
            .attr("stroke-width", 1)
    );
    
    yScale2.ticks(9).forEach(tickValue =>
        svg.append("line")
            .attr("class", "grid-line")
            .attr("x1", usableArea2.left)
            .attr("x2", usableArea2.right)
            .attr("y1", yScale2(tickValue))
            .attr("y2", yScale2(tickValue))
            .attr("stroke", "rgba(0,0,0,0.1)") 
            .attr("stroke-width", 1)
    );
    
    const lineAct = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.avg_act));
    const lineTemp = d3.line()
        .x(d => xScale2(d.date))
        .y(d => yScale2(d.avg_temp));
    
    if (data[0].length !== 0){
        svg.append("path")
            .datum(data[0])
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", '#ffb6c1')
            .attr("opacity", '0.7')
            .attr("stroke-width", 2)
            .attr("d", lineAct)
            .on("click", function(event, d) {
                d3.selectAll(".line").attr("stroke-width", 2);
                d3.select(this).raise().attr("stroke-width", 3);
                focusGroup.raise();
            });
        svg.append("path")
            .datum(data[0])
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", '#ffb6c1')
            .attr("opacity", 0.7)
            .attr("stroke-width", 2)
            .attr("d", lineTemp)
            .on("click", function(event, d) {
                d3.selectAll(".line").attr("stroke-width", 2);
                d3.select(this).raise().attr("stroke-width", 3);
                focusGroup.raise();
            });
    }
    if (data[1].length !== 0){
        svg.append("path")
            .datum(data[1])
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", '#198754')
            .attr("opacity", '0.7')
            .attr("stroke-width", 2)
            .attr("d", lineAct)
            .on("click", function(event, d) {
                d3.selectAll(".line").attr("stroke-width", 2);
                d3.select(this).raise().attr("stroke-width", 3);
                focusGroup.raise();
            });
        svg.append("path")
            .datum(data[1])
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", '#198754')
            .attr("opacity", '0.7')
            .attr("stroke-width", 2)
            .attr("d", lineTemp)
            .on("click", function(event, d) {
                d3.selectAll(".line").attr("stroke-width", 2);
                d3.select(this).raise().attr("stroke-width", 3);
                focusGroup.raise();
            });
    }

    focusGroup = svg.append("g").attr("class", "focus");

    svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "transparent")
    .style("pointer-events", "all")
    .lower()
    .on("click", function() {
        d3.selectAll(".line").attr("stroke-width", 2);
    });

    // left line
    leftCursor = focusGroup.append("line")
        .attr("class", "cursor-left")
        .attr("y1", margin.top)
        .attr("y2", height - margin.bottom)
        .attr("stroke", "#444")
        .attr("stroke-dasharray", "3,3");

    // right line
    rightCursor = focusGroup.append("line")
        .attr("class", "cursor-right")
        .attr("y1", margin.top)
        .attr("y2", height - margin.bottom)
        .attr("stroke", "#444")
        .attr("stroke-dasharray", "3,3");

    

    leftCursor
        .attr("x1", xScale(startOfDay))
        .attr("x2", xScale(startOfDay));

    rightCursor
        .attr("x1", xScale2(startOfDay))    
        .attr("x2", xScale2(startOfDay));
    

    actDot1  = focusGroup.append("circle").attr("r", 4).attr("fill", "black").style("visibility", "hidden");;   
    tempDot1 = focusGroup.append("circle").attr("r", 4).attr("fill", "black").style("visibility", "hidden");;   
    actDot2  = focusGroup.append("circle").attr("r", 4).attr("fill", "black").style("visibility", "hidden");;  
    tempDot2 = focusGroup.append("circle").attr("r", 4).attr("fill", "black").style("visibility", "hidden");;

    actLabel1  = focusGroup.append("text")
              .attr("class","tooltip").style("font-size","10px")
              .style("visibility","visible");
    tempLabel1 = focusGroup.append("text")
                .attr("class","tooltip").style("font-size","10px")
                .style("visibility","visible");
    actLabel2  = focusGroup.append("text")
                .attr("class","tooltip").style("font-size","10px")
                .style("visibility","visible");
    tempLabel2 = focusGroup.append("text")
                .attr("class","tooltip").style("font-size","10px")
                .style("visibility","visible");
    
}

export function updateFocus(time) {
  if (!focusGroup) return;          
    const hasPink  = map1.length   > 0;
    const hasGreen = map2.length   > 0;
  const xLeft  = xScale(time);
  const xRight = xScale2(time);
  leftCursor
    .attr("x1", xLeft)
    .attr("x2", xLeft);  

    rightCursor
    .attr("x1", xRight)
    .attr("x2", xRight);

 
  const bisect = d3.bisector(d => d.date).left;
  if (hasPink){
  const i1   = bisect(map1, time, 1);
  const dL   = map1[i1 - 1], dR = map1[i1] || dL;
  const d    = (time - dL.date) < (dR.date - time) ? dL : dR;

  const cxL = xLeft,  cyL = yScale(d.avg_act);
  const cxR = xRight, cyR = yScale2(d.avg_temp);

  actDot1 .attr("cx", cxL).attr("cy", cyL);
  tempDot1.attr("cx", cxR).attr("cy", cyR);

  placeLabel(actLabel1 , cxL, cyL,
             d.avg_act.toFixed(1),               
             hasGreen ? "bottom-right":"bottom-right");  

  placeLabel(tempLabel1, cxR, cyR,
             d.avg_temp.toFixed(2) + "°C",
             hasGreen ? "bottom-right":"bottom-right");
} else {
  actLabel1 .style("visibility","hidden");
  tempLabel1.style("visibility","hidden");
}


if (hasGreen){
  const i2   = bisect(map2, time, 1);
  const gL   = map2[i2 - 1], gR = map2[i2] || gL;
  const g    = (time - gL.date) < (gR.date - time) ? gL : gR;

  const cxL = xLeft,  cyL = yScale(g.avg_act);
  const cxR = xRight, cyR = yScale2(g.avg_temp);

  actDot2 .attr("cx", cxL).attr("cy", cyL);
  tempDot2.attr("cx", cxR).attr("cy", cyR);

  placeLabel(actLabel2 , cxL, cyL,
             g.avg_act.toFixed(1),
             hasPink ? "top-left":"bottom-right");   
  placeLabel(tempLabel2, cxR, cyR,
             g.avg_temp.toFixed(2) + "°C",
             hasPink ? "top-left":"bottom-right");
} else {
  actLabel2 .style("visibility","hidden");
  tempLabel2.style("visibility","hidden");
}
}

dropboxFiltering();
export let data = await loadData();
renderLinePlot(filtering(data));
renderScatterplot(filterByMinute(data, startOfDay));

const initDate = startOfDay;                                 // a Date(2000-01-01 00:00)

updateFocus(initDate);                                      

const useZ = document.getElementById('zscoreToggle')?.checked ?? false;
renderScatterplot( filterByMinute(data, initDate, useZ), useZ );

d3.select('#time-label').text( d3.timeFormat("%-I:%M %p")(initDate) );

document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        d3.select("#chart").selectAll("*").remove();
        d3.select("#scatterplot").selectAll("*").remove();
        document.getElementById("dropbox-select").value = "o3";
        const currTime = timeSlide.value();
        renderLinePlot(filtering(data));  
        updateFocus(currTime); 
        const useZ     = document.getElementById('zscoreToggle').checked;
        renderScatterplot( filterByMinute(data, currTime, useZ), useZ );


    });
});

const dropboxSelect = document.querySelector('#dropbox-select');
dropboxSelect.addEventListener('change', () => {
    d3.select("#chart").selectAll("*").remove();
    d3.select("#scatterplot").selectAll("*").remove();
    dropboxFiltering();
    renderLinePlot(filtering(data));
    const currTime = timeSlide.value();
    updateFocus(currTime);
    const useZ = document.getElementById('zscoreToggle').checked;
    renderScatterplot( filterByMinute(data, currTime, useZ), useZ );

});

function placeLabel(label, cx, cy, text, where){
    const dx = 6, dy = 6;          
    if (where === "top-left"){
        label.attr("x", cx - dx).attr("y", cy - dy);
    } else { 
        label.attr("x", cx + dx).attr("y", cy + dy + 8); 
    }
    label.text(text).style("visibility","visible");
}