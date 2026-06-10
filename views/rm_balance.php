<div class="rm-balance">
    <!-- Filter Bar -->
    <div class="search-container" style="display: flex; gap: 0.5rem; margin-bottom: 1rem; background: var(--gray-50); padding: 1rem; border-radius: 8px; border: 1px solid #000;">
        <select id="rmBalanceMainFilter" class="form-control" onchange="refreshRMInventoryBalance()" style="flex: 1; height: 32px; border-radius: 4px; border: 1px solid #000; font-size: 0.8rem; padding: 0 0.5rem;"></select>
        
        <select id="rmBalanceSubFilter" class="form-control" onchange="refreshRMInventoryBalance()" style="flex: 1; height: 32px; border-radius: 4px; border: 1px solid #000; font-size: 0.8rem; padding: 0 0.5rem;"></select>
        
        <div style="flex: 1; position: relative;">
            <i class="fas fa-search" style="position: absolute; left: 0.6rem; top: 50%; transform: translateY(-50%); color: var(--gray-400); font-size: 0.8rem;"></i>
            <input type="text" id="rmBalanceSearch" class="form-control" placeholder="Search name or code..." onkeyup="refreshRMInventoryBalance()" style="padding-left: 1.8rem; height: 32px; border-radius: 4px; border: 1px solid #000; font-size: 0.8rem; width: 100%;">
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
