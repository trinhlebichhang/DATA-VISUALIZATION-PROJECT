import { initMap } from './charts/map.js';
import { initPie } from './charts/pie.js';
import { initTop10Bar } from './charts/top-10-product-by-sales-and-profit.js';
import { initCustomerSegment } from './charts/customer-segment.js';
import { initStackedLineChart } from './charts/stacked-line-chart.js'; 

const topoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
const superstoreUrl = "sale_data.csv";

// Master State
let rawData = [];
let currentState = {
    year: "all",
    state: null,
    category: null,
    segment: null,
    product: null 
};

let colorScale, radiusScale;
let mapChart, pieChart, barChart, scatterChart, revChart, profChart;
const parseDate = d3.timeParse("%m/%d/%Y"); 

Promise.all([
    d3.json(topoUrl),
    d3.csv(superstoreUrl)
]).then(([us, data]) => {

    // 1. Process Data
    data.forEach(d => {
        d.Sales = +d.Sales;
        d.Profit = +d.Profit;
        d.Quantity = +d.Quantity;
        
        // Trim strings to match filters correctly
        if (d.Category) d.Category = d.Category.trim(); 
        if (d.Segment) d.Segment = d.Segment.trim();
        if (d["Product Name"]) d["Product Name"] = d["Product Name"].trim();

        d.date = parseDate(d["Order Date"]);
        if (d.date) {
            d.year = d.date.getFullYear();
            d.month = d.date.getMonth(); 
        }
    });

    rawData = data.filter(d => d.date);

    // 2. Setup Scales
    const allCategories = Array.from(new Set(data.map(d => d.Category))).sort();
    colorScale = d3.scaleOrdinal().domain(allCategories).range(["#9b59b6", "#f1c40f", "#1abc9c"]); 

    const salesByStateTotal = d3.rollup(rawData, v => d3.sum(v, d => d.Sales), d => d.State);
    radiusScale = d3.scaleSqrt().domain([0, d3.max(salesByStateTotal.values())]).range([0, 35]);

    // 3. Build Year Filter
    const years = [...new Set(rawData.map(d => d.year))].sort();
    const yearSelect = d3.select("#yearFilter");
    years.forEach(y => yearSelect.append("option").attr("value", y).text(y));

    // 4. Initialize All Charts
    mapChart = initMap("map-container", us, handleStateClick);
    pieChart = initPie("pie-container", handleCategoryClick);
    
    // UPDATED: Pass handleProductClick to Bar Chart
    barChart = initTop10Bar("bar-container", handleProductClick);
    
    scatterChart = initCustomerSegment("scatter-container", handleSegmentClick);
    
    revChart = initStackedLineChart("revenue-timeline", "Sales", handleCategoryClick);
    profChart = initStackedLineChart("profit-timeline", "Profit", handleCategoryClick);

    // Events
    yearSelect.on("change", function() {
        currentState.year = this.value === "all" ? "all" : +this.value;
        updateDashboard();
    });

    d3.select("#reset-btn").on("click", resetAll);

    updateDashboard();

}).catch(err => console.error(err));


// --- LOGIC CONTROLLERS ---

function handleStateClick(stateName) {
    if (currentState.state === stateName) {
        currentState.state = null; 
    } else {
        currentState.state = stateName;
        // Optional: Reset category/product when changing state context
        currentState.category = null; 
    }
    updateDashboard();
}

function handleCategoryClick(categoryName) {
    if (currentState.category === categoryName) {
        currentState.category = null;
    } else {
        currentState.category = categoryName;
        // Don't reset state here; allow "Furniture in California"
        currentState.product = null; // Reset product if category changes
    }
    updateDashboard();
}

function handleSegmentClick(segmentName) {
    if (currentState.segment === segmentName) {
        currentState.segment = null;
    } else {
        currentState.segment = segmentName;
    }
    updateDashboard();
}

// NEW: Handle Product Click from Bar Chart
function handleProductClick(productName) {
    if (currentState.product === productName) {
        currentState.product = null;
    } else {
        currentState.product = productName;
    }
    updateDashboard();
}

function resetAll() {
    currentState = { year: "all", state: null, category: null, segment: null, product: null };
    d3.select("#yearFilter").property("value", "all");
    updateDashboard();
}

function updateDashboard() {
    const s = currentState;

    // 1. Show/Hide Reset Button
    const isFiltered = s.year !== "all" || s.state || s.category || s.segment || s.product;
    d3.select("#reset-btn").style("display", isFiltered ? "inline-block" : "none");

    // --- FILTERING LOGIC ---
    
    // 1. Base Data (Year + State)
    // This is the foundation for all charts.
    let commonData = rawData;
    if (s.year !== "all") commonData = commonData.filter(d => d.year === s.year);
    if (s.state) commonData = commonData.filter(d => d.State === s.state);

    // 2. Data for Scatter Chart
    // Needs to show ALL Segments (so we can dim unselected ones),
    // but should be filtered by Category and Product.
    let scatterData = commonData;
    if (s.category) scatterData = scatterData.filter(d => d.Category === s.category);
    if (s.product) scatterData = scatterData.filter(d => d["Product Name"] === s.product);

    // 3. Data for Line Charts & Pie Chart
    // Needs to show ALL Categories (so we can dim unselected ones),
    // but should be filtered by Segment and Product.
    let lineData = commonData;
    if (s.segment) lineData = lineData.filter(d => d.Segment === s.segment);
    if (s.product) lineData = lineData.filter(d => d["Product Name"] === s.product);

    // 4. Data for Bar Chart
    // Needs to show TOP 10 Products (so we can dim unselected ones),
    // but should be filtered by Segment and Category.
    // IMPORTANT: Do NOT filter by s.product here, or the chart will only show 1 bar.
    let barData = commonData;
    if (s.segment) barData = barData.filter(d => d.Segment === s.segment);
    if (s.category) barData = barData.filter(d => d.Category === s.category);

    // 5. Final Data (Fully Filtered)
    // Used for KPIs and Map, which should show exact numbers for the selection.
    let finalData = barData; // Start from barData (which has segment + category)
    if (s.product) finalData = finalData.filter(d => d["Product Name"] === s.product);


    // --- UPDATE VISUALS ---

    // 1. KPIs & Map use FINAL (Strict) data
    updateKPIs(finalData);
    mapChart.update(finalData, colorScale, radiusScale, s.category, s.state);

    // 2. Bar Chart uses 'barData' + 's.product' for highlighting
    barChart.update(barData, s.product);

    // 3. Line Charts use 'lineData' + 's.category' for highlighting
    revChart.update(lineData, s.year, s.category);
    profChart.update(lineData, s.year, s.category);

    // 4. Scatter Chart uses 'scatterData' + 's.segment' for highlighting
    scatterChart.update(scatterData, s.segment);

    // 5. Pie Chart uses 'lineData' (shows all slices) + 's.category' for highlighting
    let pieTitle = "Total Revenue";
    if (s.product) pieTitle = "Product Revenue";
    else if (s.segment) pieTitle = `${s.segment} Revenue`;
    else if (s.state) pieTitle = `${s.state} Revenue`;
    
    pieChart.update(lineData, pieTitle, colorScale, s.category);
}

function updateKPIs(data) {
    const totalRevenue = d3.sum(data, d => d.Sales);
    const totalProfit = d3.sum(data, d => d.Profit);
    const totalOrders = new Set(data.map(d => d["Order ID"])).size;
    const margin = totalRevenue ? (totalProfit / totalRevenue) * 100 : 0;

    d3.select("#kpi-revenue").text(`$${(totalRevenue / 1000).toFixed(2)}K`);
    d3.select("#kpi-profit").text(`$${(totalProfit / 1000).toFixed(2)}K`);
    d3.select("#kpi-orders").text(totalOrders);
    d3.select("#kpi-margin").text(`${margin.toFixed(2)}%`)
        .style("color", margin < 0 ? "#e74c3c" : "#0b2c6b");
}