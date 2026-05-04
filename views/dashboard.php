<div id="dashboard" class="tab-content active">
                    <div class="stats-grid" id="dashboardStats"></div>
                    <div class="brands-container" id="brandStockCards"></div>
                    <!-- New Charts Section: Side-by-Side -->
                    <div id="dashboardCharts" class="dashboard-section">
                        <h3>📊 Stock Analysis</h3>
                        <div class="chart-main-wrapper" style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 2rem; align-items: start;">
                            <div class="chart-box">
                                <h4 style="margin-bottom: 1rem; color: var(--gray-500); font-size: 0.9rem;">Brand Comparison</h4>
                                <canvas id="barChart" style="max-height: 300px;"></canvas>
                            </div>
                            <div class="chart-box">
                                <h4 style="margin-bottom: 1rem; color: var(--gray-500); font-size: 0.9rem;">Distribution</h4>
                                <canvas id="donutChart" style="max-height: 300px;"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- New Alerts Section -->
                    <div id="lowStockAlerts" class="dashboard-section">
                        <h3>⚠️ Critical Low Stock Alerts</h3>
                        <div class="alerts-grid-scroll">
                            <div class="alerts-grid" id="lowStockAlertsContainer"></div>
                        </div>
                    </div>

                    <div id="stockShortage" class="dashboard-section" style="margin-top: 2rem;">
                        <h3 style="color: #ef4444;">🚨 Stock Shortage (Needed for Orders)</h3>
                        <div class="alerts-grid-scroll">
                            <div class="alerts-grid" id="negativeStockContainer"></div>
                        </div>
                    </div>
                </div>