<div class="store-dashboard">
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2.5rem;">
        <div style="background: var(--blue-50); border: 2px solid var(--blue-100); border-radius: 20px; padding: 1.5rem; text-align: center; box-shadow: var(--shadow-sm);">
            <h3 style="color: var(--blue-700); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem; font-weight: 800;">Categories</h3>
            <p id="storeDashCatCount" style="font-size: 2.5rem; font-weight: 900; color: var(--blue-900); margin: 0;">0</p>
        </div>
        
        <div style="background: var(--green-50); border: 2px solid var(--green-100); border-radius: 20px; padding: 1.5rem; text-align: center; box-shadow: var(--shadow-sm);">
            <h3 style="color: var(--green-700); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem; font-weight: 800;">Total Items</h3>
            <p id="storeDashItemCount" style="font-size: 2.5rem; font-weight: 900; color: var(--green-900); margin: 0;">0</p>
        </div>
        
        <div style="background: var(--orange-50); border: 2px solid var(--orange-100); border-radius: 20px; padding: 1.5rem; text-align: center; box-shadow: var(--shadow-sm);">
            <h3 style="color: var(--orange-700); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem; font-weight: 800;">Low Stock</h3>
            <p id="storeDashLowStock" style="font-size: 2.5rem; font-weight: 900; color: var(--orange-900); margin: 0;">0</p>
        </div>
    </div>

    <!-- Low Stock Alert Section -->
    <div id="storeLowStockAlertSection" style="margin-bottom: 2.5rem; display: none;">
        <h3 style="color: #991b1b; font-size: 1.25rem; font-weight: 800; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.8rem;">
            <i class="fas fa-exclamation-triangle"></i> Store Low Stock Alerts
        </h3>
        <div id="storeLowStockAlerts" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; max-height: 400px; overflow-y: auto; padding: 5px;">
            <!-- Alerts injected by JS -->
        </div>
    </div>

    <div class="card" style="background: white; border-radius: 20px; border: 1px solid var(--gray-200); padding: 2rem; box-shadow: var(--shadow-sm);">
        <h3 style="color: var(--gray-700); font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.8rem;">
            <i class="fas fa-history" style="color: var(--sky-500);"></i> Recent Activity
        </h3>
        <div id="storeRecentActivityLog" style="background: var(--gray-50); border-radius: 12px; padding: 1.5rem; min-height: 150px; border: 1px solid var(--gray-100);">
            <p style="text-align: center; color: var(--gray-400); margin-top: 2rem;">No recent records found.</p>
        </div>
    </div>
</div>
