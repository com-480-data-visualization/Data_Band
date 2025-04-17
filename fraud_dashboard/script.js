(() => {
  d3.tsv("data/data.csv")
    .then(rows => {
      const { dates, counts, months, byMonthCity } = parseFraud(rows);
      drawTimeSeries(dates, counts);
      drawMapSlider(months, byMonthCity);
    })
    .catch(err => {
      console.error("Failed to load CSV:", err);
      document.getElementById("fraud-map").innerHTML = "<p>Data load error.</p>";
    });

  //parsing data
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
        title: {
          text: "Fraudulent Transactions Over Time",
          font: { size: 22 },
          xref: "paper", x: 0.05
        },
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
    const cityCoords = {
      Tokyo: [35.6895, 139.6917],
      "New York": [40.7128, -74.0060],
      Sydney: [-33.8688, 151.2093],
      London: [51.5074, -0.1278],
      Mumbai: [19.0760, 72.8777]
    };

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
})();

  
  