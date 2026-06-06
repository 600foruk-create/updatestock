<div id="stockList" class="tab-content">
                    <div class="search-filter-bar no-print" style="flex-wrap: wrap; gap: 0.5rem; align-items: flex-end; margin-bottom: 0.5rem;">
                        <div class="form-group" style="flex: 1; min-width: 120px; margin-bottom: 0;">
                            <label style="font-size: 0.85rem; margin-bottom: 2px;">Search Item</label>
                            <input type="text" id="stockSearch" class="form-control" style="padding: 0.1rem 0.4rem; font-size: 0.85rem; height: 28px;" placeholder="Search..." oninput="refreshStockList()">
                        </div>
                        <div class="form-group" style="flex: 1; min-width: 120px; margin-bottom: 0;">
                            <label style="font-size: 0.85rem; margin-bottom: 2px;">Group Filter</label>
                            <select id="stockGroupFilter" class="form-control" style="padding: 0.1rem 0.4rem; font-size: 0.85rem; height: 28px;" onchange="refreshStockList()">
                                <option value="">All Groups</option>
                                <!-- Auto-filled -->
                            </select>
                        </div>
                        <div class="form-group" style="flex: 1; min-width: 100px; margin-bottom: 0;">
                            <label style="font-size: 0.85rem; margin-bottom: 2px;">Length (ft/m)</label>
                            <select id="stockLengthFilter" class="form-control" style="padding: 0.1rem 0.4rem; font-size: 0.85rem; height: 28px;" onchange="refreshStockList()">
                                <option value="">All Lengths</option>
                            </select>
                        </div>
                        <div class="form-group" style="flex: 1; min-width: 120px; margin-bottom: 0;">
                            <label style="font-size: 0.85rem; margin-bottom: 2px;">Order Status</label>
                            <select id="stockOrderFilter" class="form-control" style="padding: 0.1rem 0.4rem; font-size: 0.85rem; height: 28px;" onchange="refreshStockList()">
                                <option value="">All Items</option>
                                <option value="with_orders">Active Orders</option>
                            </select>
                        </div>
                        <div class="form-group" style="flex: 1; min-width: 120px; margin-bottom: 0;">
                            <label style="font-size: 0.85rem; margin-bottom: 2px;">Zero Stock</label>
                            <select id="stockZeroFilter" class="form-control" style="padding: 0.1rem 0.4rem; font-size: 0.85rem; height: 28px;" onchange="refreshStockList()">
                                <option value="all">Show All</option>
                                <option value="hide_zero">Hide 0 Stock</option>
                                <option value="only_zero">Only 0 Stock</option>
                            </select>
                        </div>
                        
                        <div class="form-group" style="flex: 1; min-width: 120px; margin-bottom: 0;">
                            <label style="font-size: 0.85rem; margin-bottom: 2px;">From Date</label>
                            <input type="date" id="stockDateFrom" class="form-control" style="padding: 0.1rem 0.4rem; font-size: 0.85rem; height: 28px;" onchange="refreshStockList()">
                        </div>
                        <div class="form-group" style="flex: 1; min-width: 120px; margin-bottom: 0;">
                            <label style="font-size: 0.85rem; margin-bottom: 2px;">To Date</label>
                            <input type="date" id="stockDateTo" class="form-control" style="padding: 0.1rem 0.4rem; font-size: 0.85rem; height: 28px;" onchange="refreshStockList()">
                        </div>
                        <div class="btn-group" style="margin-left: auto; flex: 0 1 auto; justify-content: flex-end;">
                            <button class="btn btn-print" style="padding: 0.1rem 0.4rem; font-size: 0.85rem; height: 28px;" onclick="printStockList()">🖨️ Print</button>
                            <button class="btn btn-secondary" style="padding: 0.1rem 0.4rem; font-size: 0.85rem; height: 28px;" onclick="clearStockFilters()">🧹 Clear</button>
                        </div>
                    </div>
                    
                    <div id="printableStock">
                        <div class="print-header">
                            <div class="print-header-top">
                                <div id="printLogo" class="printLogo">📦</div>
                                <h1 id="printCompanyName">StockFlow</h1>
                            </div>
                            <p>Complete Stock Report - <span id="printDate"></span></p>
                        </div>
                        
                        <h3 class="no-print" style="color:var(--sky-600); margin-top: 0; margin-bottom: 0.5rem;">📦 Complete Stock</h3>
                        <div class="stock-list-grid" id="stockListCards"></div>
                    </div>
                </div>
