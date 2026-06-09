<div class="rm-transactions">

    
    <div class="form-card" style="margin-bottom: 1rem; background: transparent; box-shadow: none; border: none; padding: 0;">
        <div class="form-group" style="margin-bottom: 0.5rem;">
            <label style="font-weight: 700; color: var(--gray-700); margin-bottom: 0.2rem; font-size: 0.9rem; display: block;">Purchase Date</label>
            <input type="date" id="rmInDate" class="form-control" style="height: 40px; border-radius: 8px; border: 2px solid #000; width: 250px; background: white;">
        </div>

        <div id="rmInRowsHeader" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1.5fr 40px; gap: 1rem; margin-bottom: 0.2rem; padding: 0 1rem; color: var(--gray-600); font-size: 0.85rem; font-weight: 700;">
            <div>Raw Material</div>
            <div>Quantity</div>
            <div>Unit</div>
            <div>Price/Unit</div>
            <div>Notes</div>
            <div></div>
        </div>
        <div id="rmInRows" style="display: flex; flex-direction: column; gap: 0.8rem; margin-bottom: 1rem;"></div>
        
        <button class="btn btn-info" style="margin-bottom: 1rem;" onclick="addRMInRow()">➕ Add Material</button>
        
        <div style="margin-top: 1rem; padding-bottom: 0;">
            <button id="rmInSaveBtn" class="btn btn-primary" style="background: var(--sky-600); color: white !important; display: inline-block; width: auto; padding: 0.4rem 2rem; font-size: 0.9rem; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 0 var(--sky-800); cursor: pointer; transition: 0.2s;" onclick="saveRMTransaction('IN')">Save</button>
        </div>
    </div>

    <div style="background: white; overflow-x: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 1rem;">
            <h3 style="margin: 0; color: var(--gray-800);">Recent Purchase History</h3>
            <div style="display: flex; gap: 0.8rem; align-items: center; flex-wrap: wrap;">
                <select id="rmInMonthFilter" onchange="refreshRMInHistoryTable()" style="padding: 0.5rem; border: 1px solid var(--gray-300); border-radius: 8px; min-width: 120px; font-size: 0.85rem;">
                    <option value="">All Months</option>
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                </select>
                <select id="rmInYearFilter" onchange="refreshRMInHistoryTable()" style="padding: 0.5rem; border: 1px solid var(--gray-300); border-radius: 8px; min-width: 90px; font-size: 0.85rem;">
                    <option value="">All Years</option>
                </select>
                <button class="btn" style="background: #27ae60; color: white; display: flex; align-items: center; gap: 5px;" onclick="exportRMInToExcel()">
                    <span>📊 Export Excel</span>
                </button>
                <button class="btn btn-danger" style="display: flex; align-items: center; gap: 5px;" onclick="deleteAllRMInHistory()">
                    <span>🗑️ Delete All</span>
                </button>
            </div>
        </div>
        <style>
            #rmInHistoryTable {
                border: 1px solid #000 !important;
                border-collapse: collapse !important;
            }
            #rmInHistoryTable th,
            #rmInHistoryTable td {
                border: 1px solid #000 !important;
            }
            #rmInHistoryTable th {
                padding: 0.4rem 0.5rem !important;
                font-size: 0.85rem !important;
            }
            #rmInHistoryTable td {
                padding: 0.3rem 0.5rem !important;
                font-size: 0.85rem !important;
            }
        </style>
        <table class="data-table" id="rmInHistoryTable" style="margin-bottom: 0;">
            <thead style="background: var(--gray-50);">
                <tr>
                    <th>Date</th>
                    <th>Material</th>
                    <th>Quantity Received</th>
                    <th>Unit Price</th>
                    <th>Total Amount</th>
                    <th>Notes</th>
                    <th style="width: 80px; text-align: center;">Action</th>
                </tr>
            </thead>
            <tbody id="rmInTable"></tbody>
        </table>
    </div>
</div>


