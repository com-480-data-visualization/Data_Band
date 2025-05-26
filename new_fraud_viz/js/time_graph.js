d3.tsv("data/data.csv")
  .then(rows => {
    rows = rows.map(r => ({
      Timestamp: r["Timestamp"],
      Fraud_Label: r["Fraud_Label"],
      Type: r["Transaction_Type"],
      Location: r["Location"]
    }));
    drawTimeSeries(rows);
  })
  .catch(err => {
    console.error("Failed to load CSV:", err);
    document.getElementById("fraud-time-chart").innerHTML = "<p>Data load error.</p>";
  });

function drawTimeSeries(rows) {
  const fraudData = {};
  const totalData = {};
  const types = new Set();
  const cities = new Set();

  rows.forEach(r => {
    const date = new Date(r.Timestamp).toISOString().slice(0, 10);
    const type = r.Type;
    const city = r.Location;
    const isFraud = r.Fraud_Label === "1";

    types.add(type);
    cities.add(city);

    const key = `${date}___${type}___${city}`;
    fraudData[key] = (fraudData[key] || 0) + (isFraud ? 1 : 0);
    totalData[key] = (totalData[key] || 0) + 1;
  });

  populateDropdown("filterType", types);
  populateDropdown("filterCity", cities);

  function updateChart() {
    const selectedType = document.getElementById("filterType").value;
    const selectedCity = document.getElementById("filterCity").value;
    const darkMode = true; 

    const dailyStats = {};
    Object.keys(totalData).forEach(key => {
      const [date, type, city] = key.split("___");
      if ((selectedType === "All" || selectedType === type) &&
          (selectedCity === "All" || selectedCity === city)) {
        dailyStats[date] = dailyStats[date] || { fraud: 0, total: 0, typeCount: {} };
        dailyStats[date].fraud += fraudData[key] || 0;
        dailyStats[date].total += totalData[key];
        dailyStats[date].typeCount[type] = (dailyStats[date].typeCount[type] || 0) + totalData[key];
      }
    });

    const dates = Object.keys(dailyStats).sort();
    const frauds = dates.map(d => dailyStats[d].fraud);
    const totals = dates.map(d => dailyStats[d].total);
    const rates = dates.map((_, i) => frauds[i] / totals[i]);
    const hoverText = dates.map((d, i) => {
      const commonType = Object.entries(dailyStats[d].typeCount).sort((a, b) => b[1] - a[1])[0][0];
      return `Date: ${d}<br>Frauds: ${frauds[i]}<br>Total: ${totals[i]}<br>Fraud Rate: ${(rates[i] * 100).toFixed(2)}%<br>Top Type: ${commonType}`;
    });

    const rolling = frauds.map((_, i) => {
      const window = frauds.slice(Math.max(0, i - 6), i + 1);
      return window.reduce((a, b) => a + b, 0) / window.length;
    });

    const annotations = [
      {
        x: dates[frauds.indexOf(Math.max(...frauds))],
        y: Math.max(...frauds),
        text: "Peak Day",
        showarrow: true,
        arrowhead: 6,
        ax: 0,
        ay: -40,
        font: {
          color: "#e0f0ff",
          size: 14,
          family: "Orbitron, sans-serif"
        },
        arrowcolor: "#e0f0ff"
      }
    ];

    const layout = {
      xaxis: {
        title: {
          text: "Date",
          font: { family: "Orbitron, sans-serif", color: "#e0f0ff" }
        },
        color: "#e0f0ff",
        rangeselector: {
          buttons: [
            { count: 7, label: "1w", step: "day", stepmode: "backward" },
            { count: 1, label: "1m", step: "month", stepmode: "backward" },
            { count: 3, label: "3m", step: "month", stepmode: "backward" },
            { step: "all", label: "All" }
          ],
          bgcolor: "#1b1f27",
          activecolor: "#3a86ff",
          font: {
            color: "#e0f0ff",
            size: 13,
            family: "Orbitron, sans-serif"
          }
        },
        rangeslider: { visible: true },
        type: "date"
      },
      yaxis: {
        title: {
          text: "Count / Rate",
          font: { family: "Orbitron, sans-serif", color: "#e0f0ff" }
        },
        color: "#e0f0ff"
      },
      annotations,
      plot_bgcolor: "rgba(0,0,0,0)",
      paper_bgcolor: "rgba(0,0,0,0)",
      font: {
        color: "#e0f0ff",
        family: "Orbitron, sans-serif"
      }
    };

    Plotly.newPlot("fraud-time-chart", [
      {
        x: dates,
        y: frauds,
        type: "scatter",
        mode: "lines",
        name: "Fraud Count",
        line: { color: "#c12828" },
        text: hoverText,
        hoverinfo: "text"
      },
      {
        x: dates,
        y: rolling,
        type: "scatter",
        mode: "lines",
        name: "7-day Avg",
        line: { dash: "dash", color: "#10a42e" },
        hoverinfo: "skip"
      },
      {
        x: dates,
        y: rates.map(r => r * Math.max(...frauds)),
        type: "scatter",
        mode: "lines",
        name: "Fraud Rate (scaled)",
        line: { dash: "dot", color: "#3a86ff" },
        hoverinfo: "skip"
      }
    ], layout);
  }

  document.getElementById("filterType").addEventListener("change", updateChart);
  document.getElementById("filterCity").addEventListener("change", updateChart);
  updateChart();
}

function populateDropdown(id, values) {
  const el = document.getElementById(id);
  el.innerHTML = `<option value="All">All</option>` + [...values].sort().map(v => `<option value="${v}">${v}</option>`).join("");
}

