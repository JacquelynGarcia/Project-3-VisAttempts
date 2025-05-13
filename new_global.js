import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const startOfDay = new Date(2000, 0, 1, 0, 0);   // 00:00
const endOfDay = new Date(2000, 0, 1, 23, 59);   // 23:59

async function loadData() {
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
/*
function filterByMinute(data) {
    const slider = document.getElementById('minuteSlider');

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

    let dots = [];
    let unique = [];
    data.forEach((row) => {
        if (+row.minutes === +slider.value && femaleIds.includes(row.id) && (line1Days.includes(row.days + 1) || line2Days.includes(row.days + 1))){
            dots.push(row);
            if (!unique.includes(+row.id)){
                unique.push(+row.id);
            }
        }
    });

    return [dots, unique];
}
*/

///New version with Z-score normalization + raw data
function filterByMinute(data, useZScore = true) {
    const slider = document.getElementById('minuteSlider');
    const femaleSelected = document.querySelectorAll('#mouse-selector input[type="checkbox"]');
    const femaleIds = Array.from(femaleSelected).filter(f => f.checked).map(f => +f.id.slice(1));

    const line1Days = Array.from(document.querySelectorAll('#pink input[type="checkbox"]'))
        .filter(p => p.checked).map(p => +p.id.slice(1));
    const line2Days = Array.from(document.querySelectorAll('#green input[type="checkbox"]'))
        .filter(g => g.checked).map(g => +g.id.slice(1));

    let dots = [], unique = [];

    if (!useZScore) {
        data.forEach((row) => {
            if (+row.minutes === +slider.value &&
                femaleIds.includes(row.id) &&
                (line1Days.includes(row.days + 1) || line2Days.includes(row.days + 1))) {
                dots.push(row);
                if (!unique.includes(+row.id)) unique.push(+row.id);
            }
        });
    } else {
        const dataCopy = data.map(d => ({ ...d }));
        const stats = {};
        d3.groups(dataCopy, d => d.id).forEach(([id, rows]) => {
            stats[id] = {
                tempMean: d3.mean(rows, d => d.Temp),
                tempStd: d3.deviation(rows, d => d.Temp) || 1,
                actMean: d3.mean(rows, d => d.Act),
                actStd: d3.deviation(rows, d => d.Act) || 1,
            };
        });

        dataCopy.forEach((row) => {
            if (+row.minutes === +slider.value &&
                femaleIds.includes(row.id) &&
                (line1Days.includes(row.days + 1) || line2Days.includes(row.days + 1))) {
                dots.push({
                    ...row,
                    Temp: (row.Temp - stats[row.id].tempMean) / stats[row.id].tempStd,
                    Act: (row.Act - stats[row.id].actMean) / stats[row.id].actStd
                });
                if (!unique.includes(+row.id)) unique.push(+row.id);
            }
        });
    }

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

function renderScatterplot([dots, uniqueMouseIds], useZScore) {
    let mouseColorMap = {
        1: '#8dd3c7', 2: '#9c755f', 3: '#bebada', 4: '#fb8072', 5: '#80b1d3',
        6: '#fdb462', 7: '#b3de69', 8: '#fccde5', 9: '#bab0ab', 10: '#bc80bd',
        11: '#ccebc5', 12: '#ffed6f', 13: '#816b01'
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
    svg.append("text")
        .attr("class", "chart-title")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text(`Mouse Data at ${formatTime(+document.getElementById('minuteSlider').value)} (${useZScore ? "Z-Score Normalized" : "Raw Values"})`);

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
            .text(`Mouse ${id}`)
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
    
    const svg = d3
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
    const xScale = d3
        .scaleTime()
        .domain([startOfDay, endOfDay])
        .range([usableArea.left, usableArea.right])
        .nice();
    const yScale = d3.scaleLinear().domain([minAvgAct, maxAvgAct]).range([usableArea.bottom, usableArea.top]);
    

    const usableArea2 = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: (width / 2) + margin.left,
        width: (width / 2) - margin.left - margin.right,
        height: (height / 2) - margin.top - margin.bottom,
    };
    const xScale2 = d3
        .scaleTime()
        .domain([startOfDay, endOfDay])
        .range([usableArea2.left, usableArea2.right])
        .nice();
    const yScale2 = d3.scaleLinear().domain([minAvgTemp, maxAvgTemp]).range([usableArea2.bottom, usableArea2.top]);

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
            .attr("stroke", 'pink')
            .attr("stroke-width", 2)
            .attr("d", lineAct);
        svg.append("path")
            .datum(data[0])
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", 'pink')
            .attr("stroke-width", 2)
            .attr("d", lineTemp);
    }
    if (data[1].length !== 0){
        svg.append("path")
            .datum(data[1])
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", 'green')
            .attr("stroke-width", 2)
            .attr("d", lineAct);
        svg.append("path")
            .datum(data[1])
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", 'green')
            .attr("stroke-width", 2)
            .attr("d", lineTemp);
    }

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
        .text("Average Temperature (°C)");

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
        .text("Average Activity");
}


dropboxFiltering();

let data = await loadData();
renderLinePlot(filtering(data));
renderScatterplot(filterByMinute(data, document.getElementById("zscoreToggle").checked));

document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        d3.select("#chart").selectAll("*").remove();
        d3.select("#scatterplot").selectAll("*").remove();
        document.getElementById("dropbox-select").value = "o3";
        renderLinePlot(filtering(data));

        const useZ = document.getElementById("zscoreToggle").checked;
        renderScatterplot(filterByMinute(data, useZ), useZ);
    });
});;

const dropboxSelect = document.querySelector('#dropbox-select');
dropboxSelect.addEventListener('change', () => {
    d3.select("#chart").selectAll("*").remove();
    d3.select("#scatterplot").selectAll("*").remove();
    dropboxFiltering();
    renderLinePlot(filtering(data));

    const useZ = document.getElementById("zscoreToggle").checked;
    renderScatterplot(filterByMinute(data, useZ), useZ);
});;

const slider = document.getElementById('minuteSlider');
slider.addEventListener('input', () => {
    d3.select("#minuteLabel").text(formatTime(slider.value));
    d3.select("#scatterplot").selectAll("*").remove();

    const useZ = document.getElementById("zscoreToggle").checked;
    renderScatterplot(filterByMinute(data, useZ), useZ);
});

// Z-score toggle
document.getElementById("zscoreToggle").addEventListener("change", () => {
    const useZ = document.getElementById("zscoreToggle").checked;
    d3.select("#scatterplot").selectAll("*").remove();
    renderScatterplot(filterByMinute(data, useZ), useZ);
});

// let query = '';
// let searchInput = document.querySelector('#searchBar');
// searchInput.addEventListener('change', (event) => {
//     query = event.target.value;
//     let filteredData = data.filter((d) => {
//         let values = query.split(', ');
//         return values.includes(query.toLowerCase());
//     });
//     renderLinePlot(filteredData);
// });