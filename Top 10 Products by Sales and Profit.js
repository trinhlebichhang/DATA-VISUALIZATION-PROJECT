d3.csv("sale_data.csv", d => ({
  Product: d["Product Name"],  
  Sales: +d["Sales"],
  Profit: +d["Profit"]
})).then(data => {
    console.log(data);

  const RevenueAndProfitByProduct = Array.from(
  d3.rollup(
   data,
   v => ({
      Sales: d3.sum(v, d => d.Sales),
      Profit: d3.sum(v, d => d.Profit)
    }),
    d => d.Product
  )
 );

 const RevenueAndProfitByProductArray = Array.from(
  RevenueAndProfitByProduct,
  ([Product, totals]) => ({ Product, ...totals })
);
  console.log(RevenueAndProfitByProductArray)

const Top10RevenueAndProfitByProductArray =
  [...RevenueAndProfitByProductArray]
    .sort((a,b)=> d3.descending(a.Sales,b.Sales))
    .slice(0,10);
  console.log(Top10RevenueAndProfitByProductArray);


 const svg = d3.select("#top10-chart");
  const width = +svg.attr("width");
  const height = +svg.attr("height");

  const margin = {
    top: 60,
    right: 200,
    bottom: 40,
    left: 160
  };

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const subgroups = ["Sales", "Profit"];
  const tooltip = d3.select("#tooltip");



  const x = d3.scaleLinear()
    .domain([
      d3.min(Top10RevenueAndProfitByProductArray, d => d.Profit),
      d3.max(Top10RevenueAndProfitByProductArray, d => d.Sales)
    ])
    .nice()
    .range([0, innerWidth]);

  const y = d3.scaleBand()
    .domain(Top10RevenueAndProfitByProductArray.map(d => d.Product))
    .range([0, innerHeight])
    .padding(0.2);

  const ySubgroup = d3.scaleBand()
    .domain(subgroups)
    .range([0, y.bandwidth()])
    .padding(0.05);

  const color = d3.scaleOrdinal()
    .domain(subgroups)
    .range(["#4CAF50", "#2196F3"]);



  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);



  chart.append("g")
    .call(d3.axisTop(x));

  chart.append("g")
    .call(d3.axisLeft(y));



  chart.append("line")
    .attr("x1", x(0))
    .attr("x2", x(0))
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .attr("stroke", "#000")
    .attr("stroke-dasharray", "4,2");



  chart.selectAll(".product-group")
    .data(Top10RevenueAndProfitByProductArray)
    .enter()
    .append("g")
    .attr("class", "product-group")
    .attr("transform", d => `translate(0, ${y(d.Product)})`)
    .selectAll("rect")
    .data(d => subgroups.map(key => ({
      key,
      value: d[key]
    })))
    .enter()
    .append("rect")
    .attr("x", d => x(Math.min(0, d.value)))
    .attr("y", d => ySubgroup(d.key))
    .attr("width", d => Math.abs(x(d.value) - x(0)))
    .attr("height", ySubgroup.bandwidth())
    .attr("fill", d =>
      d.key === "Profit" && d.value < 0
        ? "#F44336"
        : color(d.key)
    )
    .on("mouseover", function (event, d) {
      d3.select(this).attr("opacity", 0.7);

      tooltip
        .style("opacity", 1)
        .html(`
          <strong>${d.key}</strong><br/>
          Value: ${d.value.toLocaleString()}
        `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("opacity", 1);
      tooltip.style("opacity", 0);
    });


  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .text("Top 10 Products: Sales and Profit");



  const legendData = [
    { label: "Sales", color: "#4CAF50" },
    { label: "Profit (Gain)", color: "#2196F3" },
    { label: "Profit (Loss)", color: "#F44336" }
  ];

  const legend = svg.append("g")
    .attr("transform", `translate(${width - margin.right + 20}, ${margin.top})`);

  legend.selectAll("g")
    .data(legendData)
    .enter()
    .append("g")
    .attr("transform", (d, i) => `translate(0, ${i * 24})`)
    .each(function (d) {
      const g = d3.select(this);

      g.append("rect")
        .attr("width", 14)
        .attr("height", 14)
        .attr("fill", d.color);

      g.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .attr("font-size", "12px")
        .text(d.label);
    });

});
