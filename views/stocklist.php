<div id="stockList" class="tab-content">
                    <div class="search-filter-bar no-print">
                        <div class="form-group">
                            <label>Search Brand or Size (e.g., 2m)</label>
                            <input type="text" id="stockSearch" class="form-control" placeholder="Search Brand / Size..." oninput="refreshStockList()">
                        </div>
                        <div class="form-group">
                            <label>From Date</label>
                            <input type="date" id="stockDateFrom" class="form-control" onchange="refreshStockList()">
                        </div>
                        <div class="form-group">
                            <label>To Date</label>
                            <input type="date" id="stockDateTo" class="form-control" onchange="refreshStockList()">
                        </div>
                        <div class="btn-group">
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