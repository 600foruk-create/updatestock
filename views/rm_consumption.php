<div class="rm-consumption">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <div>
            <!-- Header removed as requested -->
        </div>
        <div style="display: flex; gap: 0.8rem;">
            <button class="btn btn-primary" onclick="saveRMConsumptionEntry()" style="background: var(--sky-600); border: none; font-weight: 600; padding: 0.8rem 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                📥 Save Daily Entry
            </button>
            <button class="btn" onclick="clearRMConsumptionHistory()" style="background: #ef4444; color: white; border: none; font-weight: 600; padding: 0.8rem 1.5rem;">
                🗑️ Clear History
            </button>
        </div>
    </div>

    <!-- WIP Summary Dashboard -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2.5rem;">
        <!-- Card 1: FG Production -->
        <div style="background: white; padding: 1.5rem; border-radius: 16px; border: 1px solid var(--gray-200); box-shadow: var(--shadow-sm); display: flex; align-items: center; justify-content: center; text-align: center;">
            <div>
                <span style="font-size: 0.8rem; font-weight: 800; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.8px; display: block; margin-bottom: 8px;">Latest FG Production</span>
                <div id="wipFGWeight" style="font-size: 2.2rem; font-weight: 900; color: var(--gray-800);">0.0 KG</div>
            </div>
        </div>

        <!-- Card 2: RM Issuance -->
        <div style="background: white; padding: 1.5rem; border-radius: 16px; border: 1px solid var(--gray-200); box-shadow: var(--shadow-sm); display: flex; align-items: center; justify-content: center; text-align: center;">
            <div>
                <span style="font-size: 0.8rem; font-weight: 800; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.8px; display: block; margin-bottom: 8px;">Latest RM Issuance</span>
                <div id="wipRMWeight" style="font-size: 1.8rem; font-weight: 900; color: var(--gray-800); line-height: 1;">0.0 KG</div>
                <div id="wipRMValue" style="font-size: 1rem; font-weight: 700; color: var(--success); margin-top: 5px;">Rs. 0</div>
            </div>
        </div>

        <!-- Card 3: WIP GAP -->
        <div style="background: white; padding: 1.5rem; border-radius: 16px; border: 1px solid var(--gray-200); box-shadow: var(--shadow-sm); display: flex; align-items: center; justify-content: center; text-align: center;">
            <div>
                <span style="font-size: 0.8rem; font-weight: 800; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.8px; display: block; margin-bottom: 8px;">Work In Process</span>
                <div id="wipGapTotal" style="font-size: 2.2rem; font-weight: 900; color: var(--gray-800);">0.0 KG</div>
            </div>
        </div>
    </div>

    <!-- Daily Records History List -->
    <div style="background: white; border-radius: 12px; border: 1px solid var(--gray-200); box-shadow: var(--shadow-sm); overflow: hidden;">
        <div style="padding: 1.2rem; background: var(--gray-50); border-bottom: 1px solid var(--gray-200); display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem;">
            <h3 style="margin: 0; font-size: 1.1rem; color: var(--gray-700);">📋 Consumption History Log</h3>
            
            <!-- Total WIP Summary Card -->
            <div id="totalWIPCard" onclick="toggleWIPBreakdown()" style="cursor: pointer; background: white; padding: 0.5rem 1.2rem; border-radius: 12px; border: 1.5px solid var(--sky-200); box-shadow: var(--shadow-sm); display: flex; align-items: center; gap: 0.8rem; transition: all 0.2s ease; margin-left: auto;">
                <div style="padding: 0.5rem; background: var(--sky-50); border-radius: 10px; color: var(--sky-600); font-weight: 900; font-size: 0.8rem; line-height: 1;">WIP</div>
                <div>
                    <span style="font-size: 0.65rem; color: var(--gray-400); font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: block;">Total Work In Process</span>
                    <div id="grandTotalWIP" style="font-size: 1.1rem; font-weight: 900; color: var(--gray-800); line-height: 1.2;">0.0 KG</div>
                </div>
                <div id="wipCardArrow" style="color: var(--gray-400); font-size: 0.8rem; transition: transform 0.3s ease;">▼</div>
            </div>

            <div style="display: flex; gap: 0.8rem; align-items: center;">
                <select id="rmHistoryMonthFilter" class="form-control" onchange="refreshRMConsumptionHistory()" style="width: 140px; padding: 0.4rem; font-size: 0.9rem; border: 1px solid var(--gray-300); border-radius: 8px;">
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
                <select id="rmHistoryYearFilter" class="form-control" onchange="refreshRMConsumptionHistory()" style="width: 110px; padding: 0.4rem; font-size: 0.9rem; border: 1px solid var(--gray-300); border-radius: 8px;">
                    <option value="">All Years</option>
                </select>
            </div>
        </div>

        <!-- Monthly Breakdown Panel (Hidden Initially) -->
        <div id="wipBreakdownPanel" style="display: none; padding: 1.5rem; background: #fdfdfd; border-bottom: 2px solid var(--gray-100); max-height: 400px; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem;">
                <h4 style="margin: 0; font-size: 0.85rem; color: var(--gray-500); text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">📅 Monthly Breakdown</h4>
                <button onclick="toggleWIPBreakdown()" style="background: none; border: none; font-size: 0.8rem; color: var(--gray-400); cursor: pointer; text-decoration: underline;">Close Panel</button>
            </div>
            <div id="wipMonthlyList" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
                <!-- Monthly summaries injected by JS -->
            </div>
        </div>

        <!-- Scrollable Table Container -->
        <div style="overflow-x: auto; max-height: 700px; overflow-y: auto; position: relative;">
            <table class="data-table" style="margin-bottom: 0; min-width: 1300px; border-collapse: separate; border-spacing: 0;">
                <thead style="position: sticky; top: 0; z-index: 20; background: var(--sky-600); color: white; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                    <tr>
                        <th style="padding: 1rem 0.8rem; border-bottom: 2px solid var(--sky-700);">Date & Time</th>
                        <th style="padding: 1rem 0.8rem; text-align: left; border-bottom: 2px solid var(--sky-700);">FG Produced (KG)</th>
                        <th style="padding: 1rem 0.8rem; text-align: left; border-bottom: 2px solid var(--sky-700);">RM Issued (KG)</th>
                        <th style="padding: 1rem 0.8rem; text-align: left; border-bottom: 2px solid var(--sky-700);">Issuance Value (Rs.)</th>
                        <th style="padding: 1rem 0.8rem; text-align: left; border-bottom: 2px solid var(--sky-700);">Other Expenses (Rs.)</th>
                        <th style="padding: 1rem 0.8rem; text-align: left; border-bottom: 2px solid var(--sky-700);">Grand Total (Rs.)</th>
                        <th style="padding: 1rem 0.8rem; text-align: left; border-bottom: 2px solid var(--sky-700);">In Process (KG)</th>
                        <th style="padding: 1rem 0.8rem; text-align: left; border-bottom: 2px solid var(--sky-700);">Gap / WIP (Net)</th>
                        <th style="padding: 1rem 0.8rem; text-align: center; border-bottom: 2px solid var(--sky-700);">Actions</th>
                    </tr>
                </thead>
                <tbody id="rmConsumptionHistoryTable" class="striped-rows">
                    <!-- Data will be injected here -->
                </tbody>
                <tfoot id="rmConsumptionHistoryFooter" style="background: var(--sky-600); color: white; font-weight: bold; position: sticky; bottom: 0; z-index: 10; box-shadow: 0 -1px 2px rgba(0,0,0,0.2);">
                    <!-- Totals will be injected here -->
                </tfoot>
            </table>
        </div>
    </div>

    <div class="table-container" style="display: none;">
        <table class="data-table">
            <thead>
                <tr>
                    <th>FG Item Produced</th>
                    <th>Expected RM Usage</th>
                    <th>Actual RM Usage</th>
                    <th>Variance (%)</th>
                </tr>
            </thead>
            <tbody id="rmConsumptionTable"></tbody>
        </table>
    </div>
</div>

<style>
/* Header/Footer specific to this report are handled by inline styles above */
/* Row colors are now handled globally in style.css */
</style>
