<div class="store-item-records">
    <div class="card" style="background: white; padding: 2rem; border-radius: 12px; border: 1px solid var(--gray-200); box-shadow: var(--shadow-sm);">
        
        <div class="search-container" style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; background: var(--gray-50); padding: 1rem; border-radius: 8px; border: 1px solid #000;">
            <select id="storeItemsMainCatFilter" class="store-control" style="flex: 1; height: 32px; border-radius: 4px; border: 1px solid #000; font-size: 0.8rem; padding: 0 0.5rem;" onchange="populateStoreItemsSubCatFilter(); refreshStoreItems()">
                <option value="">All Main Categories</option>
            </select>
            <select id="storeItemsSubCatFilter" class="store-control" style="flex: 1; height: 32px; border-radius: 4px; border: 1px solid #000; font-size: 0.8rem; padding: 0 0.5rem;" onchange="refreshStoreItems()">
                <option value="">All Sub Categories</option>
            </select>
            <div style="flex: 1; position: relative;">
                <i class="fas fa-search" style="position: absolute; left: 0.6rem; top: 50%; transform: translateY(-50%); color: var(--gray-400); font-size: 0.8rem;"></i>
                <input type="text" id="storeItemsSearch" class="store-control" placeholder="Search name or code..." style="padding-left: 1.8rem; height: 32px; border-radius: 4px; border: 1px solid #000; font-size: 0.8rem; width: 100%;" oninput="refreshStoreItems()">
            </div>
            <button class="btn btn-primary" onclick="refreshStoreItems()" style="height: 32px; border-radius: 4px; padding: 0 1rem; font-weight: 600; font-size: 0.8rem; line-height: 1;">
                <i class="fas fa-sync-alt"></i>
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
