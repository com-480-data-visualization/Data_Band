
Promise.all([
    d3.csv("https://raw.githubusercontent.com/thetorf/files/main/fraud_dataset.csv")
]).then(([fraudData])  => {
        drawCityRace(fraudData);
        console.log("City Race done...");
    });

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

    d3.select("#svg-vis-city-race")
        .selectAll("text")
        .attr("fill", "#fff");

    startAutoUpdateSlider(); // Start the automatic slider update when the page loads
}