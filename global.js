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
    let line1 = data.filter((row) => {
        return (femaleIds.includes(row.id)) && (line1Days.includes(row.days + 1));
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

    const line2Selected = document.querySelectorAll('#green input[type="checkbox"]');
    const line2Days = [];
    line2Selected.forEach(g => {
        if (g.checked){
            line2Days.push(+g.id.slice(1));
        }
    });
    let line2 = data.filter((row) => {
        return (femaleIds.includes(row.id)) && (line2Days.includes(row.days + 1))
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

function renderLinePlot(data){
    const width = 1000;
    const height = 500;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    
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
    const yScale = d3.scaleLinear().domain([0, 70]).range([usableArea.bottom, usableArea.top]);

    /* Graph Lines for first line plot */
    yScale.ticks(13)
        .forEach(tickValue =>
            svg.append("line")
                .attr("class", "grid-line")
                .attr("x1", usableArea.left)
                .attr("x2", usableArea.right)
                .attr("y1", yScale(tickValue))
                .attr("y2", yScale(tickValue))
                .attr("stroke", "#eee")
                .attr("stroke-width", 1)
        );

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
    
    /* brushing for activity plot */
    const brushActivity = d3.brushX()
        .extent([[usableArea.left, usableArea.top], [usableArea.right, usableArea.bottom]])
        .on("brush", brushedActivity);
    svg.append("g")
        .attr("class", "brush")
        .call(brushActivity);

    function brushedActivity(event) {
        const selection = event.selection;
        if (selection) {
            const [x0, x1] = selection.map(xScale.invert);
            highlightHeatmap(x0, x1);
        } else {
            resetHeatmapHighlighting();
        }
    }

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
    const yScale2 = d3.scaleLinear().domain([35, 40]).range([usableArea2.bottom, usableArea2.top]);

    /* Graph Lines for activity plot */
    yScale2.ticks(9)
        .forEach(tickValue =>
            svg.append("line")
                .attr("class", "grid-line")
                .attr("x1", usableArea2.left)
                .attr("x2", usableArea2.right)
                .attr("y1", yScale2(tickValue))
                .attr("y2", yScale2(tickValue))
                .attr("stroke", "#eee")
                .attr("stroke-width", 1)
        );

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

        /** Brush for temperature plot */
    const brushTemperature = d3.brushX()
        .extent([[usableArea2.left, usableArea2.top], [usableArea2.right, usableArea2.bottom]])
        .on("brush", brushedTemperature);
    svg.append("g")
        .attr("class", "brush")
        .call(brushTemperature);
    
    function brushedTemperature(event) {
        const selection = event.selection;
        if (selection) {
            const [x0, x1] = selection.map(xScale2.invert);
            highlightHeatmap(x0, x1);
        } else {
            resetHeatmapHighlighting();
        }
    }  
        
    }
}

let data = await loadData();
renderLinePlot(filtering(data));

document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        d3.select("#chart").selectAll("*").remove();
        renderLinePlot(filtering(data));
    });
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