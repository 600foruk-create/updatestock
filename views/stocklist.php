<div id="stockList" class="tab-content">
                    <div class="search-filter-bar no-print" style="flex-wrap: wrap; gap: 1rem;">
                        <div class="form-group" style="flex: 1; min-width: 200px;">
                            <label>Brand / Size</label>
                            <input type="text" id="stockSearch" class="form-control" placeholder="Search Brand / Size..." oninput="refreshStockList()">
                        </div>
                        <div class="form-group" style="flex: 1; min-width: 120px;">
                            <label>Length (ft/m)</label>
                            <input type="text" id="stockLengthFilter" class="form-control" placeholder="e.g. 13" oninput="refreshStockList()">
                        </div>
                        <div class="form-group" style="flex: 1; min-width: 120px;">
                            <label>Available</label>
                            <input type="number" id="stockAvailableFilter" class="form-control" placeholder="Search exact..." oninput="refreshStockList()">
                        </div>
                        <div class="form-group" style="flex: 1; min-width: 120px;">
                            <label>In Order</label>
                            <input type="number" id="stockOrderFilter" class="form-control" placeholder="Search exact..." oninput="refreshStockList()">
                        </div>
                        <div class="form-group" style="flex: 1; min-width: 150px;">
                            <label>Zero Stock View</label>
                            <select id="stockZeroFilter" class="form-control" onchange="refreshStockList()">
                                <option value="all">Show All Items</option>
                                <option value="hide_zero">Hide 0 Stock</option>
                                <option value="only_zero">Show Only 0 Stock</option>
                            </select>
                        </div>
                        
                        <!-- Keep date filters but maybe push them to a new line if needed -->
                        <div style="flex-basis: 100%; height: 0;"></div> <!-- Line break for flex -->
                        
                        <div class="form-group">
                            <label>From Date</label>
                            <input type="date" id="stockDateFrom" class="form-control" onchange="refreshStockList()">
                        </div>
                        <div class="form-group">
                            <label>To Date</label>
                            <input type="date" id="stockDateTo" class="form-control" onchange="refreshStockList()">
                        </div>
                        <div class="btn-group" style="margin-top: 22px;">
                            <button class="btn btn-print" onclick="printStockList()">🖨️ Print</button>
                            <button class="btn btn-secondary" onclick="clearStockFilters()">🧹 Clear</button>
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
                        
                        <h3 class="no-print" style="color:var(--sky-600); margin-bottom:1rem;">📦 Complete Stock</h3>
                        <div class="stock-list-grid" id="stockListCards"></div>
                    </div>
                </div>