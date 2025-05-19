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

function choroplethMap(geoData, fraudData){
    //Visualisation choropleth map
    const width = 960, height = 600;
    const svg = d3.select('#svg-vis-choropleth')
    
    svg.attr("width", width)
        .attr("height", height)
    
    const projection = d3.geoMercator().scale(150).translate([width / 2, height / 1.5])
    const path = d3.geoPath().projection(projection)
    
    svg.selectAll("path")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "#eee")
        .attr("stroke", "#999")

    const fraudByCity = {};
    fraudData.forEach(d => {
        if (d.Fraud_Label === "1" && cityCoords[d.Location]) {
            const city = d.Location;
            const amount = +d.Transaction_Amount;
            fraudByCity[city] = (fraudByCity[city] || 0) + amount;
        }
    })

    const fraudPoints = Object.entries(fraudByCity).map(([city, amount]) => {
        return {
            city,
            amount,
            ...cityCoords[city]
        }
    })

    const radius = d3.scaleSqrt()
        .domain(d3.extent(fraudPoints, d => d.amount))
        .range([5, 25]);

    const color = d3.scaleSequential()
        .domain(d3.extent(fraudPoints, d => d.amount))
        .interpolator(d3.interpolateReds);
    
    svg.selectAll("circle")
        .data(fraudPoints)
        .enter()
        .append("circle")
        .attr("cx", d => projection([d.lon, d.lat])[0])
        .attr("cy", d => projection([d.lon, d.lat])[1])
        .attr("r", d => radius(d.amount))
        .attr("fill", d => color(d.amount))
        .attr("opacity", 0.8)
        .attr("stroke", "#900");
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

    const selectedMetric = document.getElementById("city-race-metric-select").value;
    const splitByCard = document.getElementById("city-race-split-by-cardtype").checked;

    let cumulative = {}; // location or location+card

    function initCumulative() {
        cumulative = {};
        if (splitByCard) {
            allLocations.forEach(loc => {
                cumulative[loc] = {};
                allCardTypes.forEach(card => {
                    cumulative[loc][card] = 0;
                });
            });
        } else {
            allLocations.forEach(loc => {
                cumulative[loc] = 0;
            });
        }
    }

    initCumulative();

    function computeMaxTotal() {
        if (!splitByCard) {
            return d3.max(Object.values(cumulative));
        } else {
            return d3.max(Object.values(cumulative), d => d3.sum(Object.values(d)));
        }
    }

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

    function updateAxes() {
        const maxValue = computeMaxTotal();
        xScale.domain([0, maxValue]);

        chartGroup.select(".x-axis")
            .transition().duration(200)
            .call(d3.axisBottom(xScale).ticks(5));
    }

    function updateBars() {
        updateAxes();

        const dataArray = allLocations.map(loc => {
            if (splitByCard) {
                return {
                    location: loc,
                    stack: Object.entries(cumulative[loc])
                        .map(([card, val]) => ({ card, val }))
                        .sort((a, b) => a.card.localeCompare(b.card)),
                    total: d3.sum(Object.values(cumulative[loc]))
                };
            } else {
                return { location: loc, total: cumulative[loc] };
            }
        }).sort((a, b) => d3.descending(a.total, b.total));

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
            groupsEnter.selectAll("rect")
                .data(d => {
                    let xOffset = 0;
                    return d.stack.map(seg => {
                        const obj = {
                            ...seg,
                            location: d.location,
                            xOffset
                        };
                        xOffset += xScale(seg.val);
                        return obj;
                    });
                })
                .enter()
                .append("rect")
                .attr("x", d => d.xOffset)
                .attr("height", yScale.bandwidth())
                .attr("width", d => xScale(d.val))
                .attr("fill", d => colorScale(d.card));

            // update (skip for now for simplicity)
        } else {
            const bars = groupsEnter.append("rect")
                .attr("class", "bar")
                .attr("x", 0)
                .attr("height", yScale.bandwidth())
                .attr("width", 0)
                .attr("fill", "steelblue");

            bars.merge(groups.select(".bar"))
                .transition().duration(200)
                .attr("width", d => xScale(d.total));
        }
    }

    let timer = null;

    function animate() {
        initCumulative();
        let i = 0;

        function step() {
            if (i >= fraudByDay.length) {
                clearInterval(timer);
                return;
            }

            const [, entries] = fraudByDay[i];
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

            updateBars();
            i++;
        }

        step();
        timer = setInterval(step, 100);
    }

    animate();

    // Listeners
    d3.select("#city-race-restart-btn").on("click", () => {
        clearInterval(timer);
        svg.selectAll("*").remove();
        drawCityRace(fraudData);
    });

    d3.select("#city-race-metric-select").on("change", () => {
        clearInterval(timer);
        svg.selectAll("*").remove();
        drawCityRace(fraudData);
    });

    d3.select("#city-race-split-by-cardtype").on("change", () => {
        clearInterval(timer);
        svg.selectAll("*").remove();
        drawCityRace(fraudData);
    });
}
