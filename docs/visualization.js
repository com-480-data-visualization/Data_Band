import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm"

const cityCoords = {
    "London": { lat: 51.5074, lon: -0.1278 },
    "Mumbai": { lat: 19.0760, lon: 72.8777 },
    "New York": { lat: 40.7128, lon: -74.0060 },
    "Sydney": { lat: -33.8688, lon: 151.2093 },
    "Tokyo": { lat: 35.6895, lon: 139.6917 },
    "Zürich": { lat: 47.3769, lon: 8.5417 },
    "Paris": { lat: 48.8566, lon: 2.3522 },
    "Berlin": { lat: 52.5200, lon: 13.4050 },
    "Dubai": { lat: 25.2048, lon: 55.2708 },
    "Singapore": { lat: 1.3521, lon: 103.8198 },
    "São Paulo": { lat: -23.5505, lon: -46.6333 },
    "Hong Kong": { lat: 22.3193, lon: 114.1694 }
};

Promise.all([
    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
    d3.csv("https://raw.githubusercontent.com/thetorf/files/main/fraud_dataset.csv")
]).then(([geoData, fraudData]) => {
    drawTS(fraudData)
    console.log("Fraudulent transaction done...")
    choroplethMap(geoData, fraudData)
    console.log("Choropleth map done...")
    drawCityRace(fraudData)
    console.log("City Race done...")
});

function drawTS(fraudData){
    
    const { dates, counts, months, byMonthCity } = parseFraud(fraudData)
    drawTimeSeries(dates, counts)
    //drawMapSlider(months, byMonthCity) //create the bug

    function parseFraud(rows) {
        const fraudByDate = {};
        const fraudByMonthCity = {};
    
        rows.forEach(r => {
          if (r.Fraud_Label !== "1") return;
          const d = new Date(r.Timestamp);
          const day = d.toISOString().slice(0, 10);
        
          fraudByDate[day] = (fraudByDate[day] || 0) + 1;
         
          const month = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
          fraudByMonthCity[month] = fraudByMonthCity[month] || {};
          fraudByMonthCity[month][r.Location] = (fraudByMonthCity[month][r.Location]||0) + 1;
        });
    
        return {
          dates: Object.keys(fraudByDate).sort(),
          counts: Object.keys(fraudByDate).sort().map(d => fraudByDate[d]),
          months: Object.keys(fraudByMonthCity).sort(),
          byMonthCity: fraudByMonthCity
        };
    }
    
    // Plotly Config
    function drawTimeSeries(dates, counts) {
        Plotly.newPlot(
            "fraud-time-chart",
            [{
                x: dates,
                y: counts,
                type: "scatter",
                mode: "lines",
                line: { shape: "spline", width: 2, color: "#e63946" },
                hoverinfo: "x+y"
            }],
            {
                xaxis: { title: "Date" },
                yaxis: { title: "Number of Fraud Cases" },
                margin: { t: 60, l: 60, r: 30, b: 60 },
                plot_bgcolor: "#f9f9f9",
                paper_bgcolor: "#fff"
            },
            { responsive: true }
        );
    }
    
    //Lealet + Slider
    function drawMapSlider(months, dataByMonth) {
        // City → [lat, lon]
        /*const cityCoords = {
            Tokyo: [35.6895, 139.6917],
            "New York": [40.7128, -74.0060],
            Sydney: [-33.8688, 151.2093],
            London: [51.5074, -0.1278],
            Mumbai: [19.0760, 72.8777]
        };*/

        // Initialize map
        const map = L.map("fraud-map").setView([20, 0], 2);
        L.tileLayer(
            "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
            { attribution: "", subdomains: "abcd" }
        ).addTo(map);

        // Slider and label
        const slider = document.getElementById("monthSlider");
        const label  = document.getElementById("selectedMonth");
        slider.max = months.length - 1;
        slider.value = 0;

        let markers = [];

        function updateMonth(idx) {
            // clear old markers
            markers.forEach(m => map.removeLayer(m));
            markers = [];

            const month = months[idx];
            label.textContent = `Month: ${month}`;

            const cityCounts = dataByMonth[month] || {};
            Object.entries(cityCounts).forEach(([city, count]) => {
            const coords = cityCoords[city];
            if (!coords) return;  // skip unknown cities

            const circle = L.circleMarker(coords, {
                radius: Math.sqrt(count) * 1.0,
                fillColor: "#e63946",
                color: "#fff",
                weight: 1,
                fillOpacity: 0.8
            }).addTo(map);

            circle.bindPopup(`<strong>${city}</strong><br>${count} cases`);
            markers.push(circle);
            });
        }

        // Wire up slider event and do initial render
        slider.addEventListener("input", () => updateMonth(+slider.value));
            updateMonth(0);
    }
}

function choroplethMap(geoData, fraudData) {
    const baseWidth = 960;
    const baseHeight = 600;
  
    const svg = d3.select('#svg-vis-choropleth')
      .attr('viewBox', `0 0 ${baseWidth} ${baseHeight}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', 'auto');
  
    svg.selectAll('*').remove();
  
    const projection = d3.geoMercator()
      .scale(150)
      .translate([baseWidth / 2, baseHeight / 1.5]);
    const path = d3.geoPath().projection(projection);
  
    svg.append('g')
      .selectAll('path')
      .data(geoData.features)
      .join('path')
        .attr('d', path)
        .attr('fill', '#eee')
        .attr('stroke', '#999');
  
    const fraudByCityAndAttr = {};
    const uniqueVals = {
      Device_Type: new Set(),
      Merchant_Category: new Set(),
      Card_Type: new Set()
    };
  
    fraudData.forEach(d => {
      if (d.Fraud_Label !== '1') return;
      const city = d.Location;
      if (!cityCoords[city]) return;
      const amt = +d.Transaction_Amount;
      const attrs = {
        Device_Type: d.Device_Type,
        Merchant_Category: d.Merchant_Category,
        Card_Type: d.Card_Type
      };
      fraudByCityAndAttr[`${city}||None||None`] = (fraudByCityAndAttr[`${city}||None||None`] || 0) + amt;
      Object.entries(attrs).forEach(([attr, val]) => {
        uniqueVals[attr].add(val);
        const key = `${city}||${attr}||${val}`;
        fraudByCityAndAttr[key] = (fraudByCityAndAttr[key] || 0) + amt;
      });
    });
  
    function makePoints(attr, val) {
      return Object.entries(fraudByCityAndAttr)
        .filter(([key]) => key.endsWith(`||${attr}||${val}`))
        .map(([key, amt]) => {
          const city = key.split('||')[0];
          return { city, amount: amt, ...cityCoords[city] };
        });
    }
  
    const spikeLayer = svg.append('g').attr('class', 'spikes');
  
    function updateLegend(minAmt, maxAmt, colorScale) {
      svg.selectAll('.legend').remove();
      svg.selectAll('defs').remove();
  
      const defs = svg.append('defs');
      const grad = defs.append('linearGradient').attr('id', 'legend-gradient')
        .attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '0%');
      grad.append('stop').attr('offset', '0%').attr('stop-color', colorScale(minAmt));
      grad.append('stop').attr('offset', '100%').attr('stop-color', colorScale(maxAmt));
  
      const legendWidth = 200;
      const legendHeight = 10;
      const margin = 20;
      svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${baseWidth - legendWidth - margin},${margin})`)
        .call(g => {
          g.append('rect')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .attr('fill', 'url(#legend-gradient)')
            .attr('stroke', '#999');
          const scale = d3.scaleLinear()
            .domain([minAmt, maxAmt])
            .range([0, legendWidth]);
          g.append('g')
            .attr('transform', `translate(0,${legendHeight})`)
            .call(d3.axisBottom(scale).ticks(5).tickFormat(d3.format('.2s')));
        });
    }
  
    function updateSpikes(points) {
      const [minAmt, maxAmt] = d3.extent(points, d => d.amount);
      const colorScale = d3.scaleSequential()
        .domain([minAmt, maxAmt])
        .interpolator(d3.interpolateReds);
      const heightScale = d3.scaleLinear()
        .domain([minAmt, maxAmt])
        .range([20, 100]);
      const widthSpike = 8;
  
      const spikes = spikeLayer.selectAll('g.spike')
        .data(points, d => d.city);
      spikes.exit().remove();
      const enter = spikes.enter().append('g').attr('class', 'spike');
      enter.append('rect').attr('class', 'bar');
      enter.append('ellipse').attr('class', 'cap');
      const all = enter.merge(spikes);
  
      all.attr('transform', d => {
        const [x, y] = projection([d.lon, d.lat]);
        return `translate(${x},${y})`;
      });
  
      all.select('rect.bar')
        .attr('x', -widthSpike / 2)
        .attr('y', d => -heightScale(d.amount))
        .attr('width', widthSpike)
        .attr('height', d => heightScale(d.amount))
        .attr('fill', d => colorScale(d.amount));
  
      all.select('ellipse.cap')
        .attr('cx', 0)
        .attr('cy', d => -heightScale(d.amount))
        .attr('rx', widthSpike / 4)
        .attr('ry', widthSpike / 8)
        .attr('fill', d => colorScale(d.amount));
  
      updateLegend(minAmt, maxAmt, colorScale);
    }
  
    updateSpikes(makePoints('None', 'None'));
  
    const attrSelect = d3.select('#attr-select');
    const valueSelect = d3.select('#value-select');
    const valueLabel = d3.select('#value-label');
  
    attrSelect.on('change', function() {
      const attr = this.value;
      if (attr === 'None') {
        valueSelect.style('display', 'none');
        valueLabel.style('display', 'none');
        updateSpikes(makePoints('None', 'None'));
      } else {
        const vals = Array.from(uniqueVals[attr]).sort();
        valueSelect.selectAll('option').remove();
        valueSelect.selectAll('option')
          .data(vals)
          .join('option')
            .attr('value', d => d)
            .text(d => d);
        valueSelect.style('display', null);
        valueLabel.style('display', null);
        updateSpikes(makePoints(attr, vals[0]));
      }
    });
  
    valueSelect.on('change', function() {
      updateSpikes(makePoints(attrSelect.property('value'), this.value));
    });
  }

/* Columns type : 'Transaction_ID', 'User_ID', 'Transaction_Amount', 'Transaction_Type',
       'Timestamp', 'Account_Balance', 'Device_Type', 'Location',
       'Merchant_Category', 'IP_Address_Flag', 'Previous_Fraudulent_Activity',
       'Daily_Transaction_Count', 'Avg_Transaction_Amount_7d',
       'Failed_Transaction_Count_7d', 'Card_Type', 'Card_Age',
       'Transaction_Distance', 'Authentication_Method', 'Risk_Score',
       'Is_Weekend', 'Fraud_Label']*/
// Draw a graph with cities name on the y-axis and an arbitrary attributs the x-axis dynamically with time evolution

function drawCityRace(fraudData) {
    const width = 960, height = 600;
    const margin = { top: 50, right: 50, bottom: 50, left: 150 };
    const svg = d3.select('#svg-vis-city-race')
        .attr("width", width)
        .attr("height", height);

    svg.selectAll("*").remove();

    const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");

    fraudData.forEach(d => {
        d.parsedTime = parseTime(d.Timestamp);
        d.Transaction_Amount = +d.Transaction_Amount;
    });

    const fraudulent = fraudData.filter(d => +d.Fraud_Label === 1 && d.parsedTime);
    const allCardTypes = Array.from(new Set(fraudulent.map(d => d.Card_Type)));
    const allLocations = Array.from(new Set(fraudulent.map(d => d.Location)));
    const fraudByDay = d3.groups(fraudulent, d => d3.timeDay(d.parsedTime)).sort((a, b) => d3.ascending(a[0], b[0]));

    let selectedMetric = document.getElementById("city-race-metric-select").value;
    let splitByCard = document.getElementById("city-race-split-by-cardtype").checked;
    let selectedCardFilter = null;

    const timeLabel = svg.append("text")
        .attr("class", "time-label")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("fill", "#333");

    const timeSlider = d3.select("#time-slider");
    timeSlider.attr("min", 0)
        .attr("max", fraudByDay.length - 1)
        .attr("value", 0); // Set slider base value to 0

    let sliderAutoUpdateInterval = null;
    let isSliderManuallyMoved = false; // Flag to track manual interaction with slider

    function startAutoUpdateSlider() {
        sliderAutoUpdateInterval = setInterval(() => {
            if (!isSliderManuallyMoved) {
                let currentValue = parseInt(timeSlider.property('value'), 10);
                if (currentValue < timeSlider.attr('max')) {
                    timeSlider.property('value', currentValue + 1);
                    updateTimeDisplay(parseInt(timeSlider.property('value'), 10));
                    updateBars(parseInt(timeSlider.property('value'), 10));
                }
            }
        }, 200); // Update every 500 ms (adjust as necessary)
    }

    // Event listener for slider input
    timeSlider.on("input", function () {
        isSliderManuallyMoved = true; // Mark that the user is interacting with the slider
        const sliderValue = parseInt(timeSlider.property('value'), 10);

        // Update the time label and progress bar based on the slider
        updateTimeDisplay(sliderValue);
        updateBars(sliderValue);

        // Clear the automatic update when the user manually interacts
        if (sliderAutoUpdateInterval) {
            clearInterval(sliderAutoUpdateInterval);
            sliderAutoUpdateInterval = null;
        }
    });

    // Event listener for metric selection change
    d3.select("#city-race-metric-select").on("change", () => {
        selectedMetric = document.getElementById("city-race-metric-select").value;
        redrawChart();
    });

    // Event listener for "Split by Card Type" checkbox change
    d3.select("#city-race-split-by-cardtype").on("change", () => {
        splitByCard = document.getElementById("city-race-split-by-cardtype").checked;
        redrawChart();
    });

    function redrawChart() {
        clearInterval(sliderAutoUpdateInterval); // Stop automatic update
        isSliderManuallyMoved = false; // Allow the animation to resume when the user changes the metric or checkbox state
        svg.selectAll("*").remove(); // Clear the current visualization
        drawCityRace(fraudData); // Redraw the chart with the new metric and splitByCard value
    }

    // Restart the animation and reset the slider when the restart button is clicked
    d3.select("#city-race-restart-btn").on("click", () => {
        clearInterval(sliderAutoUpdateInterval); // Clear the auto-update
        isSliderManuallyMoved = false; // Reset the manual move flag
        timeSlider.property('value', 0); // Reset slider value to 0 (or 1 if needed)
        updateTimeDisplay(0); // Reset time label
        updateBars(0); // Reset bars
        startAutoUpdateSlider(); // Start the automatic slider update
    });

    function updateTimeDisplay(i) {
        const currentDate = d3.timeFormat("%B %d, %Y")(fraudByDay[i][0]);
        timeLabel.text(currentDate);
    }

    let cumulative = {};
    let finalTotals = {};

    function initCumulative() {
        cumulative = {};
        finalTotals = {};
        if (splitByCard) {
            allLocations.forEach(loc => {
                cumulative[loc] = {};
                finalTotals[loc] = {};
                allCardTypes.forEach(card => {
                    cumulative[loc][card] = 0;
                    finalTotals[loc][card] = 0;
                });
            });
        } else {
            allLocations.forEach(loc => {
                cumulative[loc] = 0;
                finalTotals[loc] = 0;
            });
        }
    }

    function precomputeFinalTotals() {
        fraudByDay.forEach(([, entries]) => {
            entries.forEach(d => {
                const loc = d.Location;
                const card = d.Card_Type;
                const val = selectedMetric === "amount" ? d.Transaction_Amount : 1;

                if (splitByCard) {
                    finalTotals[loc][card] += val;
                } else {
                    finalTotals[loc] += val;
                }
            });
        });
    }

    initCumulative();
    precomputeFinalTotals();

    const xScale = d3.scaleLinear()
        .range([0, width - margin.left - margin.right]);

    const yScale = d3.scaleBand()
        .domain(allLocations)
        .range([0, height - margin.top - margin.bottom])
        .padding(0.1);

    const colorScale = d3.scaleOrdinal()
        .domain(allCardTypes)
        .range(d3.schemeCategory10);

    const chartGroup = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    chartGroup.append("g").attr("class", "y-axis").call(d3.axisLeft(yScale));
    chartGroup.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`);

    const fixedMax = splitByCard
        ? d3.max(Object.values(finalTotals), d => d3.max(Object.values(d)))
        : d3.max(Object.values(finalTotals));

    xScale.domain([0, fixedMax]);
    chartGroup.select(".x-axis").call(d3.axisBottom(xScale).ticks(5));

    // Create the legend if splitByCard is enabled
    function createLegend() {
        svg.selectAll('.legend').remove(); //Try to clean things
        if (!splitByCard) return; // Only create legend if splitByCard is enabled
    
        const legend = svg.append('g')
            .attr('class','legend')
            .attr('transform', `translate(${width - margin.right - 100},${margin.top - 50})`);
        
        legend.append('rect')
            .attr('width',140)
            .attr('height', allCardTypes.length*20 + 10)
            .attr('fill','gray')
            .attr('opacity',0.5)
            .attr('rx',5).attr('ry',5);

        const items = legend.selectAll('.legend-item')
            .data(allCardTypes)
            .enter().append('g')
            .attr('class','legend-item')
            .attr('transform',(d,i)=>`translate(10,${i*20+10})`)
            .style('cursor','pointer')
            .on('click', (event, cardType) => {
                // Toggle filter: click same card twice clears filter
                selectedCardFilter = (selectedCardFilter === cardType ? null : cardType);
                updateBars(+timeSlider.property('value'));
            });
        
        items.append('rect')
            .attr('width',12).attr('height',12)
            .attr('fill', d=>colorScale(d));
        items.append('text')
            .attr('x',18).attr('y',10)
            .attr('font-size','12px')
            .text(d=>d);
        
        items.select('text')
            .attr('font-weight', d=> d===selectedCardFilter ? 'bold' : 'normal');

    }
    

    function updateBars(i) {
        initCumulative();

        for (let j = 0; j <= i; j++) {
            const [, entries] = fraudByDay[j];
            entries.forEach(d => {
                const loc = d.Location;
                const card = d.Card_Type;
                const val = selectedMetric === "amount" ? d.Transaction_Amount : 1;

                if (splitByCard) {
                    cumulative[loc][card] += val;
                } else {
                    cumulative[loc] += val;
                }
            });
        }

        const barHeight = splitByCard
            ? yScale.bandwidth() / allCardTypes.length
            : yScale.bandwidth();

        const dataArray = allLocations.map(loc => {
            if (splitByCard) {
                // 1) filter to only the clicked card (if any), then build stack
                const stack = Object.entries(cumulative[loc])
                    .filter(([card, val]) =>
                        // keep all when no filter, else only matching card
                        !selectedCardFilter || card === selectedCardFilter
                    )
                .map(([card, val]) => ({ card, val }));

                // 2) compute total just from that filtered stack
                const total = d3.sum(stack, s => s.val);
                return { location: loc, stack, total };
            } else {
                return { location: loc, total: cumulative[loc] };
            }
        }).filter(d => !selectedCardFilter || d.total > 0)
            .sort((a, b) => d3.descending(a.total, b.total));


        yScale.domain(dataArray.map(d => d.location));
        chartGroup.select(".y-axis").transition().duration(200).call(d3.axisLeft(yScale));

        const groups = chartGroup.selectAll(".bar-group").data(dataArray, d => d.location);
        const groupsEnter = groups.enter()
            .append("g")
            .attr("class", "bar-group")
            .attr("transform", d => `translate(0,${yScale(d.location)})`);

        groupsEnter.merge(groups)
            .transition().duration(200)
            .attr("transform", d => `translate(0,${yScale(d.location)})`);

        groups.exit().remove();

        if (splitByCard) {
            const bars = groupsEnter.merge(groups).selectAll("rect")
                .data(d => d.stack.map((seg, i) => ({
                    ...seg,
                    location: d.location,
                    yOffset: i * barHeight
                })), d => d.card);

            bars.enter().append("rect")
                .attr("x", 0)
                .attr("y", d => d.yOffset)
                .attr("height", barHeight)
                .attr("width", 0)
                .attr("fill", d => colorScale(d.card))
                .merge(bars)
                .transition().duration(200)
                .attr("y", d => d.yOffset)
                .attr("width", d => xScale(d.val));

            bars.exit().remove();
        } else {
            const bars = groupsEnter.append("rect")
                .attr("class", "bar")
                .attr("x", 0)
                .attr("y", 0)
                .attr("height", barHeight)
                .attr("width", 0)
                .attr("fill", "steelblue");

            bars.merge(groups.select(".bar"))
                .transition().duration(200)
                .attr("width", d => xScale(d.total));
        }

        // Create the legend when splitByCard is true
        createLegend();
    }

    startAutoUpdateSlider(); // Start the automatic slider update when the page loads
}



