<div id="dataEntry" class="tab-content">
                    <div class="action-buttons" style="display: flex; gap: 0.8rem; align-items: center; flex-wrap: wrap;">
                        <button class="btn btn-success" onclick="showProductionEntry()">🏭 Production (IN)</button>
                        <button class="btn btn-primary" onclick="showSaleEntry()">🛒 Sale (OUT)</button>
                        <button class="btn" onclick="showAdjustmentEntry()">⚖️ Adjustment (+/-)</button>
                        <button class="btn" style="background: #eab308; color: white;" onclick="showProductionReportModal()">📊 Production Report</button>
                        <!-- Simplified Last Production Tracker -->
                        <div id="dailyProdMetric" style="background: white; padding: 0.4rem 1rem; border-radius: 10px; border: 2px solid #eab308; display: flex; align-items: center; gap: 0.8rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-left: auto;">
                            <div style="font-size: 1.2rem;">🏗️</div>
                            <div>
                                <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 2px;">
                                    <span style="font-size: 0.65rem; font-weight: 800; color: var(--gray-500); text-transform: uppercase;">Last Recorded:</span>
                                    <span id="lastProdDateLabel" style="font-size: 0.75rem; color: #92400e; font-weight: 700; background: #fffbeb; padding: 1px 6px; border-radius: 4px;">--</span>
                                </div>
                                <div id="dailyProductionWeight" style="font-size: 1.1rem; font-weight: 800; color: #eab308; line-height: 1.2;">0.0 KG</div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="productionForm" style="display: none; background: var(--gray-100); padding: 1.5rem; border-radius: 1rem; margin-bottom: 1rem;">
                        <h3 style="color: var(--sky-600); margin-bottom:1rem;">🏭 Production Entry</h3>
                        <div class="form-group">
                            <label>Date</label>
                            <input type="datetime-local" id="prodDate" class="form-control">
                        </div>
                        <div id="productionRows"></div>
                        <button class="btn btn-info" onclick="addProductionRow()">➕ Add Item</button>
                        <br><br>
                        <button id="saveProdBtn" class="btn btn-primary" onclick="saveProduction()">Save Production</button>
                        <button class="btn btn-danger" onclick="hideAllForms()">Cancel</button>
                    </div>
                    
                    <div id="saleForm" style="display: none; background: var(--gray-100); padding: 1.5rem; border-radius: 1rem; margin-bottom: 1rem;">
                        <h3 style="color: var(--sky-600); margin-bottom:1rem;">🛒 Sale Entry</h3>
                        <div class="form-group">
                            <label>Date</label>
                            <input type="datetime-local" id="saleDate" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Customer</label>
                            <div id="saleCustomerWrapper"></div>
                        </div>
                        <div class="form-group">
                            <label>From Completed Order</label>
                            <select id="saleOrderSelect" class="form-control" onchange="loadCompletedOrderForSale()">
                                <option value="">-- Select Completed Order --</option>
                            </select>
                        </div>
                        <div id="saleRows"></div>
                        <button class="btn btn-info" onclick="addSaleRow()">➕ Add Manual Item</button>
                        <br><br>
                        <button class="btn btn-primary" onclick="saveSale()">Complete Sale</button>
                        <button class="btn btn-danger" onclick="hideAllForms()">Cancel</button>
                    </div>
                    
                    <div id="adjustmentForm" style="display: none; background: var(--gray-100); padding: 1.5rem; border-radius: 1rem; margin-bottom: 1rem;">
                        <h3 style="color: var(--sky-600); margin-bottom:1rem;">⚖️ Adjustment</h3>
                        <div class="form-group">
                            <label>Date</label>
                            <input type="datetime-local" id="adjDate" class="form-control">
                        </div>
                        <div id="adjustmentRows"></div>
                        <button class="btn btn-info" onclick="addAdjustmentRow()">➕ Add Item</button>
                        <br><br>
                        <button class="btn" onclick="saveAdjustment()">Save Adjustment</button>
                        <button class="btn btn-danger" onclick="hideAllForms()">Cancel</button>
                    </div>
                    
                    <h3 style="margin:1rem 0; color:var(--sky-600);">Recent Transactions</h3>
                    <div class="filter-bar" style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; background: var(--gray-50); padding: 1rem; border-radius: 12px; border: 1px solid var(--gray-200); align-items: center;">
                        <div style="display: flex; gap: 0.5rem; flex: 2; min-width: 300px; flex-wrap: wrap;">
                            <input type="text" id="transSearch" placeholder="Search Brand/Product..." onkeyup="refreshTransactions()" style="flex: 1; min-width: 150px; padding: 0.5rem; border: 1px solid var(--gray-300); border-radius: 8px; font-size: 0.9rem;">
                            <div style="display: flex; align-items: center; gap: 0.3rem; min-width: 220px;">
                                <input type="date" id="transDateFrom" onchange="refreshTransactions()" style="padding: 0.5rem; border: 1px solid var(--gray-300); border-radius: 8px; flex: 1; font-size: 0.85rem;">
                                <span style="color: var(--gray-500); font-size: 0.8rem;">to</span>
                                <input type="date" id="transDateTo" onchange="refreshTransactions()" style="padding: 0.5rem; border: 1px solid var(--gray-300); border-radius: 8px; flex: 1; font-size: 0.85rem;">
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; justify-content: flex-end;">
                            <button class="btn" onclick="exportTransactions('excel')" style="white-space: nowrap; background: #16a34a; color: white; padding: 0.5rem 0.8rem; font-size: 0.85rem; border-radius: 8px; display: flex; align-items: center; gap: 0.3rem;">📥 Excel</button>
                            <button class="btn" onclick="exportTransactions('pdf')" style="white-space: nowrap; background: #ea580c; color: white; padding: 0.5rem 0.8rem; font-size: 0.85rem; border-radius: 8px; display: flex; align-items: center; gap: 0.3rem;">📄 PDF</button>
                            <button class="btn btn-info" onclick="resetTransactionFilters()" style="white-space: nowrap; padding: 0.5rem 0.8rem; font-size: 0.85rem; border-radius: 8px; display: flex; align-items: center; gap: 0.3rem;">🔄 Reset</button>
                            <button class="btn btn-danger" onclick="clearAllTransactions()" style="white-space: nowrap; padding: 0.5rem 0.8rem; font-size: 0.85rem; border-radius: 8px; display: flex; align-items: center; gap: 0.3rem;">🗑️ Delete All</button>
                        </div>
                    </div>
                    <div style="max-height: 400px; overflow-y: auto; border: 1px solid var(--gray-200); border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); background: white;">
                        <table class="data-table" id="transTable" style="margin-bottom: 0;">
                            <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 10; box-shadow: 0 1px 0 #e2e8f0;">
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Brand</th>
                                    <th>Product</th>
                                    <th>Qty</th>
                                    <th>Customer</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="transactionsBody"></tbody>
                        </table>
                    </div>
                </div>
<!-- Production Report Modal -->
<div id="prodReportModal" class="modal" style="display: none;">
    <div class="modal-content" style="max-width: 1000px; width: 95%;">
        <div class="modal-header">
            <h2 id="prodReportTitle">Production Report</h2>
            <span class="close" onclick="closeProdReportModal()">&times;</span>
        </div>
        <div class="modal-body">
            <div class="filter-bar no-print" style="margin-bottom: 1.5rem; background: var(--gray-50); padding: 1rem; border-radius: 12px; display: flex; gap: 0.8rem; flex-wrap: wrap; align-items: flex-end; border: 1px solid var(--gray-200);">
                <div class="form-group" style="margin-bottom: 0; flex: 1; min-width: 120px;">
                    <label style="display: block; margin-bottom: 0.2rem; font-size: 0.8rem; color: var(--gray-600);">From Date</label>
                    <input type="date" id="prodReportFrom" class="form-control" style="padding: 0.4rem; font-size: 0.85rem;">
                </div>
                <div class="form-group" style="margin-bottom: 0; flex: 1; min-width: 120px;">
                    <label style="display: block; margin-bottom: 0.2rem; font-size: 0.8rem; color: var(--gray-600);">To Date</label>
                    <input type="date" id="prodReportTo" class="form-control" style="padding: 0.4rem; font-size: 0.85rem;">
                </div>
                <div class="form-group" style="margin-bottom: 0; flex: 1; min-width: 180px;">
                    <label style="display: block; margin-bottom: 0.2rem; font-size: 0.8rem; color: var(--gray-600);">Select Brand</label>
                    <select id="prodReportBrandSelect" class="form-control" style="padding: 0.4rem; font-size: 0.85rem;">
                        <option value="all">-- All Brands --</option>
                    </select>
                </div>
                <button class="btn btn-primary" onclick="generateProductionReport()" style="padding: 0.4rem 1.2rem; font-size: 0.85rem;">🔍 Search</button>
                <div style="display: flex; gap: 0.4rem;">
                    <button class="btn" onclick="window.print()" style="background: #64748b; color: white; display: flex; align-items: center; gap: 0.3rem; padding: 0.4rem 1rem; font-size: 0.85rem;">🖨️ Print</button>
                    <button class="btn btn-success" onclick="exportProductionReport('excel')" style="display: flex; align-items: center; gap: 0.3rem; padding: 0.4rem 1rem; font-size: 0.85rem;">📥 Excel</button>
                </div>
            </div>

            <div id="prodReportPrintContainer" style="background: white; padding: 2rem; border: 1px solid var(--gray-200); border-radius: 8px; min-height: 400px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);">
                <div id="prodReportContent">
                    <div style="text-align: center; color: var(--gray-400); padding: 7rem 0;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">📊</div>
                        <p>Select filters and click Search to generate the production report.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
