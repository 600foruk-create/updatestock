<div class="rm-balance">
    <!-- Filter Bar -->
    <div class="search-container" style="display: flex; gap: 0.5rem; margin-bottom: 1rem; background: var(--gray-50); padding: 0.75rem; border-radius: 8px; border: 1px solid #000; flex-wrap: wrap; align-items: center;">
        <select id="rmBalanceMainFilter" class="form-control" onchange="refreshRMInventoryBalance()" style="width: 140px; height: 32px; border-radius: 4px; border: 1px solid #000; font-size: 0.8rem; padding: 0 0.5rem;"></select>
        
        <select id="rmBalanceSubFilter" class="form-control" onchange="refreshRMInventoryBalance()" style="width: 140px; height: 32px; border-radius: 4px; border: 1px solid #000; font-size: 0.8rem; padding: 0 0.5rem;"></select>
        
        <div style="width: 160px; position: relative;">
            <i class="fas fa-search" style="position: absolute; left: 0.6rem; top: 50%; transform: translateY(-50%); color: var(--gray-400); font-size: 0.8rem;"></i>
            <input type="text" id="rmBalanceSearch" class="form-control" placeholder="Search..." onkeyup="refreshRMInventoryBalance()" style="padding-left: 1.8rem; height: 32px; border-radius: 4px; border: 1px solid #000; font-size: 0.8rem; width: 100%;">
        </div>

        <div style="display: flex; align-items: center; gap: 0.3rem; margin-left: auto; background: #fff; padding: 2px 8px; border-radius: 4px; border: 1px solid #ccc;">
            <span style="font-size: 0.75rem; font-weight: bold; color: var(--gray-700);">Date Range:</span>
            <input type="date" id="rmBalanceFromDate" class="form-control" onchange="refreshRMInventoryBalance()" title="From Date" style="height: 28px; border-radius: 4px; border: 1px solid #000; font-size: 0.75rem; padding: 0 0.3rem; width: 115px;">
            <span style="font-size: 0.75rem; font-weight: bold;">to</span>
            <input type="date" id="rmBalanceToDate" class="form-control" onchange="refreshRMInventoryBalance()" title="To Date" style="height: 28px; border-radius: 4px; border: 1px solid #000; font-size: 0.75rem; padding: 0 0.3rem; width: 115px;">
            <button class="btn btn-sm" onclick="document.getElementById('rmBalanceFromDate').value=''; document.getElementById('rmBalanceToDate').value=''; refreshRMInventoryBalance();" title="Clear Dates" style="padding: 2px 6px; font-size: 0.7rem; background: var(--gray-200); border: 1px solid #999; border-radius: 3px;">✖</button>
        </div>
    </div>

    <div class="table-container">
        <table class="data-table">
            <thead>
                <tr>
                    <th style="padding-left: 1.5rem;">Material Name / Code</th>
                    <th style="width: 120px; text-align: right;">Bags Count</th>
                    <th style="width: 150px; text-align: right;">Stock (KG)</th>
                    <th style="width: 180px; text-align: right;">
                        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
                            <span>Price:</span>
                            <select id="rmBalancePriceType" onchange="refreshRMInventoryBalance()" style="padding: 2px 6px; border-radius: 4px; border: 1px solid #000; font-size: 0.8rem; font-weight: bold; background: #fff; color: #000;">
                                <option value="last">Last Purchase</option>
                                <option value="avg">Average</option>
                                <option value="max">Maximum</option>
                                <option value="min">Minimum</option>
                            </select>
                        </div>
                    </th>
                    <th style="width: 160px; text-align: right; padding-right: 1.5rem;">Total Value</th>
                </tr>
            </thead>
            <tbody id="rmBalanceTable">
                <!-- Data populated via JS -->
            </tbody>
        </table>
    </div>
</div>

<style>
.rm-balance .data-table {
    border: 1px solid #000 !important;
    border-collapse: collapse !important;
}
.rm-balance .data-table th,
.rm-balance .data-table td {
    border: 1px solid #000 !important;
}
</style>
