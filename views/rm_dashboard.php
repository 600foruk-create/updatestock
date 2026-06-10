<div class="rm-dashboard">
    <!-- Top Stats Grid: 2 Columns -->
    <div class="dashboard-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
        <div class="stat-card" style="background: #bfdbfe; padding: 1rem; border-radius: 6px; border: 1px solid #000;">
            <div class="stat-label" style="color: var(--gray-700); font-weight: 800; font-size: 0.8rem; text-transform: uppercase;">Total RM Types</div>
            <div class="stat-value" id="rmTotalItems" style="font-size: 2rem; font-weight: 800; color: #1e3a8a; margin-top: 0.3rem;">0</div>
        </div>
        <div class="stat-card" style="background: #bbf7d0; padding: 1rem; border-radius: 6px; border: 1px solid #000;">
            <div class="stat-label" style="color: var(--gray-700); font-weight: 800; font-size: 0.8rem; text-transform: uppercase;">Total Weight (KG)</div>
            <div class="stat-value" id="rmTotalWeightKg" style="font-size: 2rem; font-weight: 800; color: #14532d; margin-top: 0.3rem;">0</div>
        </div>
        <div class="stat-card" style="background: #fecaca; padding: 1rem; border-radius: 6px; border: 1px solid #000;">
            <div class="stat-label" style="color: var(--gray-700); font-weight: 800; font-size: 0.8rem; text-transform: uppercase;">Low Stock Alarms</div>
            <div class="stat-value" id="rmLowStockCount" style="font-size: 2rem; font-weight: 800; color: #7f1d1d; margin-top: 0.3rem;">0</div>
        </div>
    </div>

    <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 1.5rem;">
        <!-- Detailed Inventory Summary: Cards Layout -->
        <div class="summary-section" style="background: white; padding: 1rem; border-radius: 8px; border: 1px solid #000;">
            <h3 style="color: var(--gray-800); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.6rem; font-size: 1rem; font-weight: 800; text-transform: uppercase;">
                📦 Current Inventory Details
            </h3>
            <div id="rmInventorySummary" style="max-height: 500px; overflow-y: auto; padding-right: 0.5rem; display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.6rem; align-content: start;">
                <!-- Populated by JS with Cards -->
                <div style="text-align: center; padding: 3rem; color: var(--gray-400);">Loading inventory data...</div>
            </div>
        </div>

        <!-- Low Stock Alerts Panel -->
        <div class="alerts-section" style="background: white; padding: 1rem; border-radius: 8px; border: 1px solid #000;">
             <h3 style="color: var(--error); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.6rem; font-size: 1rem; font-weight: 800; text-transform: uppercase;">
                ⚠️ Low Stock Alerts
            </h3>
            <div id="rmLowStockAlerts" style="max-height: 500px; overflow-y: auto; padding-right: 0.5rem;">
                <!-- Populated by JS -->
                <div style="text-align: center; padding: 3rem; color: var(--gray-400);">No alerts found.</div>
            </div>
        </div>
    </div>
</div>

