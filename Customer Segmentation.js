d3.csv("sale_data.csv", d => ({
  Segment: d["Segment"],
  Sales: +d["Sales"]
})).then(data => {

  // ──────────────────────
  // 1. Aggregate data
  // ──────────────────────
  const NumberOfOrderandAverageSaleBySegmentArray = Array.from(
    d3.rollup(
      data,
      v => ({
        totalOrders: v.length,                  // count duplicates (rows)
        avgSales: d3.mean(v, d => d.Sales)
      }),
      d => d.Segment
    ),
    ([Segment, stats]) => ({ Segment, ...stats })
  );

  console.log(NumberOfOrderandAverageSaleBySegmentArray);

  // ──────────────────────
  // 2. SVG & layout
  // ──────────────────────
  const svg = d3.select("#scatter-chart");
  const tooltip = d3.select("#tooltip");

  const width = +svg.attr("width");
  const height = +svg.attr("height");

  const margin = { top: 50, right: 120, bottom: 50, left: 70 };

  // ──────────────────────
  // 3. Scales
  // ──────────────────────
  const x = d3.scaleLinear()
    .domain([0, d3.max(NumberOfOrderandAverageSaleBySegmentArray, d => d.totalOrders) * 1.1])
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([220, d3.max(NumberOfOrderandAverageSaleBySegmentArray, d => d.avgSales) * 1.1])
    .range([height - margin.bottom, margin.top]);

  const color = d3.scaleOrdinal()
    .domain(NumberOfOrderandAverageSaleBySegmentArray.map(d => d.Segment))
    .range(["#4CAF50", "#2196F3", "#FF9800"]);

  // ──────────────────────
  // 4. Axes
  // ──────────────────────
  svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y));

  // Axis labels
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text("Number of Orders");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text("Average Sales");

  // ──────────────────────
  // 5. Scatter dots
  // ──────────────────────
  svg.selectAll("circle")
    .data(NumberOfOrderandAverageSaleBySegmentArray)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.totalOrders))
    .attr("cy", d => y(d.avgSales))
    .attr("r", 7)
    .attr("fill", d => color(d.Segment))
    .attr("opacity", 0.8)
    .on("mouseover", function (event, d) {
      d3.select(this).attr("r", 10);

      tooltip
        .style("opacity", 1)
        .html(`
          <strong>${d.Segment}</strong><br/>
          Orders: ${d.totalOrders.toLocaleString()}<br/>
          Avg Sales: ${d.avgSales.toFixed(2)}
        `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("r", 7);
      tooltip.style("opacity", 0);
    });

  // ──────────────────────
  // 6. Title
  // ──────────────────────
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .text("Orders vs Average Sales by Segment");

  // ──────────────────────
  // 7. Legend
  // ──────────────────────
  const legend = svg.append("g")
    .attr("transform", `translate(${width - 100}, ${margin.top})`);

  legend.selectAll("g")
    .data(color.domain())
    .enter()
    .append("g")
    .attr("transform", (d, i) => `translate(0, ${i * 20})`)
    .each(function (d) {
      const g = d3.select(this);

      g.append("circle")
        .attr("r", 6)
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("fill", color(d));

      g.append("text")
        .attr("x", 12)
        .attr("y", 4)
        .attr("font-size", "12px")
        .text(d);
    });

});
