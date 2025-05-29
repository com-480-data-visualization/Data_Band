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
    choroplethMap(geoData, fraudData)
    console.log("Choropleth map done...")
});

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