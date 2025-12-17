// charts/stacked-line-chart.js

export function initStackedLineChart(containerId, metric, onClickHandler) {
    // metric is either "Sales" or "Profit"
    const container = d3.select(`#${containerId}`);
    
    const width = 520; 
    const height = 320;
    const margin = { t: 20, r: 20, b: 40, l: 60 };
    const w = width - margin.l - margin.r;
    const h = height - margin.t - margin.b;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg.append("g").attr("transform", `translate(${margin.l},${margin.t})`);

    const x = d3.scaleBand().range([0, w]).padding(0.3);
    const y = d3.scaleLinear().range([h, 0]);
    
    const colors = { "Furniture": "#9b59b6", "Office Supplies": "#f1c40f", "Technology": "#1abc9c" };
    const categories = ["Furniture", "Office Supplies", "Technology"];

    const xAxisG = g.append("g").attr("transform", `translate(0,${h})`);
    const yAxisG = g.append("g");
    const legendG = svg.append("g").attr("transform", `translate(${width - 150}, 10)`);
    
    const tooltip = d3.select("#tooltip");

    // --- UPDATE FUNCTION ---
    function update(data, yearFilter, activeCategory) {
        const mode = yearFilter === "all" ? "year" : "month";
        let aggregated = [];

        // 1. Prepare Data
        if (mode === "month") {
            const allMonths = d3.range(0, 12); 
            aggregated = allMonths.map(m => {
                const rows = data.filter(d => d.month === m);
                const obj = { month: m };
                categories.forEach(c => {
                    obj[c] = d3.sum(rows.filter(r => r.Category === c), r => r[metric]) || 0;
                });
                return obj;
            });
        } else {
            aggregated = d3.groups(data, d => d.year)
                .map(([k, rows]) => ({
                    year: k,
                    ...Object.fromEntries(categories.map(c => [
                        c, d3.sum(rows.filter(r => r.Category === c), r => r[metric]) || 0
                    ]))
                }))
                .sort((a, b) => a.year - b.year);
        }

        // 2. Stack Data
        const stack = d3.stack().keys(categories)(aggregated);

        // 3. Update Scales
        x.domain(aggregated.map(d => d[mode]));
        
        const minVal = d3.min(stack, layer => d3.min(layer, d => d[0]));
        const maxVal = d3.max(stack, layer => d3.max(layer, d => d[1]));
        y.domain([Math.min(0, minVal), maxVal]).nice();

        // 4. Draw Areas
        const area = d3.area()
            .x(d => x(d.data[mode]) + x.bandwidth() / 2)
            .y0(d => y(d[0]))
            .y1(d => y(d[1]));

        const paths = g.selectAll(".area-layer").data(stack);

        paths.join("path")
            .attr("class", "area-layer")
            .attr("d", area)
            .attr("fill", d => colors[d.key])
            .attr("cursor", "pointer") // Show it's clickable
            // --- HIGHLIGHT LOGIC ---
            .attr("opacity", d => {
                if (activeCategory) {
                    return d.key === activeCategory ? 1 : 0.2; // Dim others
                }
                return 1;
            })
            // --- CLICK HANDLER ---
            .on("click", (event, d) => {
                event.stopPropagation();
                onClickHandler(d.key); // d.key is the Category Name
            })
            .on("mousemove", (event, d) => {
                // Keep highlighted opacity on hover, or 1 if none selected
                const currentOpacity = (activeCategory && d.key !== activeCategory) ? 0.2 : 1;
                d3.select(event.currentTarget).attr("opacity", currentOpacity); // Maintain dim state

                tooltip.style("opacity", 1)
                    .html(`<b>${d.key}</b>`) 
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", (event, d) => {
                tooltip.style("opacity", 0);
            })
            .transition().duration(750)
            .attr("d", area);

        // 6. Update Axes
        xAxisG.transition().duration(750).call(d3.axisBottom(x).tickFormat(v => {
            if (mode === "month") return d3.timeFormat("%b")(new Date(2020, v, 1));
            return v;
        }));
        yAxisG.transition().duration(750).call(d3.axisLeft(y).ticks(5, "s"));

        // 7. Legend
        legendG.html("");
        categories.forEach((c, i) => {
            const leg = legendG.append("g").attr("transform", `translate(0, ${i * 15})`);
            
            // Highlight legend text too
            const opacity = activeCategory && activeCategory !== c ? 0.3 : 1;
            const weight = activeCategory === c ? "bold" : "normal";

            leg.append("rect").attr("width", 10).attr("height", 10).attr("fill", colors[c]).attr("opacity", opacity);
            leg.append("text").attr("x", 15).attr("y", 9).attr("fill", "#333")
               .attr("font-size", "10px").attr("opacity", opacity).attr("font-weight", weight)
               .text(c);
        });
    }

    return { update };
}