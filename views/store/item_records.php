<div class="store-item-records">
    <div class="card" style="background: white; padding: 2rem; border-radius: 12px; border: 1px solid var(--gray-200); box-shadow: var(--shadow-sm);">
        
        <div class="search-container" style="display: flex; gap: 1rem; margin-bottom: 1.5rem; background: var(--gray-50); padding: 1.2rem; border-radius: 12px;">
            <div style="flex: 1; position: relative;">
                <i class="fas fa-search" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--gray-400);"></i>
                <input type="text" id="storeItemsSearch" class="form-control" placeholder="Quick search by name or item code..." style="padding-left: 2.5rem; height: 45px; border-radius: 10px;">
            </div>
            <button class="btn btn-primary" onclick="refreshStoreItemRecords()" style="height: 45px; border-radius: 10px; padding: 0 1.5rem; font-weight: 600;">
                <i class="fas fa-sync-alt"></i> Refresh
            </button>
        </div>

        <div id="storeItemRecordsContainer" style="overflow-x: auto;">
            <div style="text-align: center; padding: 3rem; color: var(--gray-400);">
                <i class="fas fa-spinner fa-spin fa-2x"></i>
                <p style="margin-top: 1rem;">Fetching item records...</p>
            </div>
        </div>
    </div>
</div>
