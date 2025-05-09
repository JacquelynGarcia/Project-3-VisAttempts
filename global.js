import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
    const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
    const data = await d3.csv('mouse.csv', (row) => ({
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

function renderLinePlot(data){
    const width = 1000;
    const height = 300;
    const margin = { top: 10, right: 10, bottom: 10, left: 10 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    let groupByDay = d3.rollups(
        data,
        (v) => ({
            avg_temp: d3.mean(v, d => d.Temp),
            avg_act: d3.mean(v, d => d.Act)
        }),
        (d) => [d.days, d.minutes]
    );

    let mapDay = groupByDay.map(([groups, values]) => {
        return {
            days: groups[0],
            minutes: groups[1],
            avg_temp: values.avg_temp,
            avg_act: values.avg_act,
            dates: new Date(2025, 0, groups[0], 0, groups[1])
        }
    });

    let groupByHour = d3.rollups(
        data, 
        (v) => ({
            avg_temp: d3.mean(v, d => d.Temp),
            avg_act: d3.mean(v, d => d.Act)
        }),
        (d) => [d.minutes]
    );

    let mapHour = groupByHour.map(([groups, values]) => {
        return {
            minutes: groups[0],
            avg_temp: values.avg_temp,
            avg_act: values.avg_act,
            dates: new Date(2025, 0, 1, 0, groups[0])
        }
    });

    console.log(groupByHour);
    console.log(mapHour);

    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    const xScale = d3
        .scaleTime()
        .domain(d3.extent(data, (d) => d.date))
        .range([usableArea.left, usableArea.right])
        .nice();
    const yScale = d3.scaleLinear().domain([0, 150]).range([usableArea.bottom, usableArea.top]);

    const lineTemp = d3.line()
        .x(d => xScale(d.dates))
        .y(d => yScale(d.avg_temp));

    const lineAct = d3.line()
        .x(d => xScale(d.dates))
        .y(d => yScale(d.avg_act));

    svg.append("path")
        .datum(mapDay)
        .attr("fill", "none")
        .attr("stroke", 'steelblue') // one color for temp
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "0") // solid line
        .attr("d", lineTemp);

    svg.append("path")
        .datum(mapDay)
        .attr("fill", "none")
        .attr("stroke", 'orange')
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4,2") // dashed line for act
        .attr("d", lineAct);
    
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%d")));
      
    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale));
}

let data = await loadData();
let femaleData = data.filter((row) => {
    return row.gender === 'female'
});
renderLinePlot(femaleData);

let query = '';
let searchInput = document.querySelector('#searchBar');
searchInput.addEventListener('change', (event) => {
    query = event.target.value;
    let filteredData = data.filter((d) => {
        let values = query.split(', ');
        return values.includes(query.toLowerCase());
    });
    renderLinePlot(filteredData);
});