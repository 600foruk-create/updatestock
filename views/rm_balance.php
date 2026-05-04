<div class="rm-balance">
    <!-- Filter Bar -->
    <div style="display: flex; gap: 1rem; margin-bottom: 2rem; background: var(--gray-100); padding: 1.2rem; border-radius: 12px; align-items: flex-end; flex-wrap: wrap; border: 1px solid var(--gray-200);">
        <div style="flex: 2; min-width: 250px;">
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--gray-600); margin-bottom: 0.5rem;">Search Material Name / Code</label>
            <input type="text" id="rmBalanceSearch" class="form-control" placeholder="Type to search..." onkeyup="refreshRMInventoryBalance()" style="background: white; border: 2px solid var(--gray-300); border-radius: 8px; padding: 0.6rem 1rem;">
        </div>
        <div style="flex: 1; min-width: 180px;">
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--gray-600); margin-bottom: 0.5rem;">Filter by Brand</label>
            <select id="rmBalanceMainFilter" class="form-control" onchange="refreshRMInventoryBalance()" style="background: white; border: 2px solid var(--gray-300); border-radius: 8px; padding: 0.6rem 1rem;"></select>
        </div>
        <div style="flex: 1; min-width: 180px;">
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--gray-600); margin-bottom: 0.5rem;">Filter by Category</label>
            <select id="rmBalanceSubFilter" class="form-control" onchange="refreshRMInventoryBalance()" style="background: white; border: 2px solid var(--gray-300); border-radius: 8px; padding: 0.6rem 1rem;"></select>
        </div>
    </div>

    <div class="table-container">
        <table class="data-table">
            <thead>
                <tr>
                    <th style="padding-left: 1.5rem;">Material Name / Code</th>
                    <th style="width: 120px; text-align: right;">Bags Count</th>
                    <th style="width: 150px; text-align: right;">Stock (KG)</th>
                    <th style="width: 140px; text-align: right;">Avg Price</th>
                    <th style="width: 140px; text-align: right;">Max Price</th>
                    <th style="width: 160px; text-align: right; padding-right: 1.5rem;">Total Value</th>
                </tr>
            </thead>
            <tbody id="rmBalanceTable">
                <!-- Data populated via JS -->
            </tbody>
        </table>
    </div>
</div>
